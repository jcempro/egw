// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

const URL_PATTERN = /https?:\/\/[^\s<>"'`)\]}]+/giu;
const MAX_BODY_BYTES = 128 * 1024;
const MAX_PUBLICATIONS = 80;
const MAX_URLS = 240;
const PRIVATE_HOSTS = new Set(["localhost", "metadata.google.internal"]);
const PUBLICATION_KEYS = new Set(["publication", "publications", "book", "books", "livro", "livros", "obra", "obras"]);
const TITLE_KEYS = new Set(["title", "name", "titulo", "título", "nome", "livro", "book", "obra"]);
const URL_KEYS = new Set(["url", "urls", "link", "links", "source", "sources", "fonte", "fontes"]);
const LANGUAGE_KEYS = new Set(["language", "lang", "idioma"]);
const FORMAT_KEYS = new Set(["format", "formato", "tipo"]);

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function normalizeKey(value) {
  return normalizeText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function titleNormalized(value) {
  return normalizeText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function extractUrls(value) {
  return [...String(value || "").matchAll(URL_PATTERN)].map((match) => match[0].replace(/[.,;:]+$/g, ""));
}

function formatOf(url) {
  try {
    const extension = /\.([a-z0-9]+)$/i.exec(new URL(url).pathname)?.[1]?.toLowerCase() || "";
    if (extension === "pdf" || extension === "epub") return extension;
    return extension ? "other" : "unknown";
  } catch { return "unknown"; }
}

function languageOf(url, text) {
  const haystack = `${url} ${text || ""}`.toLowerCase();
  const match = /(?:^|[^a-z])([a-z]{2}(?:-[a-z0-9]+)?)(?:[_/-]|[^a-z]|$)/i.exec(haystack);
  return match ? match[1].toLowerCase() : null;
}

function classifyUrl(original) {
  const normalized = normalizeText(original);
  const warnings = [];
  try {
    const parsed = new URL(normalized);
    if (!["http:", "https:"].includes(parsed.protocol)) warnings.push("protocolo-nao-permitido");
    if (parsed.username || parsed.password) warnings.push("credenciais-embutidas");
    const host = parsed.hostname.toLowerCase();
    if (PRIVATE_HOSTS.has(host) || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) || host === "::1" || host.startsWith("169.254.")) warnings.push("host-privado-ou-local");
    if (parsed.pathname.includes("..")) warnings.push("path-traversal");
    return { original, normalized: parsed.href, format: formatOf(parsed.href), language: languageOf(parsed.href), source: parsed.hostname, warnings };
  } catch {
    return { original, normalized, format: "unknown", language: null, source: null, warnings: ["url-invalida"] };
  }
}

function publication(title, urls = [], extras = {}) {
  return {
    titleOriginal: title ? normalizeText(title) : null,
    titleNormalized: title ? titleNormalized(title) : null,
    language: extras.language || null,
    format: extras.format || null,
    urls: urls.map((url) => classifyUrl(url)),
  };
}

function canonicalBase(originalText, issue = {}) {
  return {
    schema_version: 1,
    issue: {
      id: issue.id || null,
      number: issue.number || null,
      revision: issue.revision || null,
    },
    originalText,
    detectedFormat: "text",
    publications: [],
    unassignedUrls: [],
    ambiguities: [],
    recoveries: [],
    warnings: [],
    rejected: false,
    status: "empty",
  };
}

function attachWarnings(model) {
  for (const group of model.publications) {
    for (const url of group.urls) {
      for (const warning of url.warnings) model.warnings.push({ code: warning, url: url.original, title: group.titleOriginal });
    }
  }
  for (const url of model.unassignedUrls) {
    for (const warning of url.warnings) model.warnings.push({ code: warning, url: url.original, title: null });
  }
}

function finalize(model) {
  model.publications = model.publications.filter((item) => item.urls.length || item.titleOriginal);
  const totalUrls = model.publications.reduce((sum, item) => sum + item.urls.length, 0) + model.unassignedUrls.length;
  attachWarnings(model);
  const security = model.warnings.filter((item) => ["credenciais-embutidas", "host-privado-ou-local", "path-traversal", "protocolo-nao-permitido"].includes(item.code));
  if (!totalUrls) {
    model.rejected = true;
    model.status = "requer-correcao";
    model.ambiguities.push({ code: "sem-url-valida", message: "Nenhuma URL HTTP(S) foi identificada." });
  } else if (security.length) {
    model.rejected = true;
    model.status = "rejeitada-por-seguranca";
  } else if (model.publications.length > MAX_PUBLICATIONS || totalUrls > MAX_URLS) {
    model.rejected = true;
    model.status = "requer-correcao";
    model.warnings.push({ code: "payload-excessivo", publications: model.publications.length, urls: totalUrls });
  } else if (model.ambiguities.some((item) => item.material)) {
    model.rejected = model.publications.length === 0;
    model.status = model.publications.length ? "processada-parcialmente" : "ambigua";
  } else if (model.unassignedUrls.length) {
    model.status = model.publications.length ? "processada-parcialmente" : "requer-correcao";
    if (!model.publications.length) model.rejected = true;
  } else {
    model.status = model.recoveries.length ? "processada-com-recuperacao" : "processada";
  }
  return model;
}

function parseJsonLike(text, model) {
  const candidates = [text];
  const recovered = text.replace(/,\s*([}\]])/g, "$1");
  if (recovered !== text) candidates.push(recovered);
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (candidate !== text) model.recoveries.push({ code: "json-virgula-final-removida" });
      model.detectedFormat = "json";
      return parsed;
    } catch { /* tenta proxima camada */ }
  }
  return null;
}

