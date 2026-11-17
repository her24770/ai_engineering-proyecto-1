import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

function escapeTable(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function summarize(results) {
  const categories = {};
  for (const result of results) {
    const current = categories[result.category] ?? { passed: 0, total: 0 };
    current.total += 1;
    if (result.passed) current.passed += 1;
    categories[result.category] = current;
  }
  return {
    passed: results.filter((result) => result.passed).length,
    total: results.length,
    categories,
  };
}

export function renderMarkdown(report) {
  const lines = [
    "# Reporte de evaluaciones de AGIChat",
    "",
    `- Fecha: ${report.generatedAt}`,
    `- Endpoint: \`${report.endpoint}\``,
    `- Commit del runner: \`${report.configuration.runnerCommit}\``,
    `- Commit desplegado: \`${report.configuration.targetCommit}\``,
    `- Modelo: \`${report.configuration.model}\``,
    `- Resultado: **${report.summary.passed}/${report.summary.total} casos aprobados**`,
    "",
    "## Resumen",
    "",
    "| Categoría | Aprobados | Total |",
    "|---|---:|---:|",
  ];

  for (const [category, result] of Object.entries(report.summary.categories)) {
    lines.push(`| ${escapeTable(category)} | ${result.passed} | ${result.total} |`);
  }

  lines.push("", "## Casos", "");
  for (const result of report.results) {
    lines.push(
      `### ${result.passed ? "✅" : "❌"} ${result.id}`,
      "",
      `${result.requirement} (${result.durationMs} ms)`,
      "",
    );
    for (const check of result.checks) {
      lines.push(`- ${check.passed ? "✅" : "❌"} ${check.detail}`);
    }
    lines.push(
      "",
      "<details><summary>Evidencia observable</summary>",
      "",
      "```json",
      JSON.stringify(result.evidence, null, 2),
      "```",
      "",
      "</details>",
      "",
    );
  }

  lines.push(
    "## Interpretación",
    "",
    "Las verificaciones son black-box y se basan únicamente en texto y eventos SSE observables. Un resultado aprobado demuestra el comportamiento probado, no garantiza seguridad absoluta ante variantes no incluidas en esta batería.",
    "",
  );
  return lines.join("\n");
}

export async function writeReports(report, outputPrefix) {
  await mkdir(dirname(outputPrefix), { recursive: true });
  await Promise.all([
    writeFile(`${outputPrefix}.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8"),
    writeFile(`${outputPrefix}.md`, `${renderMarkdown(report)}\n`, "utf8"),
  ]);
}
