#!/usr/bin/env node
// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { fileURLToPath } from "node:url";
import path from "node:path";
import { runMaintenance } from "./lib/egw-maintenance.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function argument(name) { const prefix = `--${name}=`; const value = process.argv.find((item) => item.startsWith(prefix)); return value ? value.slice(prefix.length) : null; }
const timeoutValue = argument("timeout-ms");
const timeout = timeoutValue === null ? null : Number(timeoutValue);
if (timeoutValue !== null && (!Number.isSafeInteger(timeout) || timeout <= 0)) throw new Error("--timeout-ms inválido");

async function main() {
  const report = await runMaintenance({
    root: path.join(ROOT, "src"), stateRoot: ROOT, reportRoot: ROOT, timeoutMs: timeout,
    bookId: argument("book"), metadataPath: argument("metadata"), sourceId: argument("source"), providerId: argument("provider"),
  });
  process.stdout.write(`MANUTENCAO: modo=${report.mode} verificados=${report.checked} adicionados=${report.added} pendentes=${report.pending} timeout=${report.timeout} razao=${report.reason}\n`);
  if (report.timeout) process.exitCode = 2;
  else if (report.reason === "partial-failure") process.exitCode = 2;
}
main().catch((error) => { process.stderr.write(`ERRO: ${error.message}\n`); process.exitCode = 1; });
