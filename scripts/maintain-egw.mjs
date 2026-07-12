import { fileURLToPath } from "node:url";
import path from "node:path";
import { runMaintenance } from "./lib/egw-maintenance.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const timeoutValue = process.argv.find((arg) => arg.startsWith("--timeout-ms="));
const timeout = timeoutValue ? Number(timeoutValue.split("=")[1]) : null;
if (timeoutValue && (!Number.isSafeInteger(timeout) || timeout <= 0)) throw new Error("--timeout-ms inválido");
async function main() {
  const report = await runMaintenance({ root: path.join(ROOT, "src"), stateRoot: ROOT, reportRoot: ROOT, timeoutMs: timeout });
  process.stdout.write(`MANUTENCAO: verificados=${report.checked} adicionados=${report.added} pendentes=${report.pending} timeout=${report.timeout}\n`); if (report.timeout) process.exitCode = 2;
}
main().catch((error) => { process.stderr.write(`ERRO: ${error.message}\n`); process.exitCode = 1; });
