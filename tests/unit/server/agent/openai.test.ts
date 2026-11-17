import { createOpenAiLlm } from "../../../../server/src/agent/openai.ts";

function fakeFetch(status: number, body: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
}

const spec = {
  name: "search_movie",
  description: "busca",
  parameters: { type: "object" },
};

describe("createOpenAiLlm", () => {
  it("envía modelo, mensajes y herramientas y devuelve el mensaje", async () => {
    const fetchMock = fakeFetch(200, { choices: [{ message: { content: "hola" } }] });
    const llm = createOpenAiLlm({
      apiKey: "sk-x",
      model: "m",
      baseUrl: "https://api.x/v1",
      fetch: fetchMock,
    });

    const reply = await llm([{ role: "user", content: "hi" }], [spec]);

    expect(reply).toEqual({ content: "hola", tool_calls: undefined });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.x/v1/chat/completions");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer sk-x");
    const body = JSON.parse(init?.body as string);
    expect(body.model).toBe("m");
    expect(body.tools).toEqual([{ type: "function", function: spec }]);
  });

  it("omite tools si no hay herramientas y normaliza content ausente", async () => {
    const toolCalls = [
      { id: "1", type: "function", function: { name: "a", arguments: "{}" } },
    ];
    const fetchMock = fakeFetch(200, {
      choices: [{ message: { tool_calls: toolCalls } }],
    });
    const llm = createOpenAiLlm({
      apiKey: "k",
      model: "m",
      baseUrl: "b",
      fetch: fetchMock,
    });

    expect(await llm([], [])).toEqual({ content: null, tool_calls: toolCalls });
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string).tools).toBeUndefined();
  });

  it("falla con claridad sin API key, con error HTTP o respuesta vacía", async () => {
    const ok = fakeFetch(200, {});
    await expect(
      createOpenAiLlm({ apiKey: undefined, model: "m", baseUrl: "b", fetch: ok })([], []),
    ).rejects.toThrow(/OPENAI_API_KEY/);
    await expect(
      createOpenAiLlm({
        apiKey: "k",
        model: "m",
        baseUrl: "b",
        fetch: fakeFetch(429, {}),
      })([], []),
    ).rejects.toThrow(/429/);
    await expect(
      createOpenAiLlm({ apiKey: "k", model: "m", baseUrl: "b", fetch: ok })([], []),
    ).rejects.toThrow(/vacía/);
  });
});
