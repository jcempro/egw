#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";
import { validCover } from "./lib/egw-cover.mjs";
import { generateCovers } from "./lib/egw-covers.mjs";
import { runMaintenance } from "./lib/egw-maintenance.mjs";
import { extractEditorial } from "./lib/egw-editorial.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const APP_ROOT = path.join(ROOT, "src");
const INPUT_ROOT = path.join(APP_ROOT, "egw");
const ASSET_ROOT = path.join(APP_ROOT, "assets", "books");
const BOOK_ROOT = path.join(APP_ROOT, "data", "books");
const CATALOG_PATH = path.join(APP_ROOT, "data", "catalog.json");
const REPORT_PATH = path.join(ROOT, "build", "egw-import-report.json");
const CHECK_ONLY = process.argv.includes("--check");
const AUDIT_TEXT = process.argv.includes("--audit-text");
const DISCOVER = !CHECK_ONLY && !process.argv.includes("--skip-discovery");
const POSIX = (value) => value.split(path.sep).join("/");

function fail(message) {
  throw new Error(message);
}

function json(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function listFiles(directory) {
  const result = [];
  async function visit(current) {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name, "en"))) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(target);
      else if (entry.isFile()) result.push(target);
    }
  }
  await visit(directory);
  return result;
}

async function hashFile(target) {
  const sha256 = createHash("sha256");
  const sha512 = createHash("sha512");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(target);
    stream.on("data", (chunk) => {
      sha256.update(chunk);
      sha512.update(chunk);
    });
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return { sha256: sha256.digest("hex"), sha512: sha512.digest("hex") };
}

function stemFromManifest(target) {
  const name = path.basename(target);
  if (!name.endsWith(".source.json")) fail(`Manifesto inválido: ${target}`);
  return name.slice(0, -".source.json".length);
}

function slug(value) {
  const normalized = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "obra";
}

function safeRelativeAsset(value) {
  const parts = value.split("/");
  return parts.length >= 4 && parts[0] === "assets" && parts[1] === "books" && /\.(?:pdf|epub)$/i.test(parts.at(-1)) && parts.every((part) => part && part !== "." && part !== ".." && !/[\u0000-\u001f]/.test(part));
}

function validOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function parseManifest(raw, manifestPath) {
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    fail(`Manifesto JSON inválido (${manifestPath}): ${error.message}`);
  }
  if (!isRecord(manifest)) fail(`Manifesto sem objeto raiz: ${manifestPath}`);
  const entries = new Map();
  for (const [originUrl, source] of Object.entries(manifest)) {
    if (!validOrigin(originUrl) || !isRecord(source) || !/^[a-f0-9]{64}$/.test(source.sha256 || "")) {
      fail(`Manifesto inválido em ${manifestPath}: ${originUrl}`);
    }
    const extension = path.extname(new URL(originUrl).pathname).toLowerCase();
    if (extension !== ".pdf" && extension !== ".epub") fail(`Formato de origem não permitido em ${manifestPath}: ${originUrl}`);
    if (entries.has(extension)) fail(`Manifesto ambíguo para ${extension} em ${manifestPath}`);
    entries.set(extension, { originUrl, sha256: source.sha256 });
  }
  if (!entries.size) fail(`Manifesto sem artefato em ${manifestPath}`);
  return entries;
}

