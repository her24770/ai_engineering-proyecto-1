/* global console, process, setTimeout */

import { execFileSync } from "node:child_process";
import { EVAL_CASES } from "./cases.mjs";
import { evaluateCase } from "./evaluator.mjs";
import { requestAgentWithRetry } from "./sseClient.mjs";
import { summarize, writeReports } from "./report.mjs";

const baseUrl = (process.env.EVAL_BASE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const endpoint = `${baseUrl}/api/chat`;
const delayMs = Number(process.env.EVAL_DELAY_MS ?? "35000");
const timeoutMs = Number(process.env.EVAL_TIMEOUT_MS ?? "60000");
const retries = Number(process.env.EVAL_RETRIES ?? "1");
const retryDelayMs = Number(process.env.EVAL_RETRY_DELAY_MS ?? "60000");
const outputPrefix = process.env.EVAL_OUTPUT ?? "evals/results/latest";
const model = process.env.EVAL_MODEL ?? "no especificado";
const targetCommit = process.env.EVAL_TARGET_COMMIT ?? "no especificado";
const requestedIds = new Set(
  (process.env.EVAL_CASE_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);
const cases = requestedIds.size
  ? EVAL_CASES.filter((evalCase) => requestedIds.has(evalCase.id))
  : EVAL_CASES;

if (
  !Number.isFinite(delayMs) ||
  delayMs < 0 ||
  !Number.isFinite(timeoutMs) ||
  timeoutMs <= 0
) {
  throw new Error("EVAL_DELAY_MS y EVAL_TIMEOUT_MS deben ser números válidos");
}
if (cases.length === 0) {
  throw new Error("EVAL_CASE_IDS no coincide con ningún caso conocido");
}
if (!Number.isInteger(retries) || retries < 0 || retryDelayMs < 0) {
  throw new Error("EVAL_RETRIES y EVAL_RETRY_DELAY_MS deben ser números válidos");
}

function currentCommit() {
  try {
    const safeDirectory = process.cwd().replaceAll("\\", "/");
    return execFileSync(
      "git",
      ["-c", `safe.directory=${safeDirectory}`, "rev-parse", "HEAD"],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      },
    ).trim();
  } catch {
    return "no disponible";
  }
}

const results = [];
for (const [index, evalCase] of cases.entries()) {
  process.stdout.write(`[${index + 1}/${cases.length}] ${evalCase.id} ... `);
  const startedAt = Date.now();
  const response = await requestAgentWithRetry(endpoint, evalCase.messages, {
    timeoutMs,
    retries,
    retryDelayMs,
  });
  const result = evaluateCase(evalCase, response, Date.now() - startedAt);
  result.attempts = response.attempts;
  results.push(result);
  process.stdout.write(`${result.passed ? "PASS" : "FAIL"}\n`);

  const nextCase = cases[index + 1];
  if (nextCase?.category === "functional" && delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  endpoint,
  configuration: {
    runnerCommit: currentCommit(),
    targetCommit,
    model,
    delayMs,
    timeoutMs,
    retries,
    retryDelayMs,
    caseIds: cases.map((evalCase) => evalCase.id),
  },
  summary: summarize(results),
  results,
};
await writeReports(report, outputPrefix);

console.log(`Reporte: ${outputPrefix}.md`);
console.log(`Resultado: ${report.summary.passed}/${report.summary.total}`);
if (report.summary.passed !== report.summary.total) process.exitCode = 1;
