#!/usr/bin/env node
// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const D = path.join(DIST, "d");
const hashes = (value) => value && /^[a-f0-9]{40}$/.test(value.sha1 || "") && /^[a-f0-9]{64}$/.test(value.sha256 || "") && /^[a-f0-9]{128}$/.test(value.sha512 || "");
const posix = (value) => value.split(path.sep).join("/");

async function metadataFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== "_index") result.push(...await metadataFiles(target));
    else if (entry.isFile() && entry.name === "metadata.json") result.push(target);
  }
  return result;
}

async function main() {
  const search = JSON.parse(await readFile(path.join(D, "_index", "search.json"), "utf8"));
  const short = JSON.parse(await readFile(path.join(D, "_index", "short.json"), "utf8"));
  const legacy = JSON.parse(await readFile(path.join(D, "_index", "legacy.json"), "utf8"));
  const files = await metadataFiles(D);
  const expectedSearch = [];
  const seenTokens = new Set();
  for (const file of files) {
    const data = JSON.parse(await readFile(file, "utf8"));
    if (data.schema_version !== 5 || Object.keys(data).sort().join(",") !== "assets,book,global_hashes,schema_version,short_token,sources") throw new Error(`Schema 5 inválido: ${file}`);
    if (seenTokens.has(data.short_token)) throw new Error(`Token duplicado: ${data.short_token}`);
    seenTokens.add(data.short_token);
    const canonical = `${posix(path.relative(DIST, path.dirname(file)))}/`;
    if (short[data.short_token] !== canonical) throw new Error(`Mapa curto divergente: ${data.book.id}`);
    const padded = `${data.book.id}----`;
    if (legacy[`data/${padded.slice(0, 2)}/${padded.slice(2, 4)}/${data.book.id}/`] !== canonical) throw new Error(`Alias histórico ausente: ${data.book.id}`);
    if (!data.global_hashes.length || !data.global_hashes.every((entry) => ["pdf", "epub"].includes(entry.format) && hashes(entry))) throw new Error(`Hash Global inválido: ${data.book.id}`);
    for (const asset of data.assets) {
      if (!/^\.\/[a-z0-9][a-z0-9.-]*$/i.test(asset.url) || !hashes(asset.source_hashes)) throw new Error(`Asset inválido: ${data.book.id}`);
      const target = path.join(path.dirname(file), asset.url.slice(2));
      await access(target);
      if ((await stat(target)).size !== asset.size) throw new Error(`Tamanho divergente: ${target}`);
    }
    expectedSearch.push([data.book.title, data.short_token]);
  }
  if (JSON.stringify(search) !== JSON.stringify(expectedSearch)) throw new Error("Índice de busca contém dado extra, ausente ou fora de ordem");
  if (Object.keys(short).length !== files.length || Object.keys(legacy).length !== files.length) throw new Error("Cobertura dos mapas divergente");
  process.stdout.write(`DIST_OK livros=${files.length} busca_campos=2 tokens=${seenTokens.size}\n`);
}

main().catch((error) => { process.stderr.write(`ERRO: ${error.message}\n`); process.exitCode = 1; });
