#!/usr/bin/env node
// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { faCopy } from "@fortawesome/free-solid-svg-icons";
import { transform } from "esbuild";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const html = await readFile(path.join(DIST, "index.html"), "utf8");
const script = await readFile(path.join(DIST, "assets", "app.js"), "utf8");
const stylesheet = await readFile(path.join(DIST, "assets", "app.css"), "utf8");
const config = JSON.parse(await readFile(path.join(DIST, "d", "_index", "config.json"), "utf8"));
const short = JSON.parse(await readFile(path.join(DIST, "d", "_index", "short.json"), "utf8"));
const legacy = JSON.parse(await readFile(path.join(DIST, "d", "_index", "legacy.json"), "utf8"));
const [token, canonical] = Object.entries(short)[0];
const legacyPath = Object.entries(legacy).find(([, value]) => value === canonical)?.[0];
if (!legacyPath) throw new Error("Alias de teste ausente");
if (faCopy.icon[3] !== "f0c5") throw new Error("Provider de ícones não expõe o glifo Copy f0c5");
if (/prefers-color-scheme:\s*dark/.test(stylesheet) || !/color-scheme:\s*light/.test(stylesheet) || !/\.site-header\{[^}]*linear-gradient/.test(stylesheet) || !/\.site-footer\{[^}]*linear-gradient/.test(stylesheet)) throw new Error("Contrato de tema institucional claro divergente");
const providerSource = await readFile(path.join(ROOT, "src", "app", "icon-provider.ts"), "utf8");
const providerModule = await transform(providerSource, { loader: "ts", format: "esm", target: "es2020" });
const { renderIcon } = await import(`data:text/javascript;base64,${Buffer.from(providerModule.code).toString("base64")}`);
const providerDom = new JSDOM("<!doctype html><body></body>");
const faNode = renderIcon(faCopy, "⧉", providerDom.window.document); const fallbackNode = renderIcon(null, "⧉", providerDom.window.document); const waNode = providerDom.window.document.createElement("wa-icon"); const customNode = renderIcon(waNode, "?", providerDom.window.document); const functionNode = renderIcon(() => providerDom.window.document.createElement("i"), "?", providerDom.window.document);
if (faNode.namespaceURI !== "http://www.w3.org/2000/svg" || faNode.querySelector("path")?.namespaceURI !== "http://www.w3.org/2000/svg" || faNode.getAttribute("data-icon-unicode") !== "f0c5" || fallbackNode.textContent !== "⧉" || fallbackNode.dataset.iconProvider !== "fallback" || customNode.dataset.iconProvider !== "webawesome" || functionNode.dataset.iconProvider !== "custom") throw new Error("Adaptador neutro de providers ou fallback divergente");

function response(body, contentType = "application/json") {
  return { ok: true, status: 200, headers: { get: (name) => name.toLowerCase() === "content-type" ? contentType : null }, json: async () => JSON.parse(body), text: async () => body };
}

async function fetchLocal(url) {
  const parsed = new URL(url, "https://example.test/");
  const target = path.resolve(DIST, parsed.pathname.replace(/^\/+/, ""));
  if (!target.startsWith(`${DIST}${path.sep}`)) return { ok: false, status: 404, headers: { get: () => null } };
  try { return response(await readFile(target, "utf8")); } catch { return { ok: false, status: 404, headers: { get: () => null } }; }
}

async function render(pathname) {
  const dom = new JSDOM(html, { url: `https://example.test${pathname}`, runScripts: "outside-only", pretendToBeVisual: true });
  const requests = [];
  dom.window.fetch = async (url) => { requests.push(String(url)); return fetchLocal(url); };
  let copied = null; Object.defineProperty(dom.window.navigator, "clipboard", { value: { writeText: async (value) => { copied = value; } } });
  dom.window.console.error = () => undefined;
  dom.window.eval(script);
  await new Promise((resolve) => setTimeout(resolve, 40));
  return { dom, copied: () => copied, requests, state: { landing: !dom.window.document.getElementById("landing-view").hidden, book: !dom.window.document.getElementById("book-view").hidden, notFound: !dom.window.document.getElementById("not-found-view").hidden, title: dom.window.document.title, processing: dom.window.document.getElementById("processing-indicator").dataset.state } };
}

async function submitSearch(rendered, value) {
  const inputNode = rendered.dom.window.document.getElementById("book-id");
  const formNode = inputNode.closest("form");
  inputNode.value = value;
  formNode.dispatchEvent(new rendered.dom.window.Event("submit", { bubbles: true, cancelable: true }));
  await new Promise((resolve) => setTimeout(resolve, 120));
}

