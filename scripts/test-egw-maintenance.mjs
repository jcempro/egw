#!/usr/bin/env node
// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { runMaintenance, verifyCandidate } from "./lib/egw-maintenance.mjs";
import { discoverProviderCandidates } from "./lib/egw-providers.mjs";

const execute = promisify(execFile);
const sevenZip = process.env.SEVEN_ZIP_BIN || (process.platform === "win32" ? "C:\\Program Files\\7-Zip\\7z.exe" : "7z");

const temporary = await mkdtemp(path.join(tmpdir(), "egw-maintenance-test-"));
const root = path.join(temporary, "src");
const bookId = "pt-br-livros-teste";
const metadataPath = path.join(root, "data", "books", bookId, "metadata.json");
const product = Buffer.from("conteudo editorial verificavel");
const origin = "https://media.example.org/book.epub";

try {
  await mkdir(path.join(root, "config"), { recursive: true });
  await mkdir(path.dirname(metadataPath), { recursive: true });
  await mkdir(path.join(root, "assets", "books", bookId), { recursive: true });
  await writeFile(path.join(root, "config", "build.json"), JSON.stringify({ public_origin: "https://fontes.example.org" }));
  await writeFile(path.join(root, "config", "egw-sources.json"), JSON.stringify({ schema_version: 1, limits: { default_daily_limit: 5, max_candidate_bytes: 4096, max_archive_entries: 8, request_timeout_ms: 1000 }, providers: [{ id: "editorial", enabled: true, kind: "origin-only", domains: ["media.example.org"], daily_limit: 5 }] }));
  await writeFile(path.join(root, "data", "catalog.json"), JSON.stringify({ schema_version: 1, books: [{ book_id: bookId, title: "Teste" }] }));
  await writeFile(path.join(root, "assets", "books", bookId, "source.epub"), product);
  await writeFile(metadataPath, JSON.stringify({ schema_version: 2, book: { id: bookId, title: "Teste" }, global_hashes: [], sources: [{ id: "epub", title: "Teste", url: `assets/books/${bookId}/source.epub`, origin_url: origin, type: "preserved-asset" }] }));
  const fetchImpl = async () => ({ ok: true, url: origin, headers: new Headers({ "content-length": String(product.length) }), arrayBuffer: async () => product });
  const first = await runMaintenance({ root, stateRoot: temporary, reportRoot: temporary, metadataPath, sourceId: "epub", providerId: "editorial", fetchImpl });
  const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
  if (first.mode !== "metadata" || first.added !== 1 || metadata.sources.length !== 2 || metadata.sources[1].url !== origin || metadata.sources[1].format !== "epub" || !metadata.sources[1].hashes.sha1) throw new Error("Descoberta específica ou matriz de integridade divergente");
  const second = await runMaintenance({ root, stateRoot: temporary, reportRoot: temporary, bookId, fetchImpl });
  if (second.added !== 0 || JSON.parse(await readFile(metadataPath, "utf8")).sources.length !== 2) throw new Error("Retomada idempotente divergente");
  const complete = await runMaintenance({ root, stateRoot: temporary, reportRoot: temporary, fetchImpl });
  if (complete.mode !== "all" || complete.added !== 0) throw new Error("Modo completo divergente");
  const archiveRoot = path.join(temporary, "archive"); await mkdir(archiveRoot); await writeFile(path.join(archiveRoot, "source.epub"), product);
  const expected = { epub: { sha1: createHash("sha1").update(product).digest("hex"), sha256: createHash("sha256").update(product).digest("hex"), sha512: createHash("sha512").update(product).digest("hex") } };
  for (const extension of ["zip", "7z"]) {
    const archivePath = path.join(temporary, `candidate.${extension}`); await execute(sevenZip, ["a", `-t${extension}`, archivePath, "source.epub"], { cwd: archiveRoot });
    const archiveBytes = await readFile(archivePath);
    const archiveUrl = `https://media.example.org/book.${extension}`;
    const archiveFetch = async () => ({ ok: true, url: archiveUrl, headers: new Headers({ "content-length": String(archiveBytes.length) }), arrayBuffer: async () => archiveBytes });
    const products = await verifyCandidate({ url: archiveUrl, provider: { domains: ["media.example.org"] }, expected, limits: { max_candidate_bytes: 4096, max_archive_entries: 8, request_timeout_ms: 1000 }, fetchImpl: archiveFetch });
    if (products.length !== 1 || products[0].format !== "epub") throw new Error(`Validação de contêiner ${extension.toUpperCase()} divergente`);
  }
  const fixtureLimits = { max_candidate_bytes: 4096, max_archive_entries: 8, request_timeout_ms: 1000 };
  const gcMetadata = { book: { id: "pt-br-livros-o-grande-conflito", title: "O Grande Conflito", language: "pt-BR" }, short_token: "gc" };
  const egwCandidates = await discoverProviderCandidates({
    provider: { id: "egw-writings", kind: "catalog-pattern", domains: ["egwwritings.org"], media_hosts: ["media4.egwwritings.org"], formats: ["pdf"], templates: ["https://media4.egwwritings.org/pdf/{lang}_{aliasUpper}({aliasUpper}).pdf", "https://media4.egwwritings.org/pdf/{lang}_{aliasUpper}.pdf"] },
    metadata: gcMetadata,
    source: { id: "pdf" },
    limits: fixtureLimits,
    fetchImpl,
  });
  if (!egwCandidates.includes("https://media4.egwwritings.org/pdf/pt_GC(GC).pdf") || !egwCandidates.includes("https://media4.egwwritings.org/pdf/pt_GC.pdf")) throw new Error("Relação EGW Writings/media host ou sigla entre parênteses divergente");
  const audioCandidates = await discoverProviderCandidates({
    provider: { id: "ellen-white-audio", kind: "catalog-pattern", domains: ["ellenwhiteaudio.org"], formats: ["pdf", "epub"], templates: ["https://ellenwhiteaudio.org/audio/{lang}/{aliasLower}/{titleEncoded}.{format}"] },
    metadata: { book: { id: "pt-br-livros-caminho-a-cristo", title: "Caminho a Cristo", language: "pt-BR" }, short_token: "cc" },
    source: { id: "sc", aliases: ["sc"] },
    limits: fixtureLimits,
    fetchImpl,
  });
  if (!audioCandidates.includes("https://ellenwhiteaudio.org/audio/pt/sc/Caminho%20a%20Cristo.pdf") || !audioCandidates.includes("https://ellenwhiteaudio.org/audio/pt/sc/Caminho%20a%20Cristo.epub")) throw new Error("Fixture Ellen White Audio com acento/percent-encoding divergente");
  const centroCandidates = await discoverProviderCandidates({
    provider: { id: "centro-white", kind: "catalog-pattern", domains: ["centrowhite.org.br"], media_hosts: ["cdn.centrowhite.org.br"], formats: ["pdf"], templates: ["https://cdn.centrowhite.org.br/home/uploads/2022/11/{titleSlugTitleCase}.pdf"] },
    metadata: { book: { id: "pt-br-livros-a-ciencia-do-bom-viver", title: "A Ciência do Bom Viver", language: "pt-BR" }, short_token: "cbv" },
    source: { id: "pdf" },
    limits: fixtureLimits,
    fetchImpl,
  });
  if (!centroCandidates.includes("https://cdn.centrowhite.org.br/home/uploads/2022/11/A-Ciencia-do-Bom-Viver.pdf")) throw new Error("Fixture Centro White/CDN divergente");
  let rejected = false;
  try { await runMaintenance({ root, stateRoot: temporary, reportRoot: temporary, sourceId: "epub", fetchImpl }); } catch { rejected = true; }
  if (!rejected) throw new Error("Seleção ambígua não foi rejeitada");
  process.stdout.write("MAINTENANCE_OK modos=3 formatos=pdf,epub,zip,7z integridade=sha1,sha256,sha512 idempotente=true\n");
} finally { await rm(temporary, { recursive: true, force: true }); }
