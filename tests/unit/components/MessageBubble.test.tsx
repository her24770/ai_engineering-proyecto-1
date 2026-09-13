import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageBubble } from "../../../src/components/MessageBubble/MessageBubble";
import type { ChatMessage } from "../../../src/types";

function makeMessage(overrides: Partial<ChatMessage>): ChatMessage {
  return {
    id: "1",
    role: "user",
    content: "hola",
    createdAt: Date.now(),
    ...overrides,
  };
}

describe("MessageBubble", () => {
  it("renderiza el texto plano de un mensaje de usuario", () => {
    render(<MessageBubble message={makeMessage({ role: "user", content: "hola" })} />);
    expect(screen.getByText("hola")).toBeInTheDocument();
  });

  it("renderiza Markdown en los mensajes del agente", () => {
    render(
      <MessageBubble message={makeMessage({ role: "agent", content: "**negrita**" })} />,
    );
    const strong = screen.getByText("negrita");
    expect(strong.tagName.toLowerCase()).toBe("strong");
  });

  it("sanitiza HTML/scripts embebidos en el contenido del agente", () => {
    const windowWithFlag = window as unknown as { __xss?: boolean };

    render(
      <MessageBubble
        message={makeMessage({
          role: "agent",
          content: "texto seguro\n\n<script>window.__xss = true;</script>",
        })}
      />,
    );

    expect(screen.getByText("texto seguro")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    expect(windowWithFlag.__xss).toBeUndefined();
  });
});
