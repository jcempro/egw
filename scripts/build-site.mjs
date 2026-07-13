#!/usr/bin/env node

import { access, cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
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
  process.stdout.write(`BUILD: livros=${generated.books} shards=${generated.shards} bytes=${generated.totalSize} arquivos=${files.length} root=dist/\n`);
}

main().catch((error) => {
  process.stderr.write(`ERRO: ${error.message}\n`);
  process.exitCode = 1;
});
