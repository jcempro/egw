import path from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import { json, writeAtomic } from "./egw-common.mjs";
import { findEquivalentCandidates, loadProviders } from "./egw-providers.mjs";

export async function runMaintenance({ root, timeoutMs = null, bookIds = null } = {}) {
  const statePath = path.join(root, ".egw-state", "maintenance.json"); const reportPath = path.join(root, "build", "egw-maintenance-report.json"); const started = Date.now();
  let state; try { state = JSON.parse(await readFile(statePath, "utf8")); } catch { state = { schema_version: 1, day: "", cursor: 0, uses: {} }; }
  const providers = await loadProviders(root); const day = new Date().toISOString().slice(0, 10); if (state.day !== day) { state.day = day; state.uses = {}; }
  const catalog = JSON.parse(await readFile(path.join(root, "data", "catalog.json"), "utf8")).books.filter((book) => !bookIds || bookIds.includes(book.book_id)); const report = { schema_version: 1, started_at: new Date().toISOString(), checked: 0, added: 0, divergent_or_unavailable: 0, timeout: false };
  for (let index = state.cursor; index < catalog.length; index += 1) {
    if (timeoutMs && Date.now() - started >= timeoutMs) { state.cursor = index; report.timeout = true; break; }
    if (providers.providers.filter((item) => item.enabled).every((provider) => (state.uses[provider.id] || 0) >= (provider.daily_limit || providers.limits.default_daily_limit))) { state.cursor = index; break; }
    const book = catalog[index]; const metadataPath = path.join(root, "data", "books", book.book_id, "metadata.json"); const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    for (const source of metadata.sources.filter((item) => item.hash && ["pdf", "epub"].includes(item.id))) for (const provider of providers.providers.filter((item) => item.enabled)) {
      const used = state.uses[provider.id] || 0; if (used >= (provider.daily_limit || providers.limits.default_daily_limit)) continue; state.uses[provider.id] = used + 1; report.checked += 1;
      const origin = source.origin_url || (source.url.startsWith("http") ? source.url : null); let candidates = [];
      try { candidates = await findEquivalentCandidates({ provider, originUrl: origin, format: source.id, expectedSha512: source.hash.value, limits: providers.limits }); } catch { report.divergent_or_unavailable += 1; }
      for (const url of candidates) if (!metadata.sources.some((item) => item.url === url)) { metadata.schema_version = 3; metadata.sources.push({ id: `${provider.id}-${source.id}`.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), title: `${source.title} — ${provider.id}`, url, origin_url: url, provider: provider.id, type: "equivalent-source", hash: source.hash }); report.added += 1; }
    }
    state.cursor = index + 1; await writeAtomic(statePath, json(state)); await writeAtomic(metadataPath, json(metadata));
  }
  if (state.cursor >= catalog.length) state.cursor = 0; await mkdir(path.dirname(reportPath), { recursive: true }); await writeAtomic(statePath, json(state)); await writeAtomic(reportPath, json(report));
  return { ...report, pending: catalog.length - state.cursor };
}
