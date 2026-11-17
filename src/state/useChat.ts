import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatTransport } from "../transport/ChatTransport";
import { toSafeLink } from "../links/safeLinks";
import type { SafeLink } from "../links/safeLinks";
import type { ChatMessage } from "../types";

export interface UseChatResult {
  messages: ChatMessage[];
  isTyping: boolean;
  error: string | null;
  /** Enlaces que el navegador no dejó abrir solos (popup bloqueado). */
  blockedLinks: SafeLink[];
  dismissBlockedLinks: () => void;
  sendMessage: (content: string) => Promise<void>;
}

/**
 * Unico punto donde la UI conoce al `ChatTransport`. Traduce eventos del
 * transporte (mensajes, chunks de streaming, errores) a estado de React.
 */
export function useChat(transport: ChatTransport): UseChatResult {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedLinks, setBlockedLinks] = useState<SafeLink[]>([]);
  const transportRef = useRef(transport);
  transportRef.current = transport;

  useEffect(() => {
    const current = transportRef.current;
    current.connect();

    const unsubscribe = current.onEvent((event) => {
      switch (event.type) {
        case "message":
          setMessages((prev) => [...prev, event.message]);
          break;
        case "message-chunk":
          setMessages((prev) =>
            prev.map((message) =>
              message.id === event.id
                ? { ...message, content: message.content + event.delta }
                : message,
            ),
          );
          break;
        case "message-complete":
          setMessages((prev) =>
            prev.map((message) =>
              message.id === event.id
                ? { ...message, status: event.status ?? "sent" }
                : message,
            ),
          );
          break;
        case "typing":
          setIsTyping(event.isTyping);
          break;
        case "open-url": {
          const link = toSafeLink(event.url);
          if (!link) break;
          // Sin "noopener" en las features: con él `window.open` devuelve
          // siempre null y no se podría saber si el popup fue bloqueado.
          const opened = window.open(link.url, "_blank");
          if (opened) {
            opened.opener = null;
          } else {
            setBlockedLinks((prev) =>
              prev.some((item) => item.url === link.url) ? prev : [...prev, link],
            );
          }
          break;
        }
        case "error":
          setError(event.error);
          break;
      }
    });

    return () => {
      unsubscribe();
      current.disconnect();
    };
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    setError(null);
    setBlockedLinks([]);
    try {
      await transportRef.current.sendMessage(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }, []);

  const dismissBlockedLinks = useCallback(() => setBlockedLinks([]), []);

  return { messages, isTyping, error, blockedLinks, dismissBlockedLinks, sendMessage };
}
