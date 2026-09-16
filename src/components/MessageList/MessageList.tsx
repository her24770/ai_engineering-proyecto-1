import type { ChatMessage } from "../../types";
import { MessageBubble } from "../MessageBubble/MessageBubble";
import { EmptyState } from "../EmptyState";
import "./MessageList.css";

export interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="agichat-message-list" role="log" aria-live="polite">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
