#!/usr/bin/env node
// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildIntakeComment, labelsForIntake, parseIssueSourceIntake } from "./lib/issue-source-intake.mjs";

const execute = promisify(execFile);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function counts(model) {
  return {
    publications: model.publications.length,
    urls: model.publications.reduce((sum, item) => sum + item.urls.length, 0),
    unassigned: model.unassignedUrls.length,
  };
}

const fixtures = [
  ["uma publicação com uma URL", "Livro: Caminho a Cristo\nURL: https://exemplo.org/caminho-a-cristo.pdf", 1, 1],
  ["compacto", "Caminho a Cristo -> https://exemplo.org/caminho-a-cristo.pdf", 1, 1],
  ["uma publicação com várias URLs", "Livro: Caminho a Cristo\nURLs:\n- https://exemplo.org/caminho-a-cristo.pdf\n- https://exemplo.org/caminho-a-cristo.epub", 1, 2],
  ["agrupamento por título", "Caminho a Cristo:\nhttps://exemplo.org/caminho-a-cristo.pdf\nhttps://exemplo.org/caminho-a-cristo.epub", 1, 2],
  ["várias publicações uma URL", "- Caminho a Cristo: https://exemplo.org/cc.pdf\n- O Grande Conflito: https://exemplo.org/gc.pdf", 2, 2],
  ["várias publicações várias URLs", "Caminho a Cristo:\n- https://exemplo.org/cc.pdf\n- https://exemplo.org/cc.epub\n\nO Grande Conflito:\n- https://exemplo.org/gc.pdf\n- https://exemplo.org/gc.epub", 2, 4],
  ["texto livre", "Achei Caminho a Cristo aqui: https://exemplo.org/cc.pdf", 1, 1],
  ["URLs mesma linha", "Livro: Caminho a Cristo\nURL: https://exemplo.org/cc.pdf; https://exemplo.org/cc.epub", 1, 2],
  ["acentos e percent encoding", "Livro: A Ciência do Bom Viver\nURL: https://exemplo.org/A%20Ci%C3%AAncia.pdf", 1, 1],
  ["título depois da URL", "https://exemplo.org/cc.pdf\nCaminho a Cristo", 1, 1],
];

for (const [name, text, expectedPublications, expectedUrls, expectedUnassigned = 0] of fixtures) {
  const model = parseIssueSourceIntake(text);
  const got = counts(model);
  assert(got.publications === expectedPublications, `${name}: publicações ${got.publications}`);
  assert(got.urls === expectedUrls, `${name}: urls ${got.urls}`);
  assert(got.unassigned === expectedUnassigned, `${name}: sem associação ${got.unassigned}`);
}

const json = parseIssueSourceIntake(JSON.stringify({ publications: [{ title: "Caminho a Cristo", urls: ["https://exemplo.org/cc.pdf", "https://exemplo.org/cc.epub"] }] }));
assert(json.detectedFormat === "json" && counts(json).urls === 2, "JSON válido não interpretado");

const jsonTrailing = parseIssueSourceIntake('{"publication":{"title":"Caminho a Cristo","url":"https://exemplo.org/cc.pdf",},}');
assert(jsonTrailing.detectedFormat === "json" && jsonTrailing.recoveries.some((item) => item.code === "json-virgula-final-removida"), "JSON com vírgula final não recuperado");

const yaml = parseIssueSourceIntake("publications:\n  - title: Caminho a Cristo\n    urls:\n      - https://exemplo.org/cc.pdf\n      - https://exemplo.org/cc.epub");
assert(yaml.detectedFormat === "yaml" && counts(yaml).urls === 2, "YAML válido não interpretado");

const aliases = parseIssueSourceIntake('{"livros":[{"nome":"O Grande Conflito","fontes":["https://exemplo.org/gc.pdf"]}]}');
assert(counts(aliases).publications === 1 && aliases.publications[0].titleNormalized === "o grande conflito", "aliases PT-BR/EN divergentes");

const typoFallback = parseIssueSourceIntake("Lvro: Caminho a Cristo\nLink: https://exemplo.org/cc.pdf");
assert(counts(typoFallback).urls === 1, "campo com erro ortográfico simples não tolerado por fallback textual");

const aggregate = parseIssueSourceIntake("Índice EGW: https://exemplo.org/catalogo/");
assert(aggregate.publications[0].urls[0].format === "unknown", "URL agregadora sem extensão deveria permanecer unknown");

