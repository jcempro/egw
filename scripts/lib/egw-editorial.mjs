// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { readFile } from "node:fs/promises";
import { epubPackage } from "./egw-cover.mjs";

function text(value) {
  return String(value || "").replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16))).replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).replace(/&(amp|quot|apos|lt|gt|nbsp);/gi, (_, entity) => ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " })[entity.toLowerCase()]).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function cleanAuthor(value) {
  return text(value).replace(/^(?:by|por|autor(?:a)?|author)\s*[:\-]?\s*/i, "").replace(/\s+/g, " ").trim();
}

function validAuthor(value) {
  return value.length >= 4 && value.length <= 120 && /\p{L}/u.test(value) && !/copyright|estate|publisher|editora|unknown|desconhecid/i.test(value);
}

function decodePdfString(value) {
  if (value.startsWith("\\376\\377")) {
    const bytes = []; for (let index = 0; index < value.length;) { const octal = /^\\([0-7]{3})/.exec(value.slice(index)); if (octal) { bytes.push(Number.parseInt(octal[1], 8)); index += 4; } else { bytes.push(value.charCodeAt(index)); index += 1; } }
    return Buffer.from(bytes.slice(2)).swap16().toString("utf16le");
  }
  return value.replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(Number.parseInt(octal, 8))).replace(/\\([()\\])/g, "$1");
}

async function epubEvidence(target) {
  const { opf } = await epubPackage(target); const authors = [...opf.matchAll(/<(?:dc:)?creator\b[^>]*>([\s\S]*?)<\/(?:dc:)?creator>/gi)].map((match) => cleanAuthor(match[1])).filter(validAuthor);
  const title = text(/<(?:dc:)?title\b[^>]*>([\s\S]*?)<\/(?:dc:)?title>/i.exec(opf)?.[1]);
  return { authors: [...new Set(authors)], title, source: "epub-opf" };
}

async function pdfEvidence(target) {
  const raw = (await readFile(target)).toString("latin1"); const candidates = [...raw.matchAll(/\/Author\(((?:\\.|[^)])*)\)/g)].map((match) => cleanAuthor(decodePdfString(match[1]))).filter(validAuthor);
  return { authors: [...new Set(candidates)], title: "", source: "pdf-document-info" };
}

export function splitTitleQualifier(title) {
  const match = /^(.*?)\s*\(([^()]+)\)\s*$/u.exec(title.trim());
  if (!match || !/condensad|abridg|adaptad|resum|edi[cç][aã]o|edition|vers[aã]o|version/i.test(match[2])) return { title: title.trim(), qualifier: null };
  return { title: match[1].trim(), qualifier: match[2].trim() };
}

export async function extractEditorial({ epub = null, pdf = null, fallbackTitle }) {
  const evidence = []; const errors = []; if (epub) try { evidence.push(await epubEvidence(epub)); } catch (error) { errors.push(error.message); } if (pdf) try { evidence.push(await pdfEvidence(pdf)); } catch (error) { errors.push(error.message); }
  const authors = [...new Set(evidence.flatMap((item) => item.authors).map((author) => author.normalize("NFC")))];
  if (!authors.length) throw new Error(`Autoria editorial não encontrada em evidência interna: ${fallbackTitle}${errors.length ? ` (${errors.join("; ")})` : ""}`);
  if (authors.length > 1) throw new Error(`Autoria editorial conflitante (${authors.join(" | ")}): ${fallbackTitle}`);
  const declaredTitle = evidence.find((item) => item.title)?.title || fallbackTitle; const identity = splitTitleQualifier(declaredTitle);
  return { author: authors[0], qualifier: identity.qualifier, evidence: evidence.filter((item) => item.authors.length).map((item) => item.source) };
}
