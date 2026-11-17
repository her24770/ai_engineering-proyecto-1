import type { ChatTransport } from "../../transport/ChatTransport";
import { useChat } from "../../state/useChat";
import { MessageList } from "../MessageList/MessageList";
import { InputBar } from "../InputBar/InputBar";
import { TypingIndicator } from "../TypingIndicator/TypingIndicator";
import "./ChatWidget.css";

export interface ChatWidgetProps {
  /** Implementacion de ChatTransport a usar (mock hoy, adaptador real mas adelante). */
  transport: ChatTransport;
  title?: string;
}

/**
 * Punto de entrada publico del SDK. Un cliente de Maxine solo necesita
 * instanciar un `ChatTransport` (por ahora, `MockTransport`) y pasarlo aqui.
 */
export function ChatWidget({ transport, title = "AGIChat" }: ChatWidgetProps) {
  const { messages, isTyping, error, blockedLinks, dismissBlockedLinks, sendMessage } =
    useChat(transport);

  return (
    <div className="agichat-widget">
      <header className="agichat-widget__header">{title}</header>
      <MessageList messages={messages} />
      <TypingIndicator isVisible={isTyping} />
      {error && (
        <div className="agichat-widget__error" role="alert">
          {error}
        </div>
      )}
      {blockedLinks.length > 0 && (
        <div className="agichat-widget__blocked" role="status">
          Tu navegador bloqueó la apertura automática. Ábrelo aquí:{" "}
          {blockedLinks.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={dismissBlockedLinks}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
      <InputBar onSend={sendMessage} />
    </div>
  );
}
