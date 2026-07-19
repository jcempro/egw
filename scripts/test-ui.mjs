#!/usr/bin/env node
// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const html = await readFile(path.join(DIST, "index.html"), "utf8");
const script = await readFile(path.join(DIST, "assets", "app.js"), "utf8");
const short = JSON.parse(await readFile(path.join(DIST, "d", "_index", "short.json"), "utf8"));
const legacy = JSON.parse(await readFile(path.join(DIST, "d", "_index", "legacy.json"), "utf8"));
const [token, canonical] = Object.entries(short)[0];
const legacyPath = Object.entries(legacy).find(([, value]) => value === canonical)?.[0];
if (!legacyPath) throw new Error("Alias de teste ausente");

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
  dom.window.fetch = fetchLocal;
  dom.window.console.error = () => undefined;
  dom.window.eval(script);
  await new Promise((resolve) => setTimeout(resolve, 40));
  return { dom, state: { landing: !dom.window.document.getElementById("landing-view").hidden, book: !dom.window.document.getElementById("book-view").hidden, notFound: !dom.window.document.getElementById("not-found-view").hidden, title: dom.window.document.title } };
}

const home = await render("/");
if (!home.state.landing || home.state.book || home.state.notFound || !home.dom.window.document.querySelector("noscript") || !home.dom.window.document.querySelector('link[href="/assets/app.css"]')) throw new Error("Página inicial ou noscript divergente");
const canonicalResult = await render(`/${canonical}`);
if (!canonicalResult.state.book || canonicalResult.state.notFound || !canonicalResult.dom.window.document.querySelector("#book-view-title")) throw new Error("Rota canônica não renderizou Livro");
const shortResult = await render(`/_/${token}/`);
if (!shortResult.state.book) throw new Error("Rota curta não renderizou Livro");
const legacyResult = await render(`/${legacyPath}`);
if (!legacyResult.state.book) throw new Error("Alias histórico não renderizou Livro");
const missing = await render("/rota-inexistente/");
if (!missing.state.notFound || missing.state.book) throw new Error("404 real divergente");
process.stdout.write(`UI_OK canonical=/${canonical} short=/_/${token}/ legacy=/${legacyPath}\n`);
