#!/usr/bin/env node
// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { watch } from "node:fs";
import { access, readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(REPOSITORY_ROOT, "src", "config", "dev-live.json"), "utf8"));
const PUBLIC_ROOT = path.resolve(REPOSITORY_ROOT, config.root);
const clients = new Set();
const types = new Map([[".html", "text/html; charset=utf-8"], [".json", "application/json; charset=utf-8"], [".svg", "image/svg+xml"], [".webp", "image/webp"], [".woff2", "font/woff2"], [".7z", "application/x-7z-compressed"]]);
const reloadClient = '<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>';

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

function safePath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const target = path.resolve(PUBLIC_ROOT, `.${decoded}`);
  return target === PUBLIC_ROOT || target.startsWith(`${PUBLIC_ROOT}${path.sep}`) ? target : null;
}

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url || "/", `${config.protocol}://${config.host}:${config.port}`).pathname;
  if (pathname === "/__reload") {
    response.writeHead(200, { "Cache-Control": "no-store", "Content-Type": "text/event-stream", Connection: "keep-alive" });
    response.write("retry: 500\n\n");
    clients.add(response);
    request.on("close", () => clients.delete(response));
    return;
  }
  let target = safePath(pathname);
  if (!target) { response.writeHead(400).end("Caminho inválido"); return; }
  if (pathname.endsWith("/")) target = path.join(target, "index.html");
  if (!(await exists(target))) target = path.extname(pathname) ? path.join(PUBLIC_ROOT, "404.html") : path.join(PUBLIC_ROOT, "index.html");
  const extension = path.extname(target).toLowerCase();
  let body = await readFile(target);
  if (extension === ".html") body = Buffer.from(body.toString("utf8").replace("</body>", `${reloadClient}</body>`));
  response.writeHead(target.endsWith("404.html") ? 404 : 200, { "Cache-Control": "no-store", "Content-Type": types.get(extension) || "application/octet-stream" });
  response.end(body);
});

watch(PUBLIC_ROOT, { recursive: true }, () => { for (const client of clients) client.write("data: reload\n\n"); });
server.listen(config.port, config.host, () => process.stdout.write(`DEV-LIVE: ${config.protocol}://${config.host}:${config.port}/ root=${config.root}/ reload=${config.reload}\n`));
