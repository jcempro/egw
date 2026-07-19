// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { isRecord } from "./egw-common.mjs";

export async function loadProviders(root) {
  const config = JSON.parse(await readFile(path.join(root, "config", "egw-sources.json"), "utf8"));
  if (!isRecord(config) || !Array.isArray(config.providers) || !isRecord(config.limits)) throw new Error("Configuração de fontes inválida");
  return config;
}

export function hostOf(value) {
  try { return new URL(value).hostname.toLowerCase(); } catch { return null; }
}

export function providerAllows(provider, value) {
  const host = hostOf(value);
  return Boolean(host && provider.domains.some((domain) => host === domain || host.endsWith(`.${domain}`)));
}

export function providerForSource(providers, source) {
  const declared = String(source.provider || "").toLowerCase();
  const originHost = hostOf(source.origin_url);
  return providers.find((provider) => provider.enabled && (provider.id === declared || provider.domains.some((domain) => declared === domain || originHost === domain || originHost?.endsWith(`.${domain}`)))) || null;
}

function whiteEstatePage(origin) {
  if (!origin) return null;
  const file = path.posix.basename(new URL(origin).pathname);
  const match = /^(?:[a-z]{2,3}(?:-[a-z0-9]+)?)_([A-Za-z0-9]+)\.(?:pdf|epub)$/i.exec(file);
  if (!match) return null;
  const code = match[1].toLowerCase();
  return `https://whiteestate.org/books/ebooks/${code}/${code}.htm`;
}

export async function discoverProviderCandidates({ provider, originUrl, limits, fetchImpl = fetch }) {
  if (provider.kind === "origin-only") return originUrl && providerAllows(provider, originUrl) ? [originUrl] : [];
  if (provider.kind !== "white-estate-ebook" || !originUrl) return [];
  const pageUrl = whiteEstatePage(originUrl);
  if (!pageUrl || !providerAllows(provider, pageUrl)) return [];
  const page = await fetchImpl(pageUrl, { redirect: "follow", signal: AbortSignal.timeout(limits.request_timeout_ms) });
  if (!page.ok || !providerAllows(provider, page.url)) return [];
  const html = await page.text();
  return [...new Set([...html.matchAll(/href=["']([^"']+\.(?:pdf|epub|zip|7z)(?:\?[^"']*)?)["']/gi)]
    .map((item) => new URL(item[1], page.url).href)
    .filter((url) => providerAllows(provider, url)))];
}
