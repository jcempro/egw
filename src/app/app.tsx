// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

type Child = Node | string | number | null | undefined | false;
type Hashes = { sha1: string; sha256: string; sha512: string };
type Asset = { id: string; format: string; url: string; size: number; source_hashes: Hashes; origin_url: string | null };
type Source = { id: string; title: string; url: string; type: string; format: string; provider: string; asset_id: string | null; hashes: Hashes | null };
type Metadata = { schema_version: 5; book: { id: string; title: string; contributors: Array<{ name: string; role: string }>; edition: Record<string, unknown>; language: string; primary_category: string; tags: string[] }; short_token: string; global_hashes: Array<{ artifact_id: string; format: string } & Hashes>; assets: Asset[]; sources: Source[] };

export {};
declare global { namespace JSX { interface IntrinsicElements { [element: string]: Record<string, unknown>; } } }

const Fragment = Symbol("Fragment");
function h(tag: string | symbol, props: Record<string, unknown> | null, ...children: Child[]): Node {
  if (tag === Fragment) { const fragment = document.createDocumentFragment(); children.flat().forEach((child) => append(fragment, child)); return fragment; }
  const node = document.createElement(tag as string);
  for (const [key, value] of Object.entries(props || {})) {
    if (key === "className") node.className = String(value);
    else if (value !== false && value !== null && value !== undefined) node.setAttribute(key, String(value));
  }
  children.flat().forEach((child) => append(node, child));
  return node;
}
function append(parent: Node, child: Child): void { if (child !== null && child !== undefined && child !== false) parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child))); }
function required(id: string): HTMLElement { const node = document.getElementById(id); if (!node) throw new Error(`Elemento obrigatório ausente: ${id}`); return node; }

const landing = required("landing-view");
const bookView = required("book-view");
const notFound = required("not-found-view");
const live = required("live-region");
const form = required("lookup-form") as HTMLFormElement;
const input = required("book-id") as HTMLInputElement;
let searchAbort: AbortController | null = null;
let searchIndex: Array<[string, string]> | null = null;

