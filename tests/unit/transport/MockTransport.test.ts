import { describe, expect, it } from "vitest";
import { MockTransport } from "../../../src/transport/mock/MockTransport";
import { ErrorSimulator } from "../../../src/transport/mock/errorSimulator";
import type { ChatTransportEvent } from "../../../src/types";

async function connectedTransport(
  errorSimulator: ErrorSimulator,
): Promise<{ transport: MockTransport; events: ChatTransportEvent[] }> {
  const transport = new MockTransport({ errorSimulator });
  const events: ChatTransportEvent[] = [];
  transport.onEvent((event) => events.push(event));
  await transport.connect();
  return { transport, events };
}

describe("MockTransport", () => {
  it("rechaza enviar mensajes antes de conectarse", async () => {
    const transport = new MockTransport();
    await expect(transport.sendMessage("hola")).rejects.toThrow(/connect/);
  });

  it("emite el mensaje del usuario, el indicador de escritura y la respuesta del agente", async () => {
    const transport = new MockTransport();
    const events: ChatTransportEvent[] = [];
    transport.onEvent((event) => events.push(event));

    await transport.connect();
    await transport.sendMessage("hola");

    const types = events.map((event) => event.type);
    expect(types).toContain("message");
    expect(types).toContain("typing");
    expect(types).toContain("message-chunk");
    expect(types).toContain("message-complete");

    const userMessage = events.find(
      (event) => event.type === "message" && event.message.role === "user",
    );
    expect(userMessage).toBeDefined();
  });

  it("deja de emitir eventos despues de disconnect", async () => {
    const transport = new MockTransport();
    const events: ChatTransportEvent[] = [];
    const unsubscribe = transport.onEvent((event) => events.push(event));
    unsubscribe();

    await transport.connect();
    await transport.sendMessage("hola");

    expect(events).toHaveLength(0);
  });

  describe("manejo de errores", () => {
    it("emite un error y no envia el mensaje si el contenido es invalido (vacio)", async () => {
      const { transport, events } = await connectedTransport(
        new ErrorSimulator({ failureRate: 0 }),
      );

      await transport.sendMessage("   ");

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ type: "error" });
    });

    it("emite un error si el mensaje excede la longitud maxima", async () => {
      const { transport, events } = await connectedTransport(
        new ErrorSimulator({ failureRate: 0, maxMessageLength: 5 }),
      );

      await transport.sendMessage("mensaje demasiado largo");

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ type: "error" });
    });

    it("emite un error de rate limit al exceder el maximo de mensajes en la ventana", async () => {
      const { transport, events } = await connectedTransport(
        new ErrorSimulator({
          failureRate: 0,
          rateLimitMaxMessages: 1,
          rateLimitWindowMs: 60_000,
        }),
      );

      await transport.sendMessage("primero");
      events.length = 0;
      await transport.sendMessage("segundo");

      expect(events.some((event) => event.type === "error")).toBe(true);
    });

    it("simula un timeout: emite typing y luego error, sin completar el mensaje", async () => {
      const { transport, events } = await connectedTransport(
        new ErrorSimulator({ failureRate: 1, enabledKinds: ["timeout"] }, () => 0),
      );

      await transport.sendMessage("hola");

      const types = events.map((event) => event.type);
      expect(types).toContain("typing");
      expect(types).toContain("error");
      expect(types).not.toContain("message-complete");
      expect(types).not.toContain("message-chunk");
    });

    it("permite configurar la tasa de fallo desde las opciones publicas", async () => {
      const transport = new MockTransport({
        errorConfig: { failureRate: 1, enabledKinds: ["server_error"] },
      });
      const events: ChatTransportEvent[] = [];
      transport.onEvent((event) => events.push(event));
      await transport.connect();

      await transport.sendMessage("hola");

      expect(events.some((event) => event.type === "error")).toBe(true);
      expect(events).toContainEqual(
        expect.objectContaining({ type: "message-complete", status: "error" }),
      );
    });

    it("simula un error de servidor tras crear el mensaje del agente, marcandolo como error", async () => {
      const { transport, events } = await connectedTransport(
        new ErrorSimulator({ failureRate: 1, enabledKinds: ["server_error"] }, () => 0),
      );

      await transport.sendMessage("hola");

      const completeEvent = events.find((event) => event.type === "message-complete");
      expect(completeEvent).toMatchObject({ type: "message-complete", status: "error" });
      expect(events.some((event) => event.type === "error")).toBe(true);
    });

    it("simula una desconexion a media respuesta: corta el streaming y marca error", async () => {
      const { transport, events } = await connectedTransport(
        new ErrorSimulator({ failureRate: 1, enabledKinds: ["disconnect"] }, () => 0),
      );

      await transport.sendMessage("hola");

      const chunkEvents = events.filter((event) => event.type === "message-chunk");
      const completeEvent = events.find((event) => event.type === "message-complete");

      expect(chunkEvents.length).toBeGreaterThan(0);
      expect(completeEvent).toMatchObject({ type: "message-complete", status: "error" });
      expect(events.some((event) => event.type === "error")).toBe(true);
    });

    it("exige reconectar despues de una desconexion simulada", async () => {
      const { transport, events } = await connectedTransport(
        new ErrorSimulator({ failureRate: 1, enabledKinds: ["disconnect"] }, () => 0),
      );

      await transport.sendMessage("hola");

      await expect(transport.sendMessage("otro mensaje")).rejects.toThrow(/connect/);
      await transport.connect();
      await expect(transport.sendMessage("otro mensaje")).resolves.toBeUndefined();

      const userMessages = events.filter(
        (event) => event.type === "message" && event.message.role === "user",
      );
      expect(userMessages).toHaveLength(2);
    });

    it("cancela una respuesta anterior aunque se reconecte antes de que termine", async () => {
      const transport = new MockTransport({
        errorSimulator: new ErrorSimulator(
          { failureRate: 1, enabledKinds: ["timeout"] },
          () => 0,
        ),
      });
      const oldEvents: ChatTransportEvent[] = [];
      const newEvents: ChatTransportEvent[] = [];
      transport.onEvent((event) => oldEvents.push(event));
      await transport.connect();

      const pendingResponse = transport.sendMessage("hola");
      transport.disconnect();
      transport.onEvent((event) => newEvents.push(event));
      await transport.connect();
      await pendingResponse;

      expect(oldEvents.map((event) => event.type)).toEqual(["message", "typing"]);
      expect(newEvents).toHaveLength(0);
    });

    it("rechaza nuevos mensajes despues de disconnect", async () => {
      const transport = new MockTransport();
      await transport.connect();
      transport.disconnect();

      await expect(transport.sendMessage("hola")).rejects.toThrow(/connect/);
    });

    it("por defecto (failureRate 0) nunca inyecta fallos transitorios", async () => {
      const { transport, events } = await connectedTransport(new ErrorSimulator());

      await transport.sendMessage("hola");

      expect(events.some((event) => event.type === "error")).toBe(false);
      expect(events.some((event) => event.type === "message-complete")).toBe(true);
    });
  });
});
