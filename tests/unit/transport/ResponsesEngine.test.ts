import { afterEach, describe, expect, it, vi } from "vitest";
import { generateResponse } from "../../../src/transport/mock/ResponsesEngine";
import { MockTransport } from "../../../src/transport/mock/MockTransport";
import type { ChatTransportEvent } from "../../../src/types";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("integracion del banco de respuestas", () => {
  it("conserva la categoria documentacion y reconoce mayusculas y tildes", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(generateResponse("DOCUMENTACIÓN")).toContain("https://react.dev/");
    expect(generateResponse("CÓDIGO")).toContain("```js");
  });

  it("conserva las tablas de comparacion del banco completo", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(generateResponse("comparación")).toContain("| Plan | Usuarios | Precio |");
  });

  it("usa una respuesta alternativa cuando no encuentra una categoria", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(generateResponse("xyz123")).toContain("No tengo una respuesta específica");
  });

  it("el transporte con manejo de errores transmite la respuesta completa del banco", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const transport = new MockTransport({ errorConfig: { failureRate: 0 } });
    const events: ChatTransportEvent[] = [];
    transport.onEvent((event) => events.push(event));
    await transport.connect();
    const pending = transport.sendMessage("documentación");
    await vi.runAllTimersAsync();
    await pending;

    const content = events
      .filter((event) => event.type === "message-chunk")
      .map((event) => event.delta)
      .join("");
    expect(content).toBe(generateResponse("documentación"));
    expect(events.some((event) => event.type === "error")).toBe(false);
    expect(events[events.length - 1]).toMatchObject({ type: "message-complete" });
    transport.disconnect();
  });
});
