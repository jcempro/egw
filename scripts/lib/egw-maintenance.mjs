// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { hashFile, json, writeAtomic } from "./egw-common.mjs";
import { discoverProviderCandidates, hostOf, loadProviders, normalizeComparableText, providerAllows, providerForSource } from "./egw-providers.mjs";

const execute = promisify(execFile);
const FORMATS = new Set(["pdf", "epub"]);
const ARCHIVES = new Set(["zip", "7z"]);
const CACHE_SCHEMA_VERSION = 3;

function sevenZip() {
  if (process.env.SEVEN_ZIP_BIN) return process.env.SEVEN_ZIP_BIN;
  return process.platform === "win32" ? "C:\\Program Files\\7-Zip\\7z.exe" : "7z";
}

function matrix(bytes) {
  return {
    sha1: createHash("sha1").update(bytes).digest("hex"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sha512: createHash("sha512").update(bytes).digest("hex"),
  };
}

function formatOfUrl(url) {
  try { return path.posix.extname(new URL(url).pathname).slice(1).toLowerCase(); } catch { return ""; }
}

function providerHosts(provider) {
  return [...(provider.domains || []), ...(provider.media_hosts || []), ...(provider.cdn_hosts || [])].map((value) => String(value).toLowerCase());
}

async function responseBytes(url, provider, limits, fetchImpl) {
  const response = await fetchImpl(url, { redirect: "follow", signal: AbortSignal.timeout(limits.request_timeout_ms) });
  if (!response.ok || !providerAllows(provider, response.url)) return null;
  const length = Number(response.headers.get("content-length") || 0);
  if (length && length > limits.max_candidate_bytes) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  return bytes.byteLength <= limits.max_candidate_bytes ? { bytes, finalUrl: response.url } : null;
}

async function listFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) files.push(target);
    }
  }
  await visit(root);
  return files;
}

async function productsFromArchive(bytes, extension, limits) {
  const temporary = await mkdtemp(path.join(tmpdir(), "egw-equivalent-"));
  const archive = path.join(temporary, `candidate.${extension}`);
  const output = path.join(temporary, "content");
  try {
    await writeFile(archive, bytes); await mkdir(output);
    const listing = await execute(sevenZip(), ["l", "-slt", archive], { maxBuffer: 1024 * 1024 });
    const paths = [...listing.stdout.matchAll(/^Path = (.+)$/gm)].map((match) => match[1].trim()).slice(1);
    const unpacked = [...listing.stdout.matchAll(/^Size = (\d+)$/gm)].reduce((total, match) => total + Number(match[1]), 0);
    const maxEntries = limits.max_archive_entries || 32;
    if (paths.length > maxEntries || unpacked > limits.max_candidate_bytes || /^(?:Symbolic Link|Hard Link) = /m.test(listing.stdout) || paths.some((entry) => path.isAbsolute(entry) || entry.split(/[\\/]+/).includes(".."))) return [];
    await execute(sevenZip(), ["x", "-y", `-o${output}`, archive], { maxBuffer: 1024 * 1024 });
    const products = [];
    for (const target of await listFiles(output)) {
      const format = path.extname(target).slice(1).toLowerCase();
      if (!FORMATS.has(format)) continue;
      const bytesFound = await readFile(target);
      if (bytesFound.byteLength <= limits.max_candidate_bytes) products.push({ format, hashes: matrix(bytesFound) });
    }
    return products;
  } finally { await rm(temporary, { recursive: true, force: true }); }
}

export async function verifyCandidate({ url, provider, expected, limits, fetchImpl = fetch }) {
  const downloaded = await responseBytes(url, provider, limits, fetchImpl);
  if (!downloaded) return [];
  const extension = formatOfUrl(downloaded.finalUrl) || formatOfUrl(url);
  const products = FORMATS.has(extension)
    ? [{ format: extension, hashes: matrix(downloaded.bytes) }]
    : ARCHIVES.has(extension) ? await productsFromArchive(downloaded.bytes, extension, limits) : [];
  return products.filter((product) => expected[product.format] && Object.entries(expected[product.format]).every(([algorithm, value]) => product.hashes[algorithm] === value));
}

async function expectedMatrices(root, metadata) {
  const result = {};
  for (const format of FORMATS) {
    const target = path.join(root, "assets", "books", metadata.book.id, `source.${format}`);
    try { result[format] = await hashFile(target); } catch { /* formato ausente */ }
  }
  return result;
}