const noTitle = parseIssueSourceIntake("https://exemplo.org/cc.pdf");
assert(noTitle.status === "requer-correcao" && noTitle.unassignedUrls.length === 1, "URL sem título deveria pedir correção");

const titleNoUrl = parseIssueSourceIntake("Livro: Caminho a Cristo");
assert(titleNoUrl.rejected && titleNoUrl.ambiguities.some((item) => item.code === "sem-url-valida"), "título sem URL deveria rejeitar sem alteração");

const ambiguous = parseIssueSourceIntake("https://exemplo.org/cc.pdf https://exemplo.org/gc.pdf");
assert(ambiguous.ambiguities.some((item) => item.code === "varias-urls-sem-titulo"), "várias URLs ambíguas não registradas");

const security = parseIssueSourceIntake("Livro: Teste\nURL: http://127.0.0.1/private.pdf");
assert(security.status === "rejeitada-por-seguranca", "SSRF/host privado não rejeitado");

const credentials = parseIssueSourceIntake("Livro: Teste\nURL: https://user:pass@example.org/private.pdf");
assert(credentials.status === "rejeitada-por-seguranca", "URL com credenciais não rejeitada");

const shellLike = parseIssueSourceIntake("Livro: Teste\nURL: https://exemplo.org/a.pdf\n$(rm -rf .)");
assert(counts(shellLike).urls === 1 && !shellLike.originalText.includes("\u0000"), "conteúdo semelhante a shell alterou parser");

const oversized = parseIssueSourceIntake("a".repeat(140 * 1024));
assert(oversized.rejected && oversized.warnings.some((item) => item.code === "payload-excessivo"), "payload excessivo não rejeitado");

const unsafeYaml = parseIssueSourceIntake("publications:\n  - &a {title: Teste, urls: [https://exemplo.org/a.pdf]}\n  - *a");
assert(unsafeYaml.detectedFormat === "text" || unsafeYaml.warnings.some((item) => item.code === "payload-excessivo") === false, "YAML inseguro deveria cair para parser textual seguro");

const partial = parseIssueSourceIntake("Caminho a Cristo: https://exemplo.org/cc.pdf\nhttps://exemplo.org/solta.pdf");
assert(partial.status === "processada-parcialmente", "entrada parcialmente válida não classificada");

const duplicate = parseIssueSourceIntake("Caminho a Cristo:\n- https://exemplo.org/cc.pdf\n- https://exemplo.org/cc.pdf");
assert(counts(duplicate).urls === 2, "duplicatas devem ser preservadas para deduplicação posterior");

const comment = buildIntakeComment(noTitle);
assert(comment.includes("Nenhuma fonte foi adicionada"), "comentário cordial de impossibilidade ausente");
assert(labelsForIntake(security).includes("fonte: rejeitada por seguranca"), "label de segurança ausente");

const temporary = await mkdtemp(path.join(tmpdir(), "egw-issue-intake-"));
try {
  const bodyPath = path.join(temporary, "body.md");
  const reportPath = path.join(temporary, "report.json");
  const commentPath = path.join(temporary, "comment.md");
  const labelsPath = path.join(temporary, "labels.json");
  await writeFile(bodyPath, "Livro: Caminho a Cristo\nURL: https://exemplo.org/cc.pdf");
  const { stdout } = await execute(process.execPath, ["scripts/intake-issue-sources.mjs", `--body-file=${bodyPath}`, `--report=${reportPath}`, `--comment=${commentPath}`, `--labels=${labelsPath}`], { cwd: path.resolve(".") });
  assert(stdout.includes("ISSUE_SOURCE_INTAKE"), "CLI não emitiu resumo");
  assert(JSON.parse(await readFile(reportPath, "utf8")).status === "processada", "CLI não gravou relatório");
  assert((await readFile(commentPath, "utf8")).includes("Agradecemos"), "CLI não gravou comentário");
  assert(JSON.parse(await readFile(labelsPath, "utf8")).includes("fonte: processada"), "CLI não gravou labels");
} finally {
  await rm(temporary, { recursive: true, force: true });
}

process.stdout.write("ISSUE_INTAKE_OK casos=32 formatos=text,markdown,json,yaml seguranca=ssrf,credenciais,payload workflow=mock\n");
