import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateCovers } from "./lib/egw-covers.mjs";
const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
generateCovers({ root: path.join(workspaceRoot, "src"), stateRoot: workspaceRoot, reportRoot: workspaceRoot }).then((report) => process.stdout.write(`CAPAS: total=${report.total} regeneradas=${report.regenerated} reutilizadas=${report.reused}\n`)).catch((error) => { process.stderr.write(`ERRO: ${error.message}\n`); process.exitCode = 1; });
