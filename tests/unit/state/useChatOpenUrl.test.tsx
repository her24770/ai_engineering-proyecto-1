import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useChat } from "../../../src/state/useChat";
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

describe("useChat: open-url", () => {
  const openSpy = vi.fn();

  beforeEach(() => {
    openSpy.mockReset();
    vi.stubGlobal("open", openSpy);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("abre IMDb en una pestaña nueva y desvincula el opener", () => {
    const popup = { opener: window } as unknown as Window;
    openSpy.mockReturnValue(popup);
    const transport = new FakeTransport();
    const { result } = renderHook(() => useChat(transport));

    act(() => transport.emit({ type: "open-url", url: "https://www.imdb.com/title/tt1/" }));

    expect(openSpy).toHaveBeenCalledWith("https://www.imdb.com/title/tt1/", "_blank");
    expect(popup.opener).toBeNull();
    expect(result.current.blockedLinks).toEqual([]);
  });

  it("si el navegador bloquea el popup, guarda el enlace sin duplicados", () => {
    openSpy.mockReturnValue(null);
    const transport = new FakeTransport();
    const { result } = renderHook(() => useChat(transport));

    act(() => {
      transport.emit({ type: "open-url", url: "https://www.imdb.com/title/tt1/" });
      transport.emit({ type: "open-url", url: "https://www.imdb.com/title/tt1/" });
      transport.emit({ type: "open-url", url: "https://books.google.com/books?id=1" });
    });

    expect(result.current.blockedLinks.map((link) => link.label)).toEqual(["IMDb", "Google Books"]);

    act(() => result.current.dismissBlockedLinks());
    expect(result.current.blockedLinks).toEqual([]);
  });

  it("ignora URLs de dominios no permitidos", () => {
    const transport = new FakeTransport();
    const { result } = renderHook(() => useChat(transport));

    act(() => transport.emit({ type: "open-url", url: "https://evil.com" }));

    expect(openSpy).not.toHaveBeenCalled();
    expect(result.current.blockedLinks).toEqual([]);
  });

  it("limpia los enlaces bloqueados al enviar un mensaje nuevo", async () => {
    openSpy.mockReturnValue(null);
    const transport = new FakeTransport();
    const { result } = renderHook(() => useChat(transport));
    act(() => transport.emit({ type: "open-url", url: "https://www.imdb.com/title/tt1/" }));
    expect(result.current.blockedLinks).toHaveLength(1);

    await act(async () => {
      await result.current.sendMessage("hola");
    });

    expect(result.current.blockedLinks).toEqual([]);
  });
});
