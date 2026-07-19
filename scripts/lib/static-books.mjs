// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { createHash } from "node:crypto";
import { access, copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import sharp from "sharp";

const execute = promisify(execFile);
const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const ACRONYM_CATEGORIES = new Set(["books", "livros", "book", "devotionals", "devocionais", "devotional"]);
const IGNORED_ACRONYM_WORDS = new Set(["a", "an", "and", "as", "da", "das", "de", "do", "dos", "e", "o", "os", "the", "volume", "vol"]);

async function exists(target) {
  try { await access(target); return true; } catch { return false; }
}

function normalizeSegment(value, fallback = "item") {
  const result = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return result || fallback;
}

function titleWords(title) {
  return normalizeSegment(title, "").split("-").filter(Boolean);
}

function categoryFor(book) {
  const prefix = `${normalizeSegment(book.language)}-`;
  const remainder = book.id.startsWith(prefix) ? book.id.slice(prefix.length) : book.id;
  return normalizeSegment(remainder.split("-")[0], "books");
}

export function canonicalBookSegments(book) {
  const words = titleWords(book.title);
  const remainder = words.length > 2 ? words.slice(2).join("-") : normalizeSegment(book.id);
  return [normalizeSegment(book.language), categoryFor(book), words[0] || normalizeSegment(book.id), words[1] || remainder, remainder];
}

export function legacyBookSegments(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Slug inválido: ${slug}`);
  const padded = `${slug}----`;
  return [padded.slice(0, 2), padded.slice(2, 4)];
}

function encodeCounter(value) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Contador curto inválido: ${value}`);
  let current = value;
  let result = "";
  while (current > 0) {
    result = BASE64URL[current % 64] + result;
    current = Math.floor(current / 64);
  }
  return result;
}

function preferredAcronym(book) {
  const category = categoryFor(book);
  if (!ACRONYM_CATEGORIES.has(category)) return null;
  const words = titleWords(book.title).filter((word) => !IGNORED_ACRONYM_WORDS.has(word));
  if (!words.length) return null;
  return words.map((word) => /^\d+$/.test(word) ? word : word[0]).join("");
}

function assignTokens(inputs) {
  const used = new Set();
  const assignments = new Map();
  let counter = 1;
  for (const input of inputs) {
    const preferred = preferredAcronym(input.book);
    const language = normalizeSegment(input.book.language);
    const originalFirst = titleWords(input.book.title)[0] || "";
    const articlePrefixed = preferred && IGNORED_ACRONYM_WORDS.has(originalFirst) ? `${originalFirst[0]}${preferred}` : null;
    const candidates = preferred ? [preferred, articlePrefixed, `${preferred}-${language}`].filter(Boolean) : [];
    let token = candidates.find((candidate) => !used.has(candidate));
    while (!token) {
      const candidate = encodeCounter(counter++);
      if (!used.has(candidate)) token = candidate;
    }
    used.add(token);
    assignments.set(input.book.id, token);
  }
  return { assignments, nextCounter: counter };
}

async function hashFile(target) {
  const bytes = await readFile(target);
  return {
    sha1: createHash("sha1").update(bytes).digest("hex"),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    sha512: createHash("sha512").update(bytes).digest("hex"),
  };
}

function sevenZip() {
  if (process.env.SEVEN_ZIP_BIN) return process.env.SEVEN_ZIP_BIN;
  return process.platform === "win32" ? "C:\\Program Files\\7-Zip\\7z.exe" : "7z";
}

