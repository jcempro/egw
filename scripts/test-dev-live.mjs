#!/usr/bin/env node
// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(path.join(ROOT, "src", "config", "dev-live.json"), "utf8"));
const origin = `${config.protocol}://${config.host}:${config.port}`;
const short = JSON.parse(await readFile(path.join(ROOT, "dist", "d", "_index", "short.json"), "utf8"));
const canonical = Object.values(short)[0];
const child = spawn(process.execPath, [path.join(ROOT, "scripts", "serve-site.mjs")], { cwd: ROOT, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });

async function ready() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("dev-live não iniciou")), 10_000);
    child.once("error", reject); child.once("exit", (code) => reject(new Error(`dev-live encerrou antes do teste: ${code}`)));
    child.stdout.on("data", (chunk) => { if (chunk.toString().includes("DEV-LIVE:")) { clearTimeout(timer); resolve(); } });
  });
}

try {
  await ready();
  const [deep, script, style, missingAsset] = await Promise.all([fetch(`${origin}/${canonical}`), fetch(`${origin}/assets/app.js`), fetch(`${origin}/assets/app.css`), fetch(`${origin}/assets/ausente.js`)]);
  if (deep.status !== 404 || !(deep.headers.get("content-type") || "").startsWith("text/html") || !(await deep.text()).includes('id="book-view"')) throw new Error("Front controller local divergente");
  if (!(script.headers.get("content-type") || "").startsWith("text/javascript") || !(style.headers.get("content-type") || "").startsWith("text/css")) throw new Error("MIME de runtime divergente");
  if (missingAsset.status !== 404 || !(missingAsset.headers.get("content-type") || "").startsWith("text/html")) throw new Error("Fallback de asset divergente");
  process.stdout.write(`DEV_LIVE_OK canonical=/${canonical} status=${deep.status}\n`);
} finally {
  child.kill();
}
