import { execFile, spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { inflateRawSync } from "node:zlib";
import { promisify } from "node:util";
import { exists } from "./egw-common.mjs";

function entryMap(buffer) {
  let eocd = -1; for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset -= 1) if (buffer.readUInt32LE(offset) === 0x06054b50) { eocd = offset; break; }
  if (eocd < 0) throw new Error("EPUB sem diretório ZIP central");
  const entries = new Map(); let offset = buffer.readUInt32LE(eocd + 16);
  for (let index = 0; index < buffer.readUInt16LE(eocd + 10); index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("EPUB com índice ZIP inválido");
    const nameLength = buffer.readUInt16LE(offset + 28); const extraLength = buffer.readUInt16LE(offset + 30); const commentLength = buffer.readUInt16LE(offset + 32);
    entries.set(buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8"), { compression: buffer.readUInt16LE(offset + 10), size: buffer.readUInt32LE(offset + 20), local: buffer.readUInt32LE(offset + 42) });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { read(name) { const item = entries.get(name); if (!item) return null; const local = item.local; const nameLength = buffer.readUInt16LE(local + 26); const extraLength = buffer.readUInt16LE(local + 28); const data = buffer.subarray(local + 30 + nameLength + extraLength, local + 30 + nameLength + extraLength + item.size); return item.compression === 8 ? inflateRawSync(data) : data; } };
}
function attr(tag, name) { return new RegExp(`\\b${name}=["']([^"']+)["']`, "i").exec(tag)?.[1] || null; }
function zipPath(base, href) { const result = path.posix.normalize(path.posix.join(base, href)).replace(/^\/+/, ""); if (!result || result.startsWith("../")) throw new Error("Caminho EPUB inseguro"); return result; }
export async function epubCover(epub) {
  const archive = entryMap(await readFile(epub)); const container = archive.read("META-INF/container.xml")?.toString("utf8"); const opfPath = /<rootfile\b[^>]*\bfull-path=["']([^"']+)["']/i.exec(container || "")?.[1];
  if (!opfPath) throw new Error("EPUB sem pacote OPF"); const opf = archive.read(opfPath)?.toString("utf8") || ""; const base = path.posix.dirname(opfPath); const items = [...opf.matchAll(/<item\b[^>]*>/gi)].map(([tag]) => ({ id: attr(tag, "id"), href: attr(tag, "href"), properties: attr(tag, "properties") || "", media: attr(tag, "media-type") || "" }));
  const coverId = /<meta\b[^>]*\bname=["']cover["'][^>]*\bcontent=["']([^"']+)["']/i.exec(opf)?.[1]; const item = items.find((entry) => entry.id === coverId || /\bcover-image\b/.test(entry.properties) || /image\//.test(entry.media));
  if (!item?.href) throw new Error("EPUB sem imagem de capa"); const cover = archive.read(zipPath(base, item.href)); if (!cover) throw new Error("Imagem de capa EPUB ausente"); return cover;
}
async function pdfToPpmBinary() {
  if (globalThis.process.platform !== "win32") return "pdftoppm";
  if (globalThis.process.env.PDFTOPPM_BIN && await exists(globalThis.process.env.PDFTOPPM_BIN)) return globalThis.process.env.PDFTOPPM_BIN;
  const located = (await promisify(execFile)("where.exe", ["pdftoppm"])).stdout.split(/\r?\n/).find((item) => item.toLowerCase().endsWith(".cmd"));
  const binary = located && path.resolve(path.dirname(located), "..", "..", "native", "poppler", "Library", "bin", "pdftoppm.exe");
  if (!binary || !(await exists(binary))) throw new Error("pdftoppm não encontrado; defina PDFTOPPM_BIN");
  return binary;
}
async function pdftoppm(source, destinationBase) { const binary = await pdfToPpmBinary(); return new Promise((resolve, reject) => { const child = spawn(binary, ["-f", "1", "-l", "1", "-singlefile", "-png", "-scale-to", "800", source, destinationBase], { windowsHide: true }); child.on("error", reject); child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`pdftoppm encerrou com código ${code}`))); }); }
async function optimize(input, output) { await sharp(input).rotate().resize({ width: 800, height: 800, fit: "inside", withoutEnlargement: true }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(output); }
export async function ensureCover({ assetDirectory, epub, pdf, force = false }) {
  const target = path.join(assetDirectory, "cover.png");
  if (!force && await exists(target)) { const meta = await sharp(target).metadata(); if (meta.format === "png" && Math.max(meta.width || 0, meta.height || 0) <= 800) return { target, reused: true }; }
  await mkdir(assetDirectory, { recursive: true }); const temporary = `${target}.tmp-${process.pid}.png`;
  try { let extracted = false; if (epub) try { await optimize(await epubCover(epub), temporary); extracted = true; } catch (error) { if (!pdf) throw error; } if (!extracted && pdf) { const base = path.join(assetDirectory, `.cover-${process.pid}`); await pdftoppm(pdf, base); await optimize(`${base}.png`, temporary); await rm(`${base}.png`, { force: true }); } if (!extracted && !pdf) throw new Error("Livro sem PDF ou EPUB para capa"); await rm(target, { force: true }); await writeFile(target, await readFile(temporary)); return { target, reused: false }; } finally { await rm(temporary, { force: true }); }
}
export async function validCover(target) { try { const meta = await sharp(target).metadata(); return meta.format === "png" && Boolean(meta.width) && Boolean(meta.height) && Math.max(meta.width, meta.height) <= 800; } catch { return false; } }
