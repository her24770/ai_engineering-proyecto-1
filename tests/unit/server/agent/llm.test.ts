import { LlmRateLimitError, createLlm } from "../../../../server/src/agent/llm.ts";
import type { LlmOptions } from "../../../../server/src/agent/llm.ts";

function reply(status: number, body: unknown, headers: Record<string, string> = {}) {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers,
  });
}

/** fetch falso que devuelve las respuestas en orden. */
function fakeFetch(...responses: Response[]) {
  return vi.fn<typeof fetch>(async () => {
    const next = responses.shift();
    if (!next) throw new Error("sin más respuestas");
    return next;
  });
}

const OK = { choices: [{ message: { content: "hola" } }] };
const spec = {
  name: "search_movie",
  description: "busca",
  parameters: { type: "object" },
};

function llmWith(fetchMock: typeof fetch, extra: Partial<LlmOptions> = {}) {
  const sleep = vi.fn(async () => {});
  const llm = createLlm({
    apiKey: "gsk-x",
    model: "m",
    baseUrl: "https://api.x/v1",
    fetch: fetchMock,
    sleep,
    ...extra,
  });
  return { llm, sleep };
}

describe("createLlm", () => {
  it("envía modelo, mensajes y herramientas y devuelve el mensaje", async () => {
    const fetchMock = fakeFetch(reply(200, OK));
    const { llm } = llmWith(fetchMock);

    expect(await llm([{ role: "user", content: "hi" }], [spec])).toEqual({
      content: "hola",
      tool_calls: undefined,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.x/v1/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer gsk-x");
    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe("m");
    expect(body.tools).toEqual([{ type: "function", function: spec }]);
  });

  it("omite tools si no hay herramientas y normaliza content ausente", async () => {
    const toolCalls = [
      { id: "1", type: "function", function: { name: "a", arguments: "{}" } },
    ];
    const fetchMock = fakeFetch(
      reply(200, { choices: [{ message: { tool_calls: toolCalls } }] }),
    );
    const { llm } = llmWith(fetchMock);

    expect(await llm([], [])).toEqual({ content: null, tool_calls: toolCalls });
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).tools).toBeUndefined();
  });

  it("reintenta una vez tras un 429 respetando retry-after", async () => {
    const fetchMock = fakeFetch(reply(429, {}, { "retry-after": "2" }), reply(200, OK));
    const { llm, sleep } = llmWith(fetchMock);

    expect((await llm([], [])).content).toBe("hola");
    expect(sleep).toHaveBeenCalledWith(2000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("si no hay retry-after, lee la espera del mensaje de Groq", async () => {
    const groq429 = {
      error: {
        message: "Rate limit reached... Please try again in 16.37s. Need more tokens?",
      },
    };
    const { llm, sleep } = llmWith(fakeFetch(reply(429, groq429), reply(200, OK)));
    await llm([], []);
    expect(sleep).toHaveBeenCalledWith(16370);
  });

  it("entiende esperas con minutos y descarta las que superan el máximo", async () => {
    const msg = { error: { message: "Please try again in 1m2.5s." } };
    const fetchMock = fakeFetch(reply(429, msg));
    const { llm, sleep } = llmWith(fetchMock);
    await expect(llm([], [])).rejects.toThrow(/429/);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("envía reasoning_effort solo si está configurado", async () => {
    const withEffort = fakeFetch(reply(200, OK));
    await llmWith(withEffort, { reasoningEffort: "low" }).llm([], []);
    expect(JSON.parse(withEffort.mock.calls[0][1]?.body as string).reasoning_effort).toBe(
      "low",
    );

    const without = fakeFetch(reply(200, OK));
    await llmWith(without).llm([], []);
    expect(JSON.parse(without.mock.calls[0][1]?.body as string)).not.toHaveProperty(
      "reasoning_effort",
    );
  });

  it("usa 1 s si retry-after falta o no es un número", async () => {
    const { llm, sleep } = llmWith(
      fakeFetch(reply(429, {}, { "retry-after": "pronto" }), reply(200, OK)),
    );
    await llm([], []);
    expect(sleep).toHaveBeenCalledWith(1000);
  });

  it("no reintenta si el proveedor pide esperar demasiado", async () => {
    const fetchMock = fakeFetch(reply(429, {}, { "retry-after": "60" }));
    const { llm, sleep } = llmWith(fetchMock);

    await expect(llm([], [])).rejects.toThrow(/429/);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("reintenta al instante si el modelo generó una llamada a herramienta inválida", async () => {
    const toolUseFailed = { error: { code: "tool_use_failed", message: "..." } };
    const fetchMock = fakeFetch(reply(400, toolUseFailed), reply(200, OK));
    const { llm, sleep } = llmWith(fetchMock);

    expect((await llm([], [])).content).toBe("hola");
    expect(sleep).toHaveBeenCalledWith(0);
  });

  it("reintenta solo una vez", async () => {
    const fetchMock = fakeFetch(reply(429, {}), reply(429, {}));
    const { llm } = llmWith(fetchMock);
    await expect(llm([], [])).rejects.toBeInstanceOf(LlmRateLimitError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falla con claridad sin API key, con otros errores HTTP o respuesta vacía", async () => {
    await expect(
      llmWith(fakeFetch(reply(200, OK)), { apiKey: undefined }).llm([], []),
    ).rejects.toThrow(/LLM_API_KEY/);
    await expect(
      llmWith(fakeFetch(reply(400, "otro error"))).llm([], []),
    ).rejects.toThrow(/400/);
    await expect(llmWith(fakeFetch(reply(500, {}))).llm([], [])).rejects.toThrow(/500/);
    await expect(llmWith(fakeFetch(reply(200, {}))).llm([], [])).rejects.toThrow(/vacía/);
  });

  it("usa fetch y setTimeout reales por defecto", async () => {
    const realFetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(reply(429, {}, { "retry-after": "0" }))
      .mockResolvedValueOnce(reply(200, OK));
    const llm = createLlm({ apiKey: "k", model: "m", baseUrl: "b" });
    expect((await llm([], [])).content).toBe("hola");
    realFetch.mockRestore();
  });
});
