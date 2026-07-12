import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isRecord } from "./egw-common.mjs";

export async function loadProviders(root) {
  const config = JSON.parse(await readFile(path.join(root, "config", "egw-sources.json"), "utf8"));
  if (!isRecord(config) || !Array.isArray(config.providers) || !isRecord(config.limits)) throw new Error("Configuração de fontes inválida");
  return config;
}
function allowed(url, provider) { try { const host = new URL(url).hostname.toLowerCase(); return provider.domains.some((domain) => host === domain || host.endsWith(`.${domain}`)); } catch { return false; } }
async function responseBytes(url, provider, limits) {
  const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(limits.request_timeout_ms) });
  if (!response.ok || !allowed(response.url, provider)) return null;
  const length = Number(response.headers.get("content-length") || 0); if (length && length > limits.max_candidate_bytes) return null;
  const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.byteLength > limits.max_candidate_bytes) return null;
  return bytes;
}
function whiteEstatePage(origin) {
  const file = path.posix.basename(new URL(origin).pathname); const match = /^(?:[a-z]{2,3}(?:-[a-z0-9]+)?)_([A-Za-z0-9]+)\.(?:pdf|epub)$/i.exec(file); if (!match) return null;
  const code = match[1].toLowerCase(); return `https://whiteestate.org/books/ebooks/${code}/${code}.htm`;
}
export async function findEquivalentCandidates({ provider, originUrl, format, expectedSha512, limits }) {
  if (provider.kind !== "white-estate-ebook" || !originUrl) return [];
  const pageUrl = whiteEstatePage(originUrl); if (!pageUrl || !allowed(pageUrl, provider)) return [];
  const page = await fetch(pageUrl, { redirect: "follow", signal: AbortSignal.timeout(limits.request_timeout_ms) }); if (!page.ok || !allowed(page.url, provider)) return [];
  const html = await page.text(); const matches = [...html.matchAll(/href=["']([^"']+\.(?:pdf|epub))["']/gi)].map((item) => new URL(item[1], page.url).href).filter((url) => path.posix.extname(new URL(url).pathname).toLowerCase() === `.${format}` && allowed(url, provider));
  const unique = [...new Set(matches)]; const accepted = [];
  for (const url of unique) { const bytes = await responseBytes(url, provider, limits); if (!bytes) continue; const sha512 = createHash("sha512").update(bytes).digest("hex"); if (sha512 === expectedSha512) accepted.push(url); }
  return accepted;
}
