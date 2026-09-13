import type { ChatTransport } from "../../transport/ChatTransport";
import { useChat } from "../../state/useChat";
import { MessageList } from "../MessageList/MessageList";
import { InputBar } from "../InputBar/InputBar";
import { TypingIndicator } from "../TypingIndicator/TypingIndicator";
import "./ChatWidget.css";

export interface ChatWidgetProps {
  /** Implementacion de ChatTransport a usar (mock en fase 1, agente real en fase 2). */
  transport: ChatTransport;
  title?: string;
}

/**
 * Punto de entrada publico del SDK. Un cliente de Maxine solo necesita
 * instanciar un `ChatTransport` (por ahora, `MockTransport`) y pasarlo aqui.
 */
export function ChatWidget({ transport, title = "AGIChat" }: ChatWidgetProps) {
  const { messages, isTyping, error, sendMessage } = useChat(transport);

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
      <InputBar onSend={sendMessage} />
    </div>
  );
}
