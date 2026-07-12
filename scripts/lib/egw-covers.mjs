import path from "node:path";
import { readFile } from "node:fs/promises";
import { ensureCover } from "./egw-cover.mjs";
import { json, writeAtomic } from "./egw-common.mjs";

export async function generateCovers({ root, stateRoot = root, reportRoot = stateRoot, concurrency = 4 } = {}) {
  const catalog = JSON.parse(await readFile(path.join(root, "data", "catalog.json"), "utf8")).books; const statePath = path.join(stateRoot, ".egw-state", "covers.json"); const reportPath = path.join(reportRoot, "build", "egw-covers-report.json"); let state; try { state = JSON.parse(await readFile(statePath, "utf8")); } catch { state = { schema_version: 1, completed: [] }; }
  const completed = new Set(state.completed); const report = { schema_version: 1, total: catalog.length, regenerated: 0, reused: 0, failed: [] }; let cursor = 0; let lock = Promise.resolve();
  async function checkpoint(bookId) { completed.add(bookId); state.completed = [...completed].sort(); lock = lock.then(() => writeAtomic(statePath, json(state))); await lock; }
  async function worker() { while (cursor < catalog.length) { const book = catalog[cursor++]; const directory = path.join(root, "assets", "books", book.book_id); try { const result = await ensureCover({ assetDirectory: directory, epub: path.join(directory, "source.epub"), pdf: path.join(directory, "source.pdf") }); report[result.reused ? "reused" : "regenerated"] += 1; await checkpoint(book.book_id); } catch (error) { report.failed.push({ book_id: book.book_id, error: error.message }); } } }
  await Promise.all(Array.from({ length: concurrency }, worker)); await writeAtomic(reportPath, json(report)); if (!report.failed.length) { state.completed = []; await writeAtomic(statePath, json(state)); }
  if (report.failed.length) throw new Error(`Falha ao gerar ${report.failed.length} capas`); return report;
}