function rootUrl(relative: string): string { return new URL(relative.replace(/^\/+/, ""), `${location.origin}/`).href; }
function setView(view: "landing" | "book" | "notFound"): void { landing.hidden = view !== "landing"; bookView.hidden = view !== "book"; notFound.hidden = view !== "notFound"; }
function announce(message: string): void { live.textContent = ""; requestAnimationFrame(() => { live.textContent = message; }); }
function validHashes(value: unknown): value is Hashes {
  if (!value || typeof value !== "object") return false;
  const hashes = value as Record<string, unknown>;
  return /^[a-f0-9]{40}$/.test(String(hashes.sha1 || "")) && /^[a-f0-9]{64}$/.test(String(hashes.sha256 || "")) && /^[a-f0-9]{128}$/.test(String(hashes.sha512 || ""));
}
function validMetadata(value: unknown): value is Metadata {
  if (!value || typeof value !== "object") return false;
  const data = value as Metadata;
  return Object.keys(data).sort().join(",") === "assets,book,global_hashes,schema_version,short_token,sources" && data.schema_version === 5 && Boolean(data.book?.id && data.book?.title && data.book?.language && data.book?.primary_category) && Array.isArray(data.global_hashes) && data.global_hashes.length > 0 && data.global_hashes.every(validHashes) && Array.isArray(data.assets) && data.assets.length > 0 && data.assets.every((asset) => /^\.\/[a-z0-9][a-z0-9.-]*$/i.test(asset.url) && validHashes(asset.source_hashes)) && Array.isArray(data.sources);
}
function segment(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
function metadataPath(data: Metadata): string {
  const words = segment(data.book.title).split("-").filter(Boolean); const remainder = words.length > 2 ? words.slice(2).join("-") : segment(data.book.id);
  return `/d/${segment(data.book.language)}/${segment(data.book.primary_category)}/${words[0] || segment(data.book.id)}/${words[1] || remainder}/${remainder}/metadata.json`;
}
function formatBytes(value: number): string { const divisor = value >= 1_000_000 ? 1_000_000 : 1_000; return `${(value / divisor).toFixed(1)} ${divisor === 1_000_000 ? "MB" : "kB"}`; }
function copyButton(value: string, label: string): HTMLButtonElement {
  const button = <button type="button" className="icon-button" aria-label={label}>Copiar</button> as HTMLButtonElement;
  button.addEventListener("click", async () => { await navigator.clipboard.writeText(value); announce("Hash copiado."); });
  return button;
}
function renderBook(data: Metadata, metadataUrl: string): void {
  const base = new URL("./", metadataUrl);
  const cover = data.assets.find((asset) => asset.id === "cover");
  const packageAsset = data.assets.find((asset) => asset.id === "package");
  const authors = data.book.contributors.filter((person) => person.role === "author").map((person) => person.name).join(", ") || "Autoria editorial não informada";
  const globalRows = data.global_hashes.map((hash) => <article className="panel"><p className="eyebrow">Hash Global {hash.format.toUpperCase()}</p>{(["sha1", "sha256", "sha512"] as const).map((algorithm) => <p className="hash-row"><code className="hash">{algorithm.toUpperCase()}: {hash[algorithm]}</code>{copyButton(hash[algorithm], `Copiar ${algorithm}`)}</p>)}</article>);
  const sourceRows = data.sources.map((source, index) => {
    const asset = data.assets.find((candidate) => candidate.id === source.asset_id);
    const href = asset ? new URL(asset.url, base).href : source.url;
    return <tr><td>{index + 1}</td><td>{source.title}</td><td className="url-cell"><a href={href} target="_blank" rel="noopener noreferrer">{href}</a></td><td>{source.format.toUpperCase()}</td><td>{source.provider}</td><td>{asset ? formatBytes(asset.size) : "Externa"}</td></tr>;
  });
  bookView.replaceChildren(
    <section className="book-hero"><div className="cover">{cover ? <img src={new URL(cover.url, base).href} alt={`Capa de ${data.book.title}`} /> : null}</div><div><p className="eyebrow">Referência bibliográfica</p><h1 id="book-view-title">{data.book.title}</h1><p className="book-author">{authors}</p><p>Idioma: {data.book.language} · Categoria: {data.book.primary_category}</p></div></section>,
    <section className="section"><div className="metric-grid"><article className="metric"><strong>{data.sources.length}</strong><span>Fontes</span></article><article className="metric"><strong>{data.assets.length}</strong><span>Assets</span></article><article className="metric"><strong>{data.short_token}</strong><span>URL curta</span></article></div></section>,
    <section className="section"><div className="section-heading"><div><p className="eyebrow">Integridade</p><h2>Hashes dos artefatos originais</h2></div></div><div className="metric-grid">{globalRows}</div></section>,
    <section className="section"><div className="section-heading"><div><p className="eyebrow">Fontes</p><h2>Assets e proveniência</h2></div><div className="table-actions">{packageAsset ? <a className="button" href={new URL(packageAsset.url, base).href}>Baixar pacote</a> : null}<a className="button button-secondary" href={metadataUrl}>metadata.json</a></div></div><div className="source-table-wrap"><table><thead><tr><th>#</th><th>Fonte</th><th>URL</th><th>Formato</th><th>Provedor</th><th>Tamanho</th></tr></thead><tbody>{sourceRows}</tbody></table></div></section>
  );
  setView("book"); document.title = `${data.book.title} — Índice de Fontes`;
}
function canonicalMetadataFromPath(): string | null {
  const decoded = decodeURIComponent(location.pathname);
  if (!/^\/d\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\/?$/.test(decoded)) return null;
  return rootUrl(`${decoded.replace(/^\/+|\/+$/g, "")}/metadata.json`);
}
async function routeFromMap(mapName: "short" | "legacy", key: string): Promise<string | null> {
  const response = await fetch(rootUrl(`d/_index/${mapName}.json`), { credentials: "same-origin" });
  if (!response.ok) return null;
  const routes = await response.json() as Record<string, string>; const route = routes[key];
  return typeof route === "string" && /^d\/[a-z0-9/-]+\/$/.test(route) ? rootUrl(`${route}metadata.json`) : null;
}
async function resolveMetadataUrl(): Promise<string | null> {
  const canonical = canonicalMetadataFromPath(); if (canonical) return canonical;
  const short = /^\/_\/([A-Za-z0-9_-]+)\/?$/.exec(location.pathname); if (short) return routeFromMap("short", short[1]);
  const legacy = location.pathname.replace(/^\/+|\/+$/g, "") + "/";
  if (/^data\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+\/$/.test(legacy)) return routeFromMap("legacy", legacy);
  return null;
}
async function loadRoute(): Promise<void> {
  try {
    const metadataUrl = await resolveMetadataUrl();
    if (!metadataUrl) { setView(location.pathname === "/" || /\/(?:index|404)\.html$/.test(location.pathname) ? "landing" : "notFound"); return; }
    const response = await fetch(metadataUrl, { credentials: "same-origin", redirect: "error" });
    if (!response.ok || !(response.headers.get("content-type") || "").includes("application/json")) throw new Error("Metadado indisponível");
    const data: unknown = await response.json(); if (!validMetadata(data)) throw new Error("Metadado schema 5 inválido");
    if (new URL(metadataUrl).pathname !== metadataPath(data)) throw new Error("Rota canônica diverge do metadado");
    renderBook(data, metadataUrl);
  } catch (error) { /* FIX-BUG: rota inválida termina no 404 real sem sondagem aproximada. */ console.error(error); setView("notFound"); }
}
async function ensureSearchIndex(signal: AbortSignal): Promise<Array<[string, string]>> {
  if (searchIndex) return searchIndex;
  const response = await fetch(rootUrl("d/_index/search.json"), { signal, credentials: "same-origin" }); const data: unknown = await response.json();
  if (!Array.isArray(data) || !data.every((item) => Array.isArray(item) && item.length === 2 && item.every((value) => typeof value === "string"))) throw new Error("Índice de busca inválido");
  searchIndex = data as Array<[string, string]>; return searchIndex;
}
function normalizeSearch(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase(); }
async function searchTitle(): Promise<void> {
  searchAbort?.abort(); searchAbort = new AbortController(); const query = normalizeSearch(input.value.trim()); if (!query) return;
  try { const index = await ensureSearchIndex(searchAbort.signal); const result = index.find(([title]) => normalizeSearch(title).includes(query)); if (!result) { input.setCustomValidity("Livro não encontrado"); input.reportValidity(); return; } input.setCustomValidity(""); location.assign(rootUrl(`_/${encodeURIComponent(result[1])}`)); }
  catch (error) { if ((error as Error).name !== "AbortError") announce("A busca não pôde ser carregada."); }
}
form.addEventListener("submit", (event) => { event.preventDefault(); void searchTitle(); });
input.addEventListener("focus", () => { const controller = new AbortController(); void ensureSearchIndex(controller.signal).catch(() => undefined); }, { once: true });
void loadRoute();
