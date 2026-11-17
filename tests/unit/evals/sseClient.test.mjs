/* global describe, expect, it, vi */

import {
  isRateLimitResponse,
  parseSse,
  requestAgent,
  requestAgentWithRetry,
} from "../../../evals/sseClient.mjs";

describe("parseSse", () => {
  it("analiza eventos SSE y tolera saltos CRLF", () => {
    expect(
      parseSse(
        'data: {"type":"delta","text":"Hola"}\r\n\r\ndata: {"type":"done"}\r\n\r\n',
      ),
    ).toEqual([{ type: "delta", text: "Hola" }, { type: "done" }]);
  });

  it("rechaza JSON inválido y tipos desconocidos", () => {
    expect(() => parseSse("data: {no}\n\n")).toThrow("JSON inválido");
    expect(() => parseSse('data: {"type":"otro"}\n\n')).toThrow("desconocido");
  });
});

describe("requestAgent", () => {
  it("combina deltas y conserva eventos observables", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () =>
        [
          'data: {"type":"poster","url":"https://image.tmdb.org/a.jpg"}',
          'data: {"type":"delta","text":"Ho"}',
          'data: {"type":"delta","text":"la"}',
          'data: {"type":"done"}',
          "",
        ].join("\n\n"),
    }));

    const result = await requestAgent(
      "http://localhost/api/chat",
      [{ role: "user", content: "hola" }],
      { fetch: fetchMock, timeoutMs: 100 },
    );

    expect(result.text).toBe("Hola");
    expect(result.error).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost/api/chat",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("reporta respuestas HTTP, errores SSE y errores de red", async () => {
    const httpError = await requestAgent("http://x", [], {
      fetch: async () => ({ ok: false, status: 503, text: async () => "caído" }),
    });
    expect(httpError.error).toContain("HTTP 503");

    const agentError = await requestAgent("http://x", [], {
      fetch: async () => ({
        ok: true,
        status: 200,
        text: async () => 'data: {"type":"error","error":"sin servicio"}\n\n',
      }),
    });
    expect(agentError.error).toBe("sin servicio");

    const networkError = await requestAgent("http://x", [], {
      fetch: async () => {
        throw new Error("red caída");
      },
    });
    expect(networkError.error).toBe("red caída");
  });

  it("detecta una respuesta sin evento done", async () => {
    const result = await requestAgent("http://x", [], {
      fetch: async () => ({
        ok: true,
        status: 200,
        text: async () => 'data: {"type":"delta","text":"hola"}\n\n',
      }),
    });
    expect(result.error).toContain("no incluyó done");
  });
});

describe("rate limit retries", () => {
  it("reintenta una respuesta limitada y conserva el número de intentos", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ error: "Hay muchas solicitudes en este momento" })
      .mockResolvedValueOnce({ status: 200, text: "ok", events: [] });
    const sleep = vi.fn(async () => {});

    const response = await requestAgentWithRetry("http://x", [], {
      request,
      sleep,
      retries: 1,
      retryDelayMs: 123,
    });

    expect(response.attempts).toBe(2);
    expect(response.text).toBe("ok");
    expect(sleep).toHaveBeenCalledWith(123);
  });

  it("no reintenta errores que no son de cuota", async () => {
    const request = vi.fn(async () => ({ error: "servicio caído" }));
    const response = await requestAgentWithRetry("http://x", [], { request });

    expect(response.attempts).toBe(1);
    expect(request).toHaveBeenCalledOnce();
    expect(isRateLimitResponse(response)).toBe(false);
  });
});
