import { describe, expect, it, vi } from "vitest";
import { AgentTransport } from "../../../src/transport/agent/AgentTransport";
import type { ChatTransportEvent } from "../../../src/types";

function sseResponse(events: unknown[], chunkSplitAt?: number): Response {
  const text = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const parts =
    chunkSplitAt === undefined ? [bytes] : [bytes.slice(0, chunkSplitAt), bytes.slice(chunkSplitAt)];
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      parts.forEach((part) => controller.enqueue(part));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } });
}

async function setup(fetchFn: typeof fetch) {
  const transport = new AgentTransport({ fetchFn });
  const events: ChatTransportEvent[] = [];
  transport.onEvent((event) => events.push(event));
  await transport.connect();
  return { transport, events };
}

describe("AgentTransport", () => {
  it("rechaza enviar antes de conectarse", async () => {
    const transport = new AgentTransport({ fetchFn: vi.fn() });
    await expect(transport.sendMessage("hola")).rejects.toThrow(/connect/);
  });

  it("emite el mensaje del usuario, la respuesta con póster y la URL a abrir", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      sseResponse([
        { type: "poster", url: "https://image.tmdb.org/t/p/w500/a.jpg" },
        { type: "open-url", url: "https://www.imdb.com/title/tt1/" },
        { type: "delta", text: "Te recomiendo Dune" },
        { type: "done" },
      ]),
    );
    const { transport, events } = await setup(fetchFn as unknown as typeof fetch);

    await transport.sendMessage("recomiéndame algo");

    expect(events[0]).toMatchObject({ type: "message", message: { role: "user" } });
    expect(events).toContainEqual({ type: "open-url", url: "https://www.imdb.com/title/tt1/" });
    const agent = events.find((e) => e.type === "message" && e.message.role === "agent");
    expect(agent).toMatchObject({
      message: {
        content: "Te recomiendo Dune",
        posterUrl: "https://image.tmdb.org/t/p/w500/a.jpg",
        status: "sending",
      },
    });
    expect(events.at(-2)).toMatchObject({ type: "message-complete" });
    expect(events.at(-1)).toEqual({ type: "typing", isTyping: false });
  });

  it("emite deltas posteriores como chunks y tolera eventos partidos entre lecturas", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      sseResponse(
        [
          { type: "delta", text: "Hola" },
          { type: "delta", text: " mundo" },
          { type: "done" },
        ],
        10,
      ),
    );
    const { transport, events } = await setup(fetchFn as unknown as typeof fetch);

    await transport.sendMessage("hola");

    expect(events.filter((e) => e.type === "message-chunk")).toEqual([
      expect.objectContaining({ delta: " mundo" }),
    ]);
  });

  it("envía el historial completo en la segunda petición", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(sseResponse([{ type: "delta", text: "R1" }, { type: "done" }]))
      .mockResolvedValueOnce(sseResponse([{ type: "delta", text: "R2" }, { type: "done" }]));
    const { transport } = await setup(fetchFn as unknown as typeof fetch);

    await transport.sendMessage("uno");
    await transport.sendMessage("dos");

    const body = JSON.parse((fetchFn.mock.calls[1][1] as RequestInit).body as string);
    expect(body.messages).toEqual([
      { role: "user", content: "uno" },
      { role: "assistant", content: "R1" },
      { role: "user", content: "dos" },
    ]);
  });

  it("reporta el error SSE y marca el mensaje como fallido", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      sseResponse([{ type: "delta", text: "par" }, { type: "error", error: "Agente caído" }]),
    );
    const { transport, events } = await setup(fetchFn as unknown as typeof fetch);

    await transport.sendMessage("hola");

    expect(events).toContainEqual({ type: "error", error: "Agente caído" });
    expect(events).toContainEqual(
      expect.objectContaining({ type: "message-complete", status: "error" }),
    );
    expect(events.at(-1)).toEqual({ type: "typing", isTyping: false });
  });

  it("usa el error JSON del servidor ante un HTTP 400", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ error: "Formato inválido" }), { status: 400 }));
    const { transport, events } = await setup(fetchFn as unknown as typeof fetch);

    await transport.sendMessage("hola");

    expect(events).toContainEqual({ type: "error", error: "Formato inválido" });
  });

  it("reporta un mensaje genérico si falla la red", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("Failed to fetch"));
    const { transport, events } = await setup(fetchFn as unknown as typeof fetch);

    await transport.sendMessage("hola");

    expect(events).toContainEqual({ type: "error", error: "Failed to fetch" });
  });

  it("no guarda en el historial un turno que falló", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 500 }))
      .mockResolvedValueOnce(sseResponse([{ type: "delta", text: "ok" }, { type: "done" }]));
    const { transport } = await setup(fetchFn as unknown as typeof fetch);

    await transport.sendMessage("uno");
    await transport.sendMessage("dos");

    const body = JSON.parse((fetchFn.mock.calls[1][1] as RequestInit).body as string);
    expect(body.messages).toEqual([{ role: "user", content: "dos" }]);
  });

  it("ignora mensajes vacíos", async () => {
    const fetchFn = vi.fn();
    const { transport, events } = await setup(fetchFn as unknown as typeof fetch);

    await transport.sendMessage("   ");

    expect(fetchFn).not.toHaveBeenCalled();
    expect(events).toHaveLength(0);
  });
});
