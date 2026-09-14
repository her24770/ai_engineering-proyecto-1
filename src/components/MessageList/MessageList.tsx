import type { ChatMessage } from "../../types";
import { MessageBubble } from "../MessageBubble/MessageBubble";
import "./MessageList.css";

export interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  return (
    <div className="agichat-message-list" role="log" aria-live="polite">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
