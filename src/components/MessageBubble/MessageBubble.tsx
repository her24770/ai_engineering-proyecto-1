import type { ChatMessage } from "../../types";
import { MarkdownContent } from "../../markdown/MarkdownContent";
import "./MessageBubble.css";

export interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isAgent = message.role === "agent";

  return (
    <div
      className={`agichat-bubble agichat-bubble--${message.role}`}
      data-testid="message-bubble"
    >
      {isAgent ? <MarkdownContent content={message.content} /> : <p>{message.content}</p>}
    </div>
  );
}