async function createPackage({ destination, sourceDirectory, names }) {
  const entries = [...names].sort((left, right) => left.localeCompare(right, "en"));
  if (!entries.length) throw new Error("Pacote sem artefato de livro");
  const temporary = `${destination}.partial`;
  await rm(temporary, { force: true });
  try {
    await execute(sevenZip(), ["a", "-t7z", "-m0=LZMA2", "-mx=9", "-ms=on", "-mmt=on", "-mtc=off", "-mta=off", "-mtm=off", "-y", temporary, ...entries], { cwd: sourceDirectory, maxBuffer: 1024 * 1024 });
    await execute(sevenZip(), ["t", temporary], { maxBuffer: 1024 * 1024 });
    const { stdout } = await execute(sevenZip(), ["l", "-slt", temporary], { maxBuffer: 1024 * 1024 });
    if (!/Method = .*LZMA2/m.test(stdout) || entries.some((name) => !stdout.includes(`Path = ${name}`))) throw new Error(`Pacote inválido: ${path.basename(destination)}`);
    await rename(temporary, destination);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
  return { hashes: await hashFile(destination), size: (await stat(destination)).size };
}

function packageCacheKey(bookId, globalHashes, variant = "all") {
  const identity = JSON.stringify({ version: 2, format: "7z", method: "LZMA2", level: 9, bookId, variant, artifacts: globalHashes.map(({ artifact_id, sha256 }) => [artifact_id, sha256]) });
  return createHash("sha256").update(identity).digest("hex");
}

async function testPackage(target, names) {
  try {
    await execute(sevenZip(), ["t", target], { maxBuffer: 1024 * 1024 });
    const { stdout } = await execute(sevenZip(), ["l", "-slt", target], { maxBuffer: 1024 * 1024 });
    return /Method = .*LZMA2/m.test(stdout) && names.every((name) => stdout.includes(`Path = ${name}`));
  } catch { return false; }
}

async function materializePackage({ destination, sourceDirectory, names, cacheRoot, cacheKey }) {
  const cached = path.join(cacheRoot, `${cacheKey}.7z`);
  const marker = path.join(cacheRoot, `${cacheKey}.json`);
  await mkdir(cacheRoot, { recursive: true });
  let cachedState = null;
  if (await exists(cached) && await exists(marker)) {
    const state = JSON.parse(await readFile(marker, "utf8"));
    if (state.schema_version === 1 && JSON.stringify(state.names) === JSON.stringify(names) && validHashMatrix(state.hashes) && state.size === (await stat(cached)).size) cachedState = state;
  }
  if (!cachedState) {
    await rm(cached, { force: true });
    await rm(marker, { force: true });
    const created = await createPackage({ destination: cached, sourceDirectory, names });
    cachedState = { schema_version: 1, names, hashes: created.hashes, size: created.size };
    await writeJson(marker, cachedState);
  }
  await copyFile(cached, destination);
  const destinationHashes = await hashFile(destination);
  if (JSON.stringify(destinationHashes) !== JSON.stringify(cachedState.hashes)) {
    await rm(cached, { force: true });
    await rm(marker, { force: true });
    throw new Error(`Pacote em cache divergiu após cópia: ${path.basename(destination)}`);
  }
  return { hashes: destinationHashes, size: (await stat(destination)).size, reused: true };
}

function validHashMatrix(value) {
  return value && /^[a-f0-9]{40}$/.test(value.sha1 || "") && /^[a-f0-9]{64}$/.test(value.sha256 || "") && /^[a-f0-9]{128}$/.test(value.sha512 || "");
}

async function listMetadata(directory) {
  return (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name, "metadata.json"))
    .sort((left, right) => left.localeCompare(right, "en"));
}

async function collectMetadata(directory) {
  if (!(await exists(directory))) return [];
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await collectMetadata(target));
    else if (entry.isFile() && entry.name === "metadata.json") result.push(target);
  }
  return result;
}

export async function seedPackageCache(distRoot, cacheRoot) {
  let seeded = 0;
  await mkdir(cacheRoot, { recursive: true });
  for (const metadataPath of await collectMetadata(path.join(distRoot, "d"))) {
    const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    if (metadata.schema_version !== 5 || !Array.isArray(metadata.global_hashes) || !metadata.book?.id) continue;
    const packages = metadata.assets?.filter((asset) => asset.format === "7z" && /^\.\/[a-z0-9-]+\.7z$/.test(asset.url)) || [];
    for (const packageAsset of packages) {
      const selected = packageAsset.id === "package" ? metadata.global_hashes : metadata.global_hashes.filter((hash) => packageAsset.id === `source-${hash.format}`);
      const names = selected.map((hash) => `source.${hash.format}`); const variant = packageAsset.id === "package" ? "all" : selected[0]?.format;
      const source = path.join(path.dirname(metadataPath), packageAsset.url.slice(2)); if (!names.length || !(await exists(source))) continue;
      const key = packageCacheKey(metadata.book.id, selected, variant); const cached = path.join(cacheRoot, `${key}.7z`); const marker = path.join(cacheRoot, `${key}.json`);
      if (!(await exists(cached))) { if (!(await testPackage(source, names))) continue; await copyFile(source, cached); seeded += 1; }
      if (!(await exists(marker))) { const hashes = await hashFile(cached); if (JSON.stringify(hashes) !== JSON.stringify(packageAsset.source_hashes)) throw new Error(`Cache divergente durante semeadura: ${metadata.book.id}`); await writeJson(marker, { schema_version: 1, names, hashes, size: (await stat(cached)).size }); }
    }
  }
  return seeded;
}