const home = await render("/");
if (!home.state.landing || home.state.book || home.state.notFound || !home.dom.window.document.querySelector("noscript") || !home.dom.window.document.querySelector('link[href="/assets/app.css"]')) throw new Error("Página inicial ou noscript divergente");
const shortQuery = await render("/");
await submitSearch(shortQuery, "ab");
if (shortQuery.requests.some((request) => request.includes("/d/_index/search.json")) || !shortQuery.dom.window.document.querySelector('#search-notice .notice')?.textContent.includes(`${config.search.min_query_chars} caracteres`) || !shortQuery.dom.window.document.getElementById("search-results").hidden) throw new Error("Busca curta não bloqueou antes do índice");
const disambiguatedQuery = await render("/");
await submitSearch(disambiguatedQuery, "testimonies");
const resultItems = disambiguatedQuery.dom.window.document.querySelectorAll("#search-results .result-item");
const closeResults = disambiguatedQuery.dom.window.document.querySelector("#search-results .search-close");
if (resultItems.length !== config.search.results_per_page || !disambiguatedQuery.requests.some((request) => request.includes("/d/_index/search.json")) || !disambiguatedQuery.dom.window.document.querySelector("#search-results .pagination")?.textContent.includes("Página 1 de") || !disambiguatedQuery.dom.window.document.querySelector("#search-results .search-backdrop") || !closeResults || disambiguatedQuery.dom.window.document.activeElement !== closeResults || !resultItems[0].getAttribute("href")?.startsWith("https://example.test/") || !resultItems[0].textContent.includes(config.short_url_origin.replace(/^https:\/\//, ""))) throw new Error("Desambiguação ou paginação da busca divergente");
closeResults.click();
if (!disambiguatedQuery.dom.window.document.getElementById("search-results").hidden) throw new Error("Painel de desambiguação não fechou");
const canonicalResult = await render(`/${canonical}`);
if (!canonicalResult.state.book || canonicalResult.state.notFound || !canonicalResult.dom.window.document.querySelector("#book-view-title")) throw new Error("Rota canônica não renderizou Livro");
const metadata = JSON.parse(await readFile(path.join(DIST, ...canonical.split("/"), "metadata.json"), "utf8"));
const copy = canonicalResult.dom.window.document.querySelector('.hash-panel .icon-button'); copy.click(); await new Promise((resolve) => setTimeout(resolve, 0));
const firstHash = canonicalResult.dom.window.document.querySelector('.hash-panel .compact-hash .compact-text');
const sourceItems = canonicalResult.dom.window.document.querySelectorAll('.source-item');
const firstSource = sourceItems[0];
const metrics = Object.fromEntries([...canonicalResult.dom.window.document.querySelectorAll('.metric')].map((node) => [node.querySelector('span')?.textContent, node.querySelector('strong')?.textContent]));
const copySvg = canonicalResult.dom.window.document.querySelector('.compact-url .icon-button .fa-icon[width="1em"][height="1em"]');
if (canonicalResult.copied() !== metadata.global_hashes[0].sha1 || firstHash?.textContent !== metadata.global_hashes[0].sha1.slice(-7) || firstHash?.getAttribute('aria-label') !== metadata.global_hashes[0].sha1 || copySvg?.namespaceURI !== "http://www.w3.org/2000/svg" || copySvg?.querySelector('path')?.namespaceURI !== "http://www.w3.org/2000/svg" || sourceItems.length !== metadata.sources.length || !firstSource?.querySelector('.asset-format .fa-icon') || !firstSource?.querySelector('.download-button .fa-icon')) throw new Error("UI de hashes, URLs, ícones ou assets divergente");
if (!canonicalResult.dom.window.document.querySelector('#processing-indicator .processing-track') || canonicalResult.state.processing !== "completed") throw new Error("Estados progressivos da rota canônica divergentes");
const traceableAssetCount = new Set(metadata.sources.map((source) => source.asset_id).filter((assetId) => assetId && metadata.assets.some((asset) => asset.id === assetId))).size;
const qrAsset = metadata.assets.find((asset) => asset.id === "short-url-qr");
const qrImage = canonicalResult.dom.window.document.querySelector('.qr-download img');
const qrDownload = canonicalResult.dom.window.document.querySelector('.qr-download a[download$="-short-url.svg"] .fa-icon');
const qrVisibleLabel = canonicalResult.dom.window.document.querySelector('.qr-download a[download$="-short-url.svg"] span:not(.sr-only)');
if (metrics["Fontes preservadas"] !== String(metadata.sources.length) || metrics["Arquivos da publicação"] !== String(metadata.assets.length + 1) || metrics["Assets rastreáveis"] !== String(traceableAssetCount) || metrics["URL curta"] !== `${config.short_url_origin.replace(/^https:\/\//, "")}/${metadata.short_token}` || Object.keys(metrics).length !== 4 || !qrAsset || qrAsset.origin_url !== `${config.short_url_origin}/${metadata.short_token}` || !qrImage || !qrDownload || qrVisibleLabel) throw new Error("Indicadores, QR Code ou proveniência divergentes");
if (canonicalResult.dom.window.document.querySelector('.source-table-wrap, table') || !firstSource?.querySelector('.source-host') || !firstSource?.querySelector('.source-provider')) throw new Error("Grid ou proveniência divergente");
const shortResult = await render(`/${token}/`);
if (!shortResult.state.book || shortResult.state.processing !== "completed") throw new Error("Rota curta não renderizou Livro progressivamente");
const shortLegacyResult = await render(`/_/${token}/`);
if (!shortLegacyResult.state.book) throw new Error("Alias curto legado não renderizou Livro");
const legacyResult = await render(`/${legacyPath}`);
if (!legacyResult.state.book) throw new Error("Alias histórico não renderizou Livro");
const missing = await render("/rota-inexistente/");
if (!missing.state.notFound || missing.state.book) throw new Error("404 real divergente");
process.stdout.write(`UI_OK canonical=/${canonical} short=/${token}/ legacy=/${legacyPath} qr=${qrAsset.url}\n`);
