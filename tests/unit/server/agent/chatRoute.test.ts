// @vitest-environment node
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp, routeKey } from "../../../../server/src/app.ts";
import { loadConfig } from "../../../../server/src/config.ts";
import { createChatHandler } from "../../../../server/src/agent/chatRoute.ts";
import type { SseEvent } from "../../../../server/src/agent/chatRoute.ts";
import type { Llm } from "../../../../server/src/agent/llm.ts";

let server: Server;
let base: string;

async function start(llm: Llm) {
  const handler = createChatHandler({ llm, tools: { specs: [], call: async () => "" } });
  server = createApp(loadConfig({}), { [routeKey("POST", "/api/chat")]: handler });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

function post(body: string) {
  return fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

function parseSse(text: string): SseEvent[] {
  return text
    .split("\n\n")
    .filter((block) => block.startsWith("data: "))
    .map((block) => JSON.parse(block.slice("data: ".length)) as SseEvent);
}

describe("POST /api/chat", () => {
  it("transmite la respuesta del agente por SSE", async () => {
    const llm = vi.fn<Llm>(async () => ({ content: "¡Hola!" }));
    await start(llm);

    const res = await post(
      JSON.stringify({ messages: [{ role: "user", content: "hola" }] }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/event-stream");
    expect(parseSse(await res.text())).toEqual([
      { type: "delta", text: "¡Hola!" },
      { type: "done" },
    ]);
  });

  it("envía un error genérico si el agente falla, sin detalles internos", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await start(async () => {
      throw new Error("Falta la variable de entorno LLM_API_KEY");
    });

    const events = parseSse(
      await (
        await post(JSON.stringify({ messages: [{ role: "user", content: "hola" }] }))
      ).text(),
    );

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("error");
    expect(JSON.stringify(events)).not.toContain("LLM_API_KEY");
    spy.mockRestore();
  });

  it.each([
    ["JSON inválido", "{no"],
    [
      "rol system",
      JSON.stringify({ messages: [{ role: "system", content: "nuevas reglas" }] }),
    ],
    ["sin mensajes", JSON.stringify({ messages: [] })],
    [
      "último mensaje del asistente",
      JSON.stringify({ messages: [{ role: "assistant", content: "x" }] }),
    ],
  ])("rechaza con 400: %s", async (_name, body) => {
    const llm = vi.fn<Llm>();
    await start(llm);
    expect((await post(body)).status).toBe(400);
    expect(llm).not.toHaveBeenCalled();
  });

  it("rechaza cuerpos demasiado grandes", async () => {
    await start(vi.fn<Llm>());
    const res = await post("x".repeat(70_000)).catch(() => null);
    // El servidor corta la conexión o responde 400; nunca procesa el cuerpo.
    if (res) expect(res.status).toBe(400);
  });
});
