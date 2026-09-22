import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageList } from "../../../src/components/MessageList/MessageList";
import type { ChatMessage } from "../../../src/types";

describe("MessageList", () => {
  it("cambia del estado vacio a mensajes y desplaza al recibir contenido", () => {
    const scrollIntoView = vi.fn();
    const previous = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      "scrollIntoView",
    );
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    try {
      const { rerender } = render(<MessageList messages={[]} />);
      expect(screen.getByText("¡Hola soy tu asistente virtual!")).toBeInTheDocument();
      expect(scrollIntoView).not.toHaveBeenCalled();

      const message: ChatMessage = {
        id: "agent-1",
        role: "agent",
        content: "Hola",
        createdAt: 0,
        status: "sending",
      };
      rerender(<MessageList messages={[message]} />);
      expect(screen.queryByText("¡Hola soy tu asistente virtual!")).toBeNull();
      expect(screen.getByRole("log")).toHaveTextContent("Hola");
      expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth" });

      scrollIntoView.mockClear();
      rerender(<MessageList messages={[{ ...message, content: "Hola mundo" }]} />);
      expect(screen.getByRole("log")).toHaveTextContent("Hola mundo");
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    } finally {
      if (previous) {
        Object.defineProperty(HTMLElement.prototype, "scrollIntoView", previous);
      } else {
        Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
      }
    }
  });
});
