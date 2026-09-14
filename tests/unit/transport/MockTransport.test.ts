import { describe, expect, it } from "vitest";
import { MockTransport } from "../../../src/transport/mock/MockTransport";
import type { ChatTransportEvent } from "../../../src/types";

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
});
