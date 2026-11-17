/* global console, process, setTimeout */

import { EVAL_CASES } from "./cases.mjs";
import { evaluateCase } from "./evaluator.mjs";
import { requestAgent } from "./sseClient.mjs";
import { summarize, writeReports } from "./report.mjs";

const baseUrl = (process.env.EVAL_BASE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
const endpoint = `${baseUrl}/api/chat`;
const delayMs = Number(process.env.EVAL_DELAY_MS ?? "4000");
const timeoutMs = Number(process.env.EVAL_TIMEOUT_MS ?? "60000");
const outputPrefix = process.env.EVAL_OUTPUT ?? "evals/results/latest";
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

const results = [];
for (const [index, evalCase] of cases.entries()) {
  process.stdout.write(`[${index + 1}/${cases.length}] ${evalCase.id} ... `);
  const startedAt = Date.now();
  const response = await requestAgent(endpoint, evalCase.messages, { timeoutMs });
  const result = evaluateCase(evalCase, response, Date.now() - startedAt);
  results.push(result);
  process.stdout.write(`${result.passed ? "PASS" : "FAIL"}\n`);

  if (index < cases.length - 1 && delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  endpoint,
  configuration: { delayMs, timeoutMs, caseIds: cases.map((evalCase) => evalCase.id) },
  summary: summarize(results),
  results,
};
await writeReports(report, outputPrefix);

console.log(`Reporte: ${outputPrefix}.md`);
console.log(`Resultado: ${report.summary.passed}/${report.summary.total}`);
if (report.summary.passed !== report.summary.total) process.exitCode = 1;