function zipEntries(buffer) {
  const start = Math.max(0, buffer.length - 65557);
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= start; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) fail("EPUB sem diretório ZIP central");
  const count = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  let offset = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) fail("Entrada ZIP central inválida");
    const compression = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    entries.set(name, { compression, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return {
    read(name) {
      const entry = entries.get(name);
      if (!entry) return null;
      const local = entry.localOffset;
      if (buffer.readUInt32LE(local) !== 0x04034b50) fail(`Entrada ZIP local inválida: ${name}`);
      const flags = buffer.readUInt16LE(local + 6);
      if (flags & 1) fail(`EPUB criptografado: ${name}`);
      const nameLength = buffer.readUInt16LE(local + 26);
      const extraLength = buffer.readUInt16LE(local + 28);
      const data = buffer.subarray(local + 30 + nameLength + extraLength, local + 30 + nameLength + extraLength + entry.compressedSize);
      if (entry.compression === 0) return data;
      if (entry.compression === 8) return inflateRawSync(data);
      fail(`Compressão EPUB não suportada (${entry.compression}): ${name}`);
    },
  };
}

function resolveZipPath(base, relative) {
  const combined = path.posix.normalize(path.posix.join(base, relative)).replace(/^\/+/, "");
  if (!combined || combined === ".." || combined.startsWith("../")) fail(`Caminho EPUB inseguro: ${relative}`);
  return combined;
}

function attribute(tag, name) {
  const match = new RegExp(`\\b${name}=["']([^"']*)["']`, "i").exec(tag);
  return match ? match[1] : null;
}

function readableText(markup) {
  return markup
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&(nbsp|amp|lt|gt|quot|apos);/gi, (_, entity) => ({ nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[entity.toLowerCase()])
    .replace(/\s+/g, " ")
    .trim();
}

async function epubFingerprint(target) {
  const archive = zipEntries(await readFile(target));
  const container = archive.read("META-INF/container.xml");
  if (!container) fail(`EPUB sem container.xml: ${target}`);
  const rootfile = /<rootfile\b[^>]*\bfull-path=["']([^"']+)["']/i.exec(container.toString("utf8"));
  if (!rootfile) fail(`EPUB sem pacote OPF: ${target}`);
  const opfPath = rootfile[1];
  const opf = archive.read(opfPath);
  if (!opf) fail(`EPUB sem OPF indicado: ${target}`);
  const opfText = opf.toString("utf8");
  const manifest = new Map();
  for (const tag of opfText.match(/<item\b[^>]*>/gi) || []) {
    const id = attribute(tag, "id");
    const href = attribute(tag, "href");
    if (id && href) manifest.set(id, href);
  }
  const base = path.posix.dirname(opfPath);
  const sections = [];
  for (const tag of opfText.match(/<itemref\b[^>]*>/gi) || []) {
    const idref = attribute(tag, "idref");
    const href = manifest.get(idref);
    if (!href) fail(`EPUB com spine sem manifesto: ${target}`);
    const item = archive.read(resolveZipPath(base, href));
    if (!item) fail(`EPUB com capítulo ausente: ${target}`);
    sections.push(readableText(item.toString("utf8")));
  }
  const text = sections.filter(Boolean).join("\n");
  if (!text) fail(`EPUB sem texto legível: ${target}`);
  return createHash("sha512").update(text.normalize("NFC")).digest("hex");
}

async function writeAtomic(target, content) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  await writeFile(temporary, content);
  await rm(target, { force: true });
  await rename(temporary, target);
}

async function copyAsset(source, target, expectedSha512) {
  if (await exists(target)) {
    const existing = await hashFile(target);
    if (existing.sha512 === expectedSha512) return "reused";
  }
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}`;
  await copyFile(source, temporary);
  const copied = await hashFile(temporary);
  if (copied.sha512 !== expectedSha512) {
    await rm(temporary, { force: true });
    fail(`Cópia divergente: ${source}`);
  }
  await rm(target, { force: true });
  await rename(temporary, target);
  return "copied";
}

async function buildGroups() {
  if (!(await exists(INPUT_ROOT))) fail("Diretório de entrada ausente: src/egw/");
  const files = await listFiles(INPUT_ROOT);
  const manifests = files.filter((target) => target.endsWith(".source.json"));
  const artifacts = files.filter((target) => [".pdf", ".epub"].includes(path.extname(target).toLowerCase()));
  const artifactByGroup = new Map();
  for (const artifact of artifacts) {
    const key = `${path.dirname(artifact)}\u0000${path.basename(artifact, path.extname(artifact))}`;
    if (!artifactByGroup.has(key)) artifactByGroup.set(key, new Map());
    const extension = path.extname(artifact).toLowerCase();
    if (artifactByGroup.get(key).has(extension)) fail(`Artefato duplicado: ${artifact}`);
    artifactByGroup.get(key).set(extension, artifact);
  }
  const manifestByGroup = new Map();
  for (const manifestPath of manifests) {
    const stem = stemFromManifest(manifestPath);
    const directory = path.dirname(manifestPath);
    const key = `${directory}\u0000${stem}`;
    if (manifestByGroup.has(key)) fail(`Manifesto duplicado: ${manifestPath}`);
    manifestByGroup.set(key, manifestPath);
  }
  for (const key of manifestByGroup.keys()) if (!artifactByGroup.has(key)) fail(`Manifesto sem artefato local: ${manifestByGroup.get(key)}`);
  const groups = [...artifactByGroup.entries()].map(([key, local]) => {
    const separator = key.lastIndexOf("\u0000");
    return { manifestPath: manifestByGroup.get(key) || null, directory: key.slice(0, separator), stem: key.slice(separator + 1), key, local };
  }).sort((left, right) => POSIX(path.relative(INPUT_ROOT, left.manifestPath || left.local.values().next().value)).localeCompare(POSIX(path.relative(INPUT_ROOT, right.manifestPath || right.local.values().next().value)), "en"));
  return groups;
}

async function main() {
  const groups = await buildGroups();
  const usedIds = new Set();
  const catalog = [];
  const report = { schema_version: 1, check_only: CHECK_ONLY, text_audit: AUDIT_TEXT, groups: [], summary: { books: 0, assets: 0, covers: 0, copied: 0, reused: 0, pdf_only: 0, epub_only: 0 } };
  for (const group of groups) {
    const relativeDirectory = POSIX(path.relative(INPUT_ROOT, group.directory));
    const segments = relativeDirectory.split("/");
    const language = segments[0];
    if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(language)) fail(`Idioma BCP 47 inválido: ${relativeDirectory}`);
    const baseId = slug([...segments, group.stem].join("-"));
    let bookId = baseId;
    let duplicate = 2;
    while (usedIds.has(bookId)) bookId = `${baseId}-${duplicate++}`;
    usedIds.add(bookId);
    const manifest = group.manifestPath ? parseManifest(await readFile(group.manifestPath, "utf8"), group.manifestPath) : null;
    const formats = [...group.local.keys()].sort((left, right) => left.localeCompare(right));
    if (manifest) {
      for (const extension of manifest.keys()) if (!group.local.has(extension)) fail(`Origem sem artefato local (${extension}): ${group.manifestPath}`);
    }
    const sources = [];
    const globalHashes = [];
    const editorial = await extractEditorial({ epub: group.local.get(".epub") || null, pdf: group.local.get(".pdf") || null, fallbackTitle: group.stem });
    const groupReport = { book_id: bookId, input: `${relativeDirectory}/${group.stem}`, formats, provenance: manifest ? "remote-manifest" : "local-input", text_audit: AUDIT_TEXT ? "requested" : "not-requested", text_fingerprint: null, status: "valid" };
    for (const extension of formats) {
      const sourcePath = group.local.get(extension);
      const origin = manifest ? manifest.get(extension) : null;
      const hashes = await hashFile(sourcePath);
      if (origin && hashes.sha256 !== origin.sha256) fail(`SHA-256 de entrada divergente: ${POSIX(path.relative(INPUT_ROOT, sourcePath))}`);
      const format = extension.slice(1);
      const assetPath = `assets/books/${bookId}/source.${format}`;
      if (!safeRelativeAsset(assetPath)) fail(`Caminho de asset inválido: ${assetPath}`);
      sources.push({ id: format, title: `${group.stem} (${format.toUpperCase()})`, url: assetPath, origin_url: origin ? origin.originUrl : null, type: "preserved-asset", hash: { algorithm: "SHA-512", value: hashes.sha512 } });
      globalHashes.push({ label: `Artefato ${format.toUpperCase()}`, format, algorithm: "SHA-512", value: hashes.sha512 });
      groupReport[format] = { input_sha256: hashes.sha256, output_sha512: hashes.sha512 };
      if (!origin) groupReport[format].provenance = "local-input";
    }
    if (AUDIT_TEXT && group.local.has(".epub")) {
      try {
        groupReport.text_fingerprint = await epubFingerprint(group.local.get(".epub"));
      } catch (error) {
        groupReport.status = "epub-fingerprint-unavailable";
        groupReport.text_fingerprint_error = error.message;
      }
    }
    if (!group.local.has(".epub")) groupReport.status = "pdf-only";
    if (group.local.size === 1 && group.local.has(".epub")) groupReport.status = "epub-only";
    const coverPath = `assets/books/${bookId}/cover.png`;
    const metadata = { schema_version: 2, book: { id: bookId, title: group.stem, contributors: [{ name: editorial.author, role: "author" }], edition: editorial.qualifier ? { qualifier: editorial.qualifier } : {}, language, cover: coverPath }, global_hashes: globalHashes, sources };
    const metadataPath = path.join(BOOK_ROOT, bookId, "metadata.json");
    const assetDirectory = path.join(ASSET_ROOT, bookId);
    const expectedAssetNames = new Set([...sources.map((source) => path.basename(source.url)), "cover.png"]);
    let action = "checked";
    if (CHECK_ONLY) {
      for (const source of sources) {
        const asset = path.join(APP_ROOT, ...source.url.split("/"));
        if (!(await exists(asset)) || (await hashFile(asset)).sha512 !== source.hash.value) fail(`Asset ausente ou divergente: ${source.url}`);
      }
      if (!(await exists(metadataPath)) || (await readFile(metadataPath, "utf8")) !== json(metadata)) fail(`Metadado ausente ou divergente: ${bookId}`);
      const produced = await readdir(assetDirectory, { withFileTypes: true });
      if (produced.some((entry) => !entry.isFile() || !expectedAssetNames.has(entry.name)) || produced.length !== expectedAssetNames.size || !(await validCover(path.join(assetDirectory, "cover.png")))) fail(`Diretório de assets divergente: ${bookId}`);
      report.summary.covers += 1;
    } else {
      for (const source of sources) {
        const sourcePath = group.local.get(`.${source.id}`);
        const target = path.join(APP_ROOT, ...source.url.split("/"));
        const result = await copyAsset(sourcePath, target, source.hash.value);
        report.summary[result] += 1;
      }
      const produced = await readdir(assetDirectory, { withFileTypes: true });
      for (const entry of produced) if (entry.isFile() && !expectedAssetNames.has(entry.name)) await rm(path.join(assetDirectory, entry.name), { force: true });
      await writeAtomic(metadataPath, json(metadata));
      action = "written";
    }
    groupReport.action = action;
    report.groups.push(groupReport);
    report.summary.books += 1;
    report.summary.assets += sources.length;
    if (groupReport.status === "pdf-only") report.summary.pdf_only += 1;
    if (groupReport.status === "epub-only") report.summary.epub_only += 1;
    groupReport.editorial = editorial;
    catalog.push({ book_id: bookId, title: group.stem, author: editorial.author, url: `livro/${bookId}/` });
  }
  const catalogContent = json({ schema_version: 1, books: catalog });
  if (CHECK_ONLY) {
    if (!(await exists(CATALOG_PATH)) || (await readFile(CATALOG_PATH, "utf8")) !== catalogContent) fail("Catálogo ausente ou divergente");
  } else { await writeAtomic(CATALOG_PATH, catalogContent); report.summary.covers = (await generateCovers({ root: APP_ROOT, stateRoot: ROOT, reportRoot: ROOT })).total; }
  if (DISCOVER) await runMaintenance({ root: APP_ROOT, stateRoot: ROOT, reportRoot: ROOT });
  await writeAtomic(REPORT_PATH, json(report));
  process.stdout.write(`${CHECK_ONLY ? "VALIDADO" : "IMPORTADO"}: livros=${report.summary.books} assets=${report.summary.assets} capas=${report.summary.covers} copiados=${report.summary.copied} reutilizados=${report.summary.reused} pdf_sem_epub=${report.summary.pdf_only} epub_sem_pdf=${report.summary.epub_only}\n`);
}

main().catch((error) => {
  process.stderr.write(`ERRO: ${error.message}\n`);
  process.exitCode = 1;
});
