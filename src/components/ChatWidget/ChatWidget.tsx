import type { ChatTransport } from "../../transport/ChatTransport";
import { useChat } from "../../state/useChat";
import { MessageList } from "../MessageList/MessageList";
import { InputBar } from "../InputBar/InputBar";
import { TypingIndicator } from "../TypingIndicator/TypingIndicator";
import tmdbLogo from "../../assets/logoTMBD1.svg";
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
      {/* Atribución obligatoria por los términos de uso de la API de TMDB. */}
      <footer className="agichat-widget__attribution">
        <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
          <img src={tmdbLogo} alt="The Movie Database (TMDB)" />
        </a>
        <span>This product uses the TMDB API but is not endorsed or certified by TMDB.</span>
      </footer>
    </div>
  );
}