async function writeJson(target, value) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.partial`;
  await writeFile(temporary, `${JSON.stringify(value)}\n`, "utf8");
  await rename(temporary, target);
}

function assetRecord(id, format, url, size, hashes, originUrl = null) {
  return { id, format, url, size, source_hashes: hashes, origin_url: originUrl };
}

function sourceRecord(source, assetId, format, hashes, storageHost) {
  const provider = source.provider || (source.origin_url ? new URL(source.origin_url).hostname : "local-preserved");
  const remote = /^https?:\/\//i.test(source.url || "");
  return {
    id: source.id,
    title: remote ? new URL(source.url).hostname : storageHost,
    url: remote ? source.url : `./source-${format}.7z`,
    type: source.type || "preserved-asset",
    format,
    provider,
    asset_id: assetId,
    hashes: remote ? (source.hashes || hashes) : hashes,
  };
}

export async function materializeBooks({ sourceRoot, distRoot, cacheRoot, publicOrigin }) {
  const storageHost = new URL(publicOrigin).hostname;
  const dataSource = path.join(sourceRoot, "data", "books");
  const assetsSource = path.join(sourceRoot, "assets", "books");
  const dRoot = path.join(distRoot, "d");
  const inputs = [];
  for (const metadataPath of await listMetadata(dataSource)) {
    const input = JSON.parse(await readFile(metadataPath, "utf8"));
    inputs.push({ input, book: input.book, sourceDirectory: path.join(assetsSource, input.book.id) });
  }
  const { assignments, nextCounter } = assignTokens(inputs);
  const canonicalPaths = new Set();
  const searchItems = [];
  const shortRoutes = {};
  const legacyRoutes = {};
  let publishedAssets = 0;

  for (const { input, book, sourceDirectory } of inputs) {
    const segments = canonicalBookSegments(book);
    const canonicalPath = `d/${segments.join("/")}/`;
    if (canonicalPaths.has(canonicalPath)) throw new Error(`Colisão de rota canônica: ${canonicalPath}`);
    canonicalPaths.add(canonicalPath);
    const directory = path.join(distRoot, ...canonicalPath.split("/").filter(Boolean));
    await mkdir(directory, { recursive: true });
    const formats = [];
    const assets = [];
    const globalHashes = [];
    const sourceByFormat = new Map(input.sources.filter((source) => !/^https?:\/\//i.test(source.url || "")).map((source) => [path.extname(new URL(source.origin_url || source.url, "https://local.invalid").pathname).slice(1).toLowerCase() || source.id, source]));
    for (const format of ["pdf", "epub"]) {
      const sourceFile = path.join(sourceDirectory, `source.${format}`);
      if (!(await exists(sourceFile))) continue;
      const hashes = await hashFile(sourceFile);
      const artifactId = `source-${format}`;
      const source = sourceByFormat.get(format);
      formats.push(format);
      globalHashes.push({ artifact_id: artifactId, format, ...hashes });
      const archiveName = `source-${format}.7z`; const archive = await materializePackage({ destination: path.join(directory, archiveName), sourceDirectory, names: [`source.${format}`], cacheRoot, cacheKey: packageCacheKey(book.id, [{ artifact_id: artifactId, format, ...hashes }], format) });
      assets.push(assetRecord(artifactId, "7z", `./${archiveName}`, archive.size, archive.hashes, source?.origin_url || null));
      publishedAssets += 1;
    }
    if (!formats.length) throw new Error(`Artefato interno ausente: ${book.id}`);

    const sourceCover = path.join(sourceDirectory, "cover.png");
    if (!(await exists(sourceCover))) throw new Error(`Capa interna ausente: ${book.id}`);
    const coverPath = path.join(directory, "cover.png");
    await sharp(sourceCover).rotate().resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(coverPath);
    assets.push(assetRecord("cover", "png", "./cover.png", (await stat(coverPath)).size, await hashFile(coverPath)));

    const token = assignments.get(book.id);
    const metadata = {
      schema_version: 5,
      book: {
        id: book.id,
        title: book.title,
        contributors: Array.isArray(book.contributors) ? book.contributors : [],
        edition: book.edition || {},
        language: normalizeSegment(book.language),
        primary_category: categoryFor(book),
        tags: Array.isArray(book.tags) ? book.tags : [],
      },
      short_token: token,
      global_hashes: globalHashes,
      assets,
      sources: input.sources.map((source) => {
        const format = path.extname(new URL(source.origin_url || source.url, "https://local.invalid").pathname).slice(1).toLowerCase() || source.id;
        const asset = assets.find((candidate) => candidate.id === `source-${format}`);
        return sourceRecord(source, asset?.id || null, format, asset?.source_hashes || null, storageHost);
      }),
    };
    await writeJson(path.join(directory, "metadata.json"), metadata);
    searchItems.push([book.title, token]);
    shortRoutes[token] = canonicalPath;
    const [legacyFirst, legacySecond] = legacyBookSegments(book.id);
    legacyRoutes[`data/${legacyFirst}/${legacySecond}/${book.id}/`] = canonicalPath;
  }

  const indexRoot = path.join(dRoot, "_index");
  await writeJson(path.join(indexRoot, "search.json"), searchItems);
  await writeJson(path.join(indexRoot, "short.json"), shortRoutes);
  await writeJson(path.join(indexRoot, "legacy.json"), legacyRoutes);
  await writeJson(path.join(indexRoot, "manifest.json"), { schema_version: 1, books: inputs.length, next_counter: nextCounter, reserved_tokens: [], tombstones: [] });
  return { books: inputs.length, assets: publishedAssets, searchItems: searchItems.length };
}
