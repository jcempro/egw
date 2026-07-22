// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { isRecord } from "./egw-common.mjs";

export async function loadProviders(root) {
  const config = JSON.parse(await readFile(path.join(root, "config", "egw-sources.json"), "utf8"));
  if (!isRecord(config) || !Array.isArray(config.providers) || !isRecord(config.limits)) throw new Error("Configuração de fontes inválida");
  config.provider_signature = JSON.stringify(config.providers.map((provider) => [provider.id, provider.kind, provider.domains, provider.media_hosts, provider.seed_urls, provider.templates, provider.formats]));
  return config;
}

export function hostOf(value) {
  try { return new URL(value).hostname.toLowerCase(); } catch { return null; }
}

export function providerAllows(provider, value) {
  const host = hostOf(value);
  const allowed = [...(provider.domains || []), ...(provider.media_hosts || []), ...(provider.cdn_hosts || [])].map((item) => String(item).toLowerCase());
  return Boolean(host && allowed.some((domain) => host === domain || host.endsWith(`.${domain}`)));
}

export function providerForSource(providers, source) {
  const declared = String(source.provider || "").toLowerCase();
  const originHost = hostOf(source.origin_url) || hostOf(source.url);
  return providers.find((provider) => provider.enabled && (provider.id === declared || providerAllows(provider, source.origin_url || source.url || "") || [...(provider.domains || []), ...(provider.media_hosts || [])].some((domain) => declared === domain || originHost === domain || originHost?.endsWith(`.${domain}`)))) || null;
}

function whiteEstatePage(origin) {
  if (!origin) return null;
  const file = path.posix.basename(new URL(origin).pathname);
  const match = /^(?:[a-z]{2,3}(?:-[a-z0-9]+)?)_([A-Za-z0-9]+)\.(?:pdf|epub)$/i.exec(file);
  if (!match) return null;
  const code = match[1].toLowerCase();
  return `https://whiteestate.org/books/ebooks/${code}/${code}.htm`;
}

function normalizeText(value) {
  try { value = decodeURIComponent(String(value || "")); } catch { value = String(value || ""); }
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\.[a-z0-9]+$/i, "").replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function titleWords(title) {
  return normalizeText(title).split(" ").filter(Boolean);
}

function titleSlug(title, separator = "-") {
  return titleWords(title).join(separator);
}

function titleSlugTitleCase(title) {
  const lower = new Set(["a", "as", "e", "o", "os", "de", "da", "das", "do", "dos"]);
  return titleWords(title).map((word, index) => index > 0 && lower.has(word) ? word : word.charAt(0).toUpperCase() + word.slice(1)).join("-");
}

function acronym(title) {
  const ignored = new Set(["a", "an", "and", "as", "da", "das", "de", "do", "dos", "e", "o", "os", "the", "volume", "vol"]);
  return titleWords(title).filter((word) => !ignored.has(word)).map((word) => /^\d+$/.test(word) ? word : word[0]).join("");
}

function languageCode(metadata) {
  const language = String(metadata?.book?.language || "").toLowerCase();
  if (language.startsWith("pt")) return "pt";
  if (language.startsWith("en")) return "en";
  return language.split("-")[0] || "";
}

function candidateAliases({ metadata, source }) {
  const values = new Set();
  for (const value of [source?.id, source?.alias, source?.short_code, metadata?.short_token, acronym(metadata?.book?.title || "")]) {
    const normalized = normalizeText(value).replace(/\s+/g, "");
    if (normalized && normalized.length <= 12) values.add(normalized);
  }
  for (const value of source?.aliases || metadata?.book?.aliases || []) {
    const normalized = normalizeText(value).replace(/\s+/g, "");
    if (normalized) values.add(normalized);
  }
  return [...values];
}

function fillTemplate(template, { metadata, source, alias, format }) {
  const title = metadata?.book?.title || "";
  const lang = languageCode(metadata);
  return template
    .replaceAll("{lang}", encodeURIComponent(lang))
    .replaceAll("{format}", encodeURIComponent(format))
    .replaceAll("{alias}", encodeURIComponent(alias))
    .replaceAll("{aliasUpper}", encodeURIComponent(alias.toUpperCase()))
    .replaceAll("{aliasLower}", encodeURIComponent(alias.toLowerCase()))
    .replaceAll("{titleEncoded}", encodeURIComponent(title))
    .replaceAll("{titleSlug}", encodeURIComponent(titleSlug(title)))
    .replaceAll("{titleSlugTitleCase}", encodeURIComponent(titleSlugTitleCase(title)))
    .replaceAll("{sourceId}", encodeURIComponent(String(source?.id || "")));
}

async function discoverFromSeeds(provider, limits, fetchImpl) {
  const result = [];
  for (const seed of provider.seed_urls || []) {
    if (!providerAllows(provider, seed)) continue;
    const page = await fetchImpl(seed, { redirect: "follow", signal: AbortSignal.timeout(limits.request_timeout_ms) });
    if (!page.ok || !providerAllows(provider, page.url)) continue;
    const html = await page.text();
    result.push(...[...html.matchAll(/href=["']([^"']+\.(?:pdf|epub|zip|7z)(?:\?[^"']*)?)["']/gi)].map((item) => new URL(item[1], page.url).href).filter((url) => providerAllows(provider, url)));
  }
  return result;
}

export function normalizeComparableText(value) {
  return normalizeText(value);
}

export async function discoverProviderCandidates({ provider, originUrl, limits, fetchImpl = fetch, metadata = null, source = null }) {
  if (provider.kind === "origin-only") return originUrl && providerAllows(provider, originUrl) ? [originUrl] : [];
  if (provider.kind === "catalog-pattern" || provider.kind === "catalog-only") {
    const candidates = [];
    for (const seedCandidate of await discoverFromSeeds(provider, limits, fetchImpl)) candidates.push(seedCandidate);
    for (const alias of candidateAliases({ metadata, source })) {
      for (const format of provider.formats || ["pdf", "epub"]) {
        for (const template of provider.templates || []) candidates.push(fillTemplate(template, { metadata, source, alias, format }));
      }
    }
    return [...new Set(candidates.filter((url) => providerAllows(provider, url)))];
  }
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
