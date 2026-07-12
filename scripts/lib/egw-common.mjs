import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { access, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
let atomicSequence = 0;
export async function exists(target) { try { await access(target); return true; } catch { return false; } }
export async function hashFile(target) {
  const sha256 = createHash("sha256"); const sha512 = createHash("sha512");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(target);
    stream.on("data", (chunk) => { sha256.update(chunk); sha512.update(chunk); });
    stream.on("error", reject); stream.on("end", resolve);
  });
  return { sha256: sha256.digest("hex"), sha512: sha512.digest("hex") };
}
export async function writeAtomic(target, content) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${process.pid}-${atomicSequence++}`;
  await writeFile(temporary, content); await rm(target, { force: true }); await rename(temporary, target);
}
export async function readJson(target) { return JSON.parse(await readFile(target, "utf8")); }
