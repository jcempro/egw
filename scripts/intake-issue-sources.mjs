#!/usr/bin/env node
// JeanCarloEM — https://www.jeancarloem.com — https://github.com/jcempro/egw
// MPL-2.0 — https://www.mozilla.org/MPL/2.0/ — uso sob a Mozilla Public License 2.0.

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildIntakeComment, labelsForIntake, parseIssueSourceIntake } from "./lib/issue-source-intake.mjs";

function argument(name) {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix));
  return value ? value.slice(prefix.length) : null;
}

async function readInput() {
  const eventPath = argument("event");
  if (eventPath) {
    const event = JSON.parse(await readFile(eventPath, "utf8"));
    return {
      body: event.issue?.body || "",
      issue: {
        id: event.issue?.id || null,
        number: event.issue?.number || null,
        revision: event.issue?.updated_at || event.issue?.created_at || null,
      },
    };
  }
  const bodyPath = argument("body-file");
  if (bodyPath) return { body: await readFile(bodyPath, "utf8"), issue: { id: argument("issue-id"), number: argument("issue-number"), revision: argument("revision") } };
  return { body: await new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { data += chunk; });
    process.stdin.on("end", () => resolve(data));
  }), issue: { id: argument("issue-id"), number: argument("issue-number"), revision: argument("revision") } };
}

async function writeJson(target, value) {
  if (!target) return;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(value, null, 2)}\n`);
}

async function writeText(target, value) {
  if (!target) return;
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, value.endsWith("\n") ? value : `${value}\n`);
}

const input = await readInput();
const model = parseIssueSourceIntake(input.body, { issue: input.issue });
const comment = buildIntakeComment(model);
const labels = labelsForIntake(model);

await writeJson(argument("report"), model);
await writeText(argument("comment"), comment);
await writeJson(argument("labels"), labels);

const totalUrls = model.publications.reduce((sum, item) => sum + item.urls.length, 0) + model.unassignedUrls.length;
process.stdout.write(`ISSUE_SOURCE_INTAKE status=${model.status} publications=${model.publications.length} urls=${totalUrls} ambiguities=${model.ambiguities.length} recoveries=${model.recoveries.length}\n`);
