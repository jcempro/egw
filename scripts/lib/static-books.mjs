import { createHash } from "node:crypto";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import sharp from "sharp";

const execute = promisify(execFile);
const POSIX = (value) => value.split(path.sep).join("/");

export function bookSegments(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Slug inválido: ${slug}`);
  const padded = `${slug}----`;
  return [padded.slice(0, 2), padded.slice(2, 4)];
}

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

async function hashFile(target, algorithm) {
  return createHash(algorithm).update(await readFile(target)).digest("hex");
}

function sevenZip() {
  if (process.env.SEVEN_ZIP_BIN) return process.env.SEVEN_ZIP_BIN;
  return process.platform === "win32" ? "C:\\Program Files\\7-Zip\\7z.exe" : "7z";
}

async function createPackage({ destination, sourceDirectory, entries }) {
  const names = entries.map((entry) => entry.name).sort((left, right) => left.localeCompare(right, "en"));
  if (!names.length) throw new Error("Pacote sem artefato de livro");
  await execute(sevenZip(), ["a", "-t7z", "-m0=LZMA2", "-mx=9", "-ms=on", "-mmt=on", "-y", destination, ...names], { cwd: sourceDirectory, maxBuffer: 1024 * 1024 });
  await execute(sevenZip(), ["t", destination], { maxBuffer: 1024 * 1024 });
  return { sha256: await hashFile(destination, "sha256"), sha512: await hashFile(destination, "sha512"), size: (await stat(destination)).size };
}

async function listMetadata(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => path.join(directory, entry.name, "metadata.json")).sort((left, right) => left.localeCompare(right, "en"));
}

function writeJson(target, value) {
  return writeFile(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function materializeBooks({ sourceRoot, distRoot, pageLimit = 1_000_000_000 }) {
  const dataSource = path.join(sourceRoot, "data", "books");
  const assetsSource = path.join(sourceRoot, "assets", "books");
  const dataRoot = path.join(distRoot, "data");
  const shards = new Map();
  const books = [];
  for (const metadataPath of await listMetadata(dataSource)) {
    const input = JSON.parse(await readFile(metadataPath, "utf8"));
    const book = input.book;
    const slug = book.id;
    const [first, second] = bookSegments(slug);
    const directory = path.join(dataRoot, first, second, slug);
    const sourceDirectory = path.join(assetsSource, slug);
    const sourceEntries = [];
    for (const extension of ["pdf", "epub"]) {
      const target = path.join(sourceDirectory, `source.${extension}`);
      if (await exists(target)) sourceEntries.push({ name: `source.${extension}`, format: extension, target });
    }
    if (!sourceEntries.length) throw new Error(`Artefato interno ausente: ${slug}`);
    const cover = path.join(sourceDirectory, "cover.png");
    if (!(await exists(cover))) throw new Error(`Capa interna ausente: ${slug}`);
    await mkdir(directory, { recursive: true });
    const packageName = `${slug}.7z`;
    const packageInfo = await createPackage({ destination: path.join(directory, packageName), sourceDirectory, entries: sourceEntries });
    await sharp(cover).rotate().resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 5 }).toFile(path.join(directory, "cover.webp"));
    const sourceHashes = sourceEntries.map(async ({ format, target }) => ({ label: `Artefato ${format.toUpperCase()}`, format, algorithm: "SHA-512", value: await hashFile(target, "sha512") }));
    const globalHashes = await Promise.all(sourceHashes);
    const publicCover = `data/${first}/${second}/${slug}/cover.webp`;
    const publicPackage = `data/${first}/${second}/${slug}/${packageName}`;
    const metadata = {
      schema_version: 4,
      book: { ...book, slug, cover: publicCover },
      global_hashes: globalHashes,
      sources: input.sources.map((source) => ({ ...source, url: source.origin_url || publicPackage, type: source.origin_url ? "origin" : "preserved-package" })),
      assets: { cover: "./cover.webp" },
      download: { url: `./${packageName}`, format: "7z", compression: "LZMA2", content_formats: sourceEntries.map((entry) => entry.format), size: packageInfo.size, sha256: packageInfo.sha256, sha512: packageInfo.sha512 }
    };
    await writeJson(path.join(directory, "metadata.json"), metadata);
    const shard = `${first}-${second}`;
    const item = { id: book.id, title: book.title, author: book.contributors.find((person) => person.role === "author")?.name || null, slug, segments: [first, second], path: `data/${first}/${second}/${slug}/metadata.json` };
    if (!shards.has(shard)) shards.set(shard, []);
    shards.get(shard).push(item);
    books.push({ directory, first, second, slug });
  }
  const shardRoot = path.join(dataRoot, "index", "shards");
  await mkdir(shardRoot, { recursive: true });
  const manifestShards = [];
  for (const [name, items] of [...shards].sort(([left], [right]) => left.localeCompare(right, "en"))) {
    const relative = `shards/${name}.json`;
    const target = path.join(dataRoot, "index", relative);
    await writeJson(target, { schema_version: 1, items });
    manifestShards.push({ path: relative, count: items.length, sha256: await hashFile(target, "sha256"), size: (await stat(target)).size });
  }
  const files = await collectFiles(distRoot);
  const totalSize = (await Promise.all(files.map(async (file) => (await stat(file)).size))).reduce((sum, size) => sum + size, 0);
  if (totalSize > pageLimit) throw new Error(`Artefato excede limite configurado: ${totalSize} > ${pageLimit}`);
  await writeJson(path.join(dataRoot, "index", "manifest.json"), { schema_version: 1, strategy: "slug-first-four", book_count: books.length, shards: manifestShards, total_size: totalSize });
  return { books: books.length, shards: manifestShards.length, totalSize };
}

async function collectFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(target));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}
