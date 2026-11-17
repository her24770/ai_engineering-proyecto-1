import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatWidget } from "../../../src/components/ChatWidget/ChatWidget";
import type { ChatTransport } from "../../../src/transport/ChatTransport";
import type { ChatTransportEvent, ChatTransportEventListener } from "../../../src/types";

class FakeTransport implements ChatTransport {
  private listener: ChatTransportEventListener | null = null;
  async connect() {}
  disconnect() {}
  async sendMessage() {}
  onEvent(listener: ChatTransportEventListener) {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }
  emit(event: ChatTransportEvent) {
    this.listener?.(event);
  }
}

describe("ChatWidget: popup bloqueado", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("muestra enlaces de respaldo cuando el navegador bloquea la pestaña y los oculta al abrirlos", async () => {
    vi.stubGlobal("open", vi.fn().mockReturnValue(null));
    const transport = new FakeTransport();
    render(<ChatWidget transport={transport} />);

    act(() => {
      transport.emit({ type: "open-url", url: "https://www.imdb.com/title/tt1/" });
      transport.emit({ type: "open-url", url: "https://books.google.com/books?id=1" });
    });

    const imdb = screen.getByRole("link", { name: "IMDb" });
    expect(imdb).toHaveAttribute("href", "https://www.imdb.com/title/tt1/");
    expect(imdb).toHaveAttribute("target", "_blank");
    expect(imdb).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(screen.getByRole("link", { name: "Google Books" })).toBeInTheDocument();

    await userEvent.setup().click(imdb);
    expect(screen.queryByRole("status")).toBeNull();
  });
});
