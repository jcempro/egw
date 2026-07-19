#!/usr/bin/env node
// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runMaintenance } from "./lib/egw-maintenance.mjs";

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
  let rejected = false;
  try { await runMaintenance({ root, stateRoot: temporary, reportRoot: temporary, sourceId: "epub", fetchImpl }); } catch { rejected = true; }
  if (!rejected) throw new Error("Seleção ambígua não foi rejeitada");
  process.stdout.write("MAINTENANCE_OK modos=3 integridade=sha1,sha256,sha512 idempotente=true\n");
} finally { await rm(temporary, { recursive: true, force: true }); }
