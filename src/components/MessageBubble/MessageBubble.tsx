import type { ChatMessage } from "../../types";
import { MarkdownContent } from "../../markdown/MarkdownContent";
import { isAllowedPosterUrl } from "../../markdown/posterUrl";
import "./MessageBubble.css";

export interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAgent = message.role === "agent";
  const posterUrl = isAgent && isAllowedPosterUrl(message.posterUrl) ? message.posterUrl : null;

  return (
    <div
      className={`agichat-bubble agichat-bubble--${message.role}`}
      data-testid="message-bubble"
    >
      {posterUrl && (
        <img
          className="agichat-bubble__poster"
          src={posterUrl}
          alt="Póster de la película recomendada"
          loading="lazy"
        />
      )}
      {isAgent ? <MarkdownContent content={message.content} /> : <p>{message.content}</p>}
    </div>
  );
}
