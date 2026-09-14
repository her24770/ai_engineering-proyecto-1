import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useChat } from "../../../src/state/useChat";
import { MockTransport } from "../../../src/transport/mock/MockTransport";

describe("useChat", () => {
  it("agrega el mensaje del usuario y la respuesta completa del agente", async () => {
    const transport = new MockTransport();
    const { result } = renderHook(() => useChat(transport));

    await act(async () => {
      await result.current.sendMessage("hola");
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
      expect(result.current.isTyping).toBe(false);
    });

    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.messages[0].content).toBe("hola");
    expect(result.current.messages[1].role).toBe("agent");
    expect(result.current.messages[1].content.length).toBeGreaterThan(0);
    expect(result.current.error).toBeNull();
  });
});
