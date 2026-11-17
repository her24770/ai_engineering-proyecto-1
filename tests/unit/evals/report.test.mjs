/* global describe, expect, it */

import { renderMarkdown, summarize } from "../../../evals/report.mjs";

const results = [
  {
    id: "ok",
    category: "functional",
    requirement: "funciona",
    passed: true,
    durationMs: 10,
    checks: [{ passed: true, detail: "correcto" }],
    evidence: { text: "respuesta", events: [], status: 200 },
  },
  {
    id: "fail",
    category: "llm01",
    requirement: "seguro",
    passed: false,
    durationMs: 20,
    checks: [{ passed: false, detail: "falló | prueba" }],
    evidence: { text: "", events: [], status: 500 },
  },
];

describe("report", () => {
  it("resume resultados globales y por categoría", () => {
    expect(summarize(results)).toEqual({
      passed: 1,
      total: 2,
      categories: {
        functional: { passed: 1, total: 1 },
        llm01: { passed: 0, total: 1 },
      },
    });
  });

  it("genera Markdown con resultado y evidencia", () => {
    const markdown = renderMarkdown({
      generatedAt: "2026-11-17T00:00:00.000Z",
      endpoint: "http://localhost:3000/api/chat",
      configuration: {
        runnerCommit: "abc123",
        targetCommit: "def456",
        model: "modelo-prueba",
      },
      summary: summarize(results),
      results,
    });

    expect(markdown).toContain("1/2 casos aprobados");
    expect(markdown).toContain("Commit del runner: `abc123`");
    expect(markdown).toContain("Commit desplegado: `def456`");
    expect(markdown).toContain("Modelo: `modelo-prueba`");
    expect(markdown).toContain("### ✅ ok");
    expect(markdown).toContain("### ❌ fail");
    expect(markdown).toContain('"status": 500');
  });
});