function sourceHost(source, publicHost) {
  return hostOf(source.url) || publicHost;
}

function selected(value, filter) {
  if (!filter) return true;
  return value === filter;
}

function sourceId(provider, format, sources) {
  const base = `${provider.id}-${format}`.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let id = base; let index = 2;
  while (sources.some((source) => source.id === id)) id = `${base}-${index++}`;
  return id;
}

export async function runMaintenance({ root, stateRoot = root, reportRoot = stateRoot, timeoutMs = null, bookId = null, metadataPath = null, sourceId: onlySource = null, providerId = null, fetchImpl = fetch } = {}) {
  if ((onlySource || providerId) && !bookId && !metadataPath) throw new Error("--source/--provider exige --book ou --metadata");
  const statePath = path.join(stateRoot, ".egw-state", "maintenance.json");
  const reportPath = path.join(reportRoot, "build", "egw-maintenance-report.json");
  const started = Date.now();
  const configuration = await loadProviders(root);
  let state; try { state = JSON.parse(await readFile(statePath, "utf8")); } catch { state = { schema_version: CACHE_SCHEMA_VERSION, day: "", cursor: 0, uses: {}, provider_signature: configuration.provider_signature, completed_sources: {} }; }
  if (state.schema_version !== CACHE_SCHEMA_VERSION || state.provider_signature !== configuration.provider_signature) state = { schema_version: CACHE_SCHEMA_VERSION, day: "", cursor: 0, uses: {}, provider_signature: configuration.provider_signature, completed_sources: {} };
  const enabled = configuration.providers.filter((provider) => provider.enabled);
  const day = new Date().toISOString().slice(0, 10);
  if (state.day !== day) { state.day = day; state.uses = {}; state.cursor = 0; }
  const build = JSON.parse(await readFile(path.join(root, "config", "build.json"), "utf8"));
  const publicHost = new URL(build.public_origin).hostname;
  const catalog = JSON.parse(await readFile(path.join(root, "data", "catalog.json"), "utf8")).books;
  let books = catalog;
  if (metadataPath) {
    const absolute = path.resolve(metadataPath); const metadata = JSON.parse(await readFile(absolute, "utf8"));
    books = [{ book_id: metadata.book.id, metadata_path: absolute }];
  } else if (bookId) books = catalog.filter((book) => book.book_id === bookId);
  if (!books.length) throw new Error("Livro ou metadado não encontrado");
  if (providerId && !enabled.some((provider) => provider.id === providerId || providerHosts(provider).includes(providerId))) throw new Error("Provedor não configurado ou desabilitado");
  const scoped = Boolean(bookId || metadataPath);
  const startIndex = scoped ? 0 : Math.min(state.cursor || 0, books.length);
  const report = { schema_version: 3, started_at: new Date().toISOString(), mode: metadataPath ? "metadata" : scoped ? "book" : "all", checked: 0, added: 0, divergent_or_unavailable: 0, skipped: 0, timeout: false, additions: [], candidates: [], duplicates: [], rejections: [], ambiguities: [], errors: [], processed_sources: [], cache: { schema_version: CACHE_SCHEMA_VERSION, reused: 0, invalidated_by_signature: false }, reason: "running" };
  booksLoop: for (let index = startIndex; index < books.length; index += 1) {
    if (timeoutMs && Date.now() - started >= timeoutMs) { state.cursor = scoped ? 0 : index; state.interrupted = { reason: "timeout", book_id: books[index].book_id, source_id: onlySource, provider_id: providerId }; report.timeout = true; break; }
    const book = books[index];
    const target = book.metadata_path || path.join(root, "data", "books", book.book_id, "metadata.json");
    const metadata = JSON.parse(await readFile(target, "utf8"));
    if (onlySource && !metadata.sources.some((source) => source.id === onlySource)) throw new Error("Fonte não encontrada no metadado selecionado");
    const expected = await expectedMatrices(root, metadata);
    const represented = new Set(metadata.sources.map((source) => sourceHost(source, publicHost)));
    let changed = false;
    for (const source of metadata.sources.filter((item) => selected(item.id, onlySource))) {
      const provider = providerForSource(enabled, source);
      if (!provider || (providerId && provider.id !== providerId && !providerHosts(provider).includes(providerId))) { report.skipped += 1; report.rejections.push({ book_id: metadata.book.id, source_id: source.id, reason: "provider-unavailable" }); continue; }
      if (providerHosts(provider).some((domain) => represented.has(domain) || [...represented].some((host) => host.endsWith(`.${domain}`)))) { report.skipped += 1; report.duplicates.push({ book_id: metadata.book.id, provider: provider.id, reason: "host-already-represented" }); continue; }
      const used = state.uses[provider.id] || 0; const limit = provider.daily_limit || configuration.limits.default_daily_limit;
      if (used >= limit) { report.skipped += 1; report.rejections.push({ book_id: metadata.book.id, provider: provider.id, reason: "daily-limit" }); continue; }
      state.uses[provider.id] = used + 1; report.checked += 1;
      state.cursor = scoped ? 0 : index;
      state.interrupted = { reason: "in-progress", book_id: metadata.book.id, source_id: source.id, provider_id: provider.id };
      await writeAtomic(statePath, json(state));
      let candidates = [];
      try {
        candidates = await discoverProviderCandidates({ provider, originUrl: source.origin_url || source.url, limits: configuration.limits, fetchImpl, metadata, source });
        report.processed_sources.push({ book_id: metadata.book.id, source_id: source.id, provider: provider.id, hosts: providerHosts(provider), candidates: candidates.length });
        if (!candidates.length) report.rejections.push({ book_id: metadata.book.id, source_id: source.id, provider: provider.id, reason: "no-candidates" });
      } catch (error) { report.divergent_or_unavailable += 1; report.errors.push({ book_id: metadata.book.id, source_id: source.id, provider: provider.id, error: error.message }); }
      for (const candidate of candidates) {
        if (timeoutMs && Date.now() - started >= timeoutMs) {
          state.interrupted.reason = "timeout"; report.timeout = true; await writeAtomic(statePath, json(state));
          break booksLoop;
        }
        report.candidates.push({ book_id: metadata.book.id, provider: provider.id, url: candidate, normalized: normalizeComparableText(candidate) });
        if (metadata.sources.some((item) => item.url === candidate)) { report.duplicates.push({ book_id: metadata.book.id, provider: provider.id, url: candidate, reason: "url-already-present" }); continue; }
        let products = [];
        try { products = await verifyCandidate({ url: candidate, provider, expected, limits: configuration.limits, fetchImpl }); } catch (error) { report.divergent_or_unavailable += 1; report.errors.push({ book_id: metadata.book.id, provider: provider.id, url: candidate, error: error.message }); continue; }
        if (!products.length) report.rejections.push({ book_id: metadata.book.id, provider: provider.id, url: candidate, reason: "hash-mismatch-or-unavailable" });
        if (products.length > 1) report.ambiguities.push({ book_id: metadata.book.id, provider: provider.id, url: candidate, formats: products.map((product) => product.format) });
        for (const product of products) {
          if (metadata.sources.some((item) => item.url === candidate && item.format === product.format)) { report.duplicates.push({ book_id: metadata.book.id, provider: provider.id, url: candidate, format: product.format, reason: "variant-already-present" }); continue; }
          metadata.sources.push({ id: sourceId(provider, product.format, metadata.sources), title: provider.domains[0], url: candidate, origin_url: candidate, provider: provider.id, type: "equivalent-source", format: product.format, hashes: product.hashes });
          represented.add(hostOf(candidate)); changed = true; report.added += 1; report.additions.push({ book_id: metadata.book.id, provider: provider.id, format: product.format, url: candidate });
        }
        if (changed) await writeAtomic(target, json(metadata));
      }
    }
    if (changed) await writeAtomic(target, json(metadata));
    if (!scoped) state.cursor = index + 1;
    state.interrupted = null; await writeAtomic(statePath, json(state));
  }
  if (!report.timeout && !scoped && state.cursor >= books.length) state.cursor = 0;
  report.finished_at = new Date().toISOString();
  report.reason = report.timeout ? "timeout" : report.errors.length ? "partial-failure" : report.added ? "updated" : report.checked ? "no-news" : "no-coverage";
  await mkdir(path.dirname(reportPath), { recursive: true }); await writeAtomic(statePath, json(state)); await writeAtomic(reportPath, json(report));
  return { ...report, pending: report.timeout ? books.length - state.cursor : 0 };
}
