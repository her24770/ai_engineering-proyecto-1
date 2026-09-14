import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatTransport } from "../transport/ChatTransport";
import type { ChatMessage } from "../types";

export interface UseChatResult {
  messages: ChatMessage[];
  isTyping: boolean;
  error: string | null;
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
              message.id === event.id ? { ...message, status: "sent" } : message,
            ),
          );
          break;
        case "typing":
          setIsTyping(event.isTyping);
          break;
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
    try {
      await transportRef.current.sendMessage(content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    }
  }, []);

  return { messages, isTyping, error, sendMessage };
}
