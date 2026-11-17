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

  describe("póster", () => {
    const TMDB_POSTER = "https://image.tmdb.org/t/p/w500/abc.jpg";

    it("muestra el póster de un mensaje del agente", () => {
      render(
        <MessageBubble
          message={makeMessage({ role: "agent", content: "Dune", posterUrl: TMDB_POSTER })}
        />,
      );
      const img = screen.getByRole("img");
      expect(img).toHaveAttribute("src", TMDB_POSTER);
      expect(img).toHaveAttribute("alt");
    });

    it("no muestra pósters de hosts que no son TMDB", () => {
      render(
        <MessageBubble
          message={makeMessage({
            role: "agent",
            content: "Dune",
            posterUrl: "https://evil.example.com/p.jpg",
          })}
        />,
      );
      expect(screen.queryByRole("img")).toBeNull();
    });

    it("no muestra pósters por http ni URLs inválidas", () => {
      const { rerender } = render(
        <MessageBubble
          message={makeMessage({
            role: "agent",
            posterUrl: "http://image.tmdb.org/t/p/w500/abc.jpg",
          })}
        />,
      );
      expect(screen.queryByRole("img")).toBeNull();

      rerender(<MessageBubble message={makeMessage({ role: "agent", posterUrl: "no-es-url" })} />);
      expect(screen.queryByRole("img")).toBeNull();
    });

    it("no muestra póster en mensajes del usuario", () => {
      render(<MessageBubble message={makeMessage({ role: "user", posterUrl: TMDB_POSTER })} />);
      expect(screen.queryByRole("img")).toBeNull();
    });

    it("permite imágenes Markdown de TMDB y descarta las de otros hosts", () => {
      render(
        <MessageBubble
          message={makeMessage({
            role: "agent",
            content: `![ok](${TMDB_POSTER}) ![mal](https://tracker.example.com/x.png)`,
          })}
        />,
      );
      const images = screen.getAllByRole("img");
      expect(images).toHaveLength(1);
      expect(images[0]).toHaveAttribute("src", TMDB_POSTER);
    });
  });
});
