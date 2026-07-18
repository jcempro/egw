#!/usr/bin/env node
// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { access, cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { materializeBooks } from "./lib/static-books.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_ROOT = path.join(ROOT, "src");
const DIST_ROOT = path.join(ROOT, "dist");

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function assertPublicSource() {
  for (const entry of ["404.html", "assets", "data"]) {
    if (!(await exists(path.join(SOURCE_ROOT, entry)))) throw new Error(`Fonte pública ausente: src/${entry}`);
  }
}

async function listFiles(directory) {
  const files = [];
  async function visit(current) {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name, "en"))) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) files.push(target);
    }
  }
  await visit(directory);
  return files;
}

async function main() {
  await assertPublicSource();
  if (path.dirname(DIST_ROOT) !== ROOT || path.basename(DIST_ROOT) !== "dist") throw new Error("Destino de build inválido");
  await rm(DIST_ROOT, { force: true, recursive: true });
  await mkdir(DIST_ROOT, { recursive: true });
  await cp(path.join(SOURCE_ROOT, "404.html"), path.join(DIST_ROOT, "404.html"));
  await cp(path.join(SOURCE_ROOT, "404.html"), path.join(DIST_ROOT, "index.html"));
  await cp(path.join(SOURCE_ROOT, "assets"), path.join(DIST_ROOT, "assets"), { recursive: true, filter: (source) => !source.includes(`${path.sep}assets${path.sep}books`) });
  const generated = await materializeBooks({ sourceRoot: SOURCE_ROOT, distRoot: DIST_ROOT });
  await writeFile(path.join(DIST_ROOT, ".nojekyll"), "", "utf8");
  const leaked = (await listFiles(DIST_ROOT)).find((file) => path.relative(DIST_ROOT, file).split(path.sep).includes("src"));
  if (leaked) throw new Error(`Prefixo src/ exposto no artefato: ${path.relative(DIST_ROOT, leaked)}`);
  const files = await listFiles(DIST_ROOT);
  const publicEntries = await Promise.all(files.map(async (file) => ({ file, relative: path.relative(DIST_ROOT, file).split(path.sep).join("/"), size: (await stat(file)).size })));
  const bookPattern = /^data\/[a-z0-9-]{2}\/[a-z0-9-]{2}\/[a-z0-9]+(?:-[a-z0-9]+)*\/(metadata\.json|cover\.webp|[a-z0-9]+(?:-[a-z0-9]+)*\.7z)$/;
  const bookEntries = publicEntries.filter((entry) => bookPattern.test(entry.relative));
  const forbidden = publicEntries.find((entry) => /^data\//.test(entry.relative) && /\.(pdf|epub|png|partial)$/i.test(entry.relative));
  const metadataCount = bookEntries.filter((entry) => entry.relative.endsWith("/metadata.json")).length;
  const coverCount = bookEntries.filter((entry) => entry.relative.endsWith("/cover.webp")).length;
  const packageCount = bookEntries.filter((entry) => entry.relative.endsWith(".7z")).length;
  if (forbidden) throw new Error(`Artefato público proibido: ${forbidden.relative}`);
  if ([metadataCount, coverCount, packageCount].some((count) => count !== generated.books)) throw new Error(`Árvore incompleta: metadata=${metadataCount} capas=${coverCount} pacotes=${packageCount}`);
  const oversized = publicEntries.find((entry) => entry.size > 100_000_000);
  if (oversized) throw new Error(`Arquivo público excede 100 MB: ${oversized.relative}`);
  const totalSize = publicEntries.reduce((sum, entry) => sum + entry.size, 0);
  const pageLimit = Number.parseInt(process.env.PAGE_LIMIT_BYTES || "1000000000", 10);
  if (!Number.isSafeInteger(pageLimit) || pageLimit <= 0) throw new Error("PAGE_LIMIT_BYTES inválido");
  if (totalSize > pageLimit) throw new Error(`Artefato excede limite configurado: ${totalSize} > ${pageLimit}`);
  process.stdout.write(`BUILD: livros=${generated.books} shards=${generated.shards} bytes=${totalSize} arquivos=${files.length} root=dist/\n`);
}

main().catch((error) => {
  process.stderr.write(`ERRO: ${error.message}\n`);
  process.exitCode = 1;
});