function parseScalar(value) {
  const trimmed = normalizeText(value).replace(/^["']|["']$/g, "");
  const urls = extractUrls(trimmed);
  if (urls.length === 1 && urls[0] === trimmed) return urls[0];
  return trimmed;
}

function parseSimpleYaml(text, model) {
  if (!/^\s*[\w\u00C0-\u017F-]+\s*:/m.test(text) || /[&*]\w+/.test(text)) return null;
  const lines = text.split("\n");
  const root = {};
  let rootKey = null;
  let current = null;
  let currentListKey = null;
  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    const indent = raw.match(/^\s*/)[0].length;
    const line = raw.trim();
    if (indent === 0 && /^[-\w\u00C0-\u017F ]+:/.test(line)) {
      const [key, ...rest] = line.split(":");
      rootKey = key.trim();
      const value = rest.join(":").trim();
      root[rootKey] = value ? parseScalar(value) : [];
      current = null;
      currentListKey = null;
      continue;
    }
    if (line.startsWith("- ")) {
      const body = line.slice(2).trim();
      if (extractUrls(body).length && rootKey && Array.isArray(root[rootKey])) {
        root[rootKey].push(parseScalar(body));
      } else if (rootKey && Array.isArray(root[rootKey]) && body.includes(":")) {
        const [key, ...rest] = body.split(":");
        current = { [key.trim()]: parseScalar(rest.join(":").trim()) };
        root[rootKey].push(current);
        currentListKey = null;
      } else if (current && currentListKey) {
        current[currentListKey].push(parseScalar(body));
      } else if (rootKey && Array.isArray(root[rootKey])) {
        root[rootKey].push(parseScalar(body));
      }
      continue;
    }
    if (current && /^[-\w\u00C0-\u017F ]+:/.test(line)) {
      const [key, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      currentListKey = key.trim();
      current[currentListKey] = value ? parseScalar(value) : [];
    }
  }
  if (!Object.keys(root).length) return null;
  if (!Object.entries(root).some(([key, value]) => PUBLICATION_KEYS.has(normalizeKey(key)) && Array.isArray(value))) return null;
  model.detectedFormat = "yaml";
  return root;
}

function normalizeObjectInput(value, model) {
  const publicationEntry = !Array.isArray(value) && Object.entries(value).find(([key, entryValue]) => PUBLICATION_KEYS.has(normalizeKey(key)) && (Array.isArray(entryValue) || typeof entryValue === "object"));
  const root = Array.isArray(value) ? value : publicationEntry?.[1] || value;
  const items = Array.isArray(root) ? root : [root];
  for (const item of items) {
    if (typeof item === "string") {
      const urls = extractUrls(item);
      const title = normalizeText(item.replace(URL_PATTERN, "").replace(/[-:>]+/g, " "));
      if (urls.length) model.publications.push(publication(title || null, urls));
      continue;
    }
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    let title = null; let urls = []; let language = null; let format = null;
    for (const [key, valueFound] of Object.entries(item)) {
      const keyNorm = normalizeKey(key);
      if (TITLE_KEYS.has(keyNorm) && typeof valueFound === "string") title = valueFound;
      else if (URL_KEYS.has(keyNorm)) urls = Array.isArray(valueFound) ? valueFound.flatMap((part) => extractUrls(part)) : extractUrls(valueFound);
      else if (LANGUAGE_KEYS.has(keyNorm)) language = normalizeText(valueFound);
      else if (FORMAT_KEYS.has(keyNorm)) format = normalizeText(valueFound).toLowerCase();
    }
    if (!Array.isArray(Object.entries(item).find(([key]) => URL_KEYS.has(normalizeKey(key)))?.[1]) && urls.length > 1) model.recoveries.push({ code: "campo-url-escalar-convertido-em-lista", title });
    model.publications.push(publication(title, urls, { language, format }));
    if (title && !urls.length) model.ambiguities.push({ code: "titulo-sem-url", title, material: false });
  }
}

function parseMarkdownAndText(text, model) {
  const lines = text.split("\n");
  let currentTitle = null;
  let currentUrls = [];
  function flush() {
    if (currentTitle || currentUrls.length) model.publications.push(publication(currentTitle, currentUrls));
    currentTitle = null;
    currentUrls = [];
  }
  for (const raw of lines) {
    const line = normalizeText(raw.replace(/^>\s*/, "").replace(/^[-*]\s+/, ""));
    if (!line || /^```/.test(line) || /^#+\s/.test(line)) continue;
    const urls = extractUrls(line);
    if (/^https?:\/\//iu.test(line)) {
      if (!currentTitle && urls.length > 1) model.ambiguities.push({ code: "varias-urls-sem-titulo", urls, material: true });
      if (currentTitle) currentUrls.push(...urls);
      else model.unassignedUrls.push(...urls.map((url) => classifyUrl(url)));
      continue;
    }
    const keyMatch = /^([\w\u00C0-\u017F ]{2,24})\s*:\s*(.*)$/u.exec(line);
    const arrowMatch = /^(.{2,160}?)\s*(?:->|=>|-)\s*(https?:\/\/.+)$/u.exec(line);
    if (arrowMatch) {
      flush();
      model.publications.push(publication(arrowMatch[1], extractUrls(arrowMatch[2])));
      continue;
    }
    if (keyMatch) {
      const key = normalizeKey(keyMatch[1]);
      const rest = keyMatch[2];
      if (TITLE_KEYS.has(key) && !extractUrls(rest).length) {
        flush();
        currentTitle = rest;
        continue;
      }
      if (URL_KEYS.has(key)) {
        currentUrls.push(...extractUrls(rest));
        continue;
      }
      if (urls.length) {
        flush();
        model.publications.push(publication(keyMatch[1], urls));
        continue;
      }
      if (rest === "") {
        flush();
        currentTitle = keyMatch[1];
        continue;
      }
    }
    if (urls.length) {
      if (!currentTitle && urls.length > 1) model.ambiguities.push({ code: "varias-urls-sem-titulo", urls, material: true });
      if (currentTitle) currentUrls.push(...urls);
      else if (urls.length === 1) {
        const beforeUrl = normalizeText(line.slice(0, line.indexOf(urls[0])).replace(/\b(achei|encontrei|fonte|link|url|aqui|esta|está|segue)\b/giu, " ").replace(/[:;,-]+$/g, ""));
        if (beforeUrl) model.publications.push(publication(beforeUrl, urls));
        else model.unassignedUrls.push(...urls.map((url) => classifyUrl(url)));
      } else model.unassignedUrls.push(...urls.map((url) => classifyUrl(url)));
      continue;
    }
    if (currentTitle && currentUrls.length) flush();
    if (!currentTitle && model.unassignedUrls.length && line.length >= 2 && line.length <= 160) {
      model.publications.push(publication(line.replace(/[:;]+$/g, ""), model.unassignedUrls.map((url) => url.original)));
      model.unassignedUrls = [];
      model.recoveries.push({ code: "titulo-apos-url-associado", title: line });
      continue;
    }
    if (line.length >= 2 && line.length <= 160) currentTitle = line.replace(/[:;]+$/g, "");
  }
  flush();
}

export function parseIssueSourceIntake(input, options = {}) {
  const originalText = normalizeText(input);
  const model = canonicalBase(originalText, options.issue || {});
  if (Buffer.byteLength(originalText, "utf8") > MAX_BODY_BYTES) {
    model.rejected = true;
    model.status = "requer-correcao";
    model.warnings.push({ code: "payload-excessivo", bytes: Buffer.byteLength(originalText, "utf8") });
    return model;
  }
  const structured = parseJsonLike(originalText, model) || parseSimpleYaml(originalText, model);
  if (structured) normalizeObjectInput(structured, model);
  else parseMarkdownAndText(originalText, model);
  return finalize(model);
}

export function buildIntakeComment(model) {
  if (model.status === "processada" || model.status === "processada-com-recuperacao") {
    return `Agradecemos pelo envio das fontes.\n\nA solicitação foi interpretada com segurança para ${model.publications.length} publicação(ões) e ${model.publications.reduce((sum, item) => sum + item.urls.length, 0)} URL(s). As URLs seguirão para as validações normais de procedência, integridade e associação antes de qualquer inclusão.`;
  }
  if (model.status === "processada-parcialmente") {
    return `Agradecemos pelo envio das fontes.\n\nParte da solicitação foi interpretada com segurança, mas alguns itens ficaram sem associação inequívoca. As entradas seguras seguirão para validação; os itens ambíguos permanecerão sem inclusão automática até correção.`;
  }
  return "Agradecemos pelo tempo dedicado ao envio destas fontes.\n\nInfelizmente, não foi possível interpretar a solicitação com segurança suficiente para realizar a inclusão automática. A formatação ou a organização atual do conteúdo não permitiu identificar de forma inequívoca quais URLs correspondem a cada publicação.\n\nPor favor, edite ou reenvie a solicitação usando um dos formatos documentados no modelo da issue, preferencialmente indicando cada publicação seguida de sua URL ou lista de URLs.\n\nNenhuma fonte foi adicionada a partir desta solicitação para evitar associações incorretas.";
}

export function labelsForIntake(model) {
  const base = ["fonte: aguardando analise"];
  const mapped = {
    processada: "fonte: processada",
    "processada-com-recuperacao": "fonte: processada",
    "processada-parcialmente": "fonte: processada parcialmente",
    "requer-correcao": "fonte: requer correcao",
    ambigua: "fonte: ambigua",
    "rejeitada-por-seguranca": "fonte: rejeitada por seguranca",
  };
  return [...new Set([...base, mapped[model.status] || "fonte: requer correcao"])];
}
