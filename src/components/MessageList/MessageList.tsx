import type { ChatMessage } from "../../types";
import { MessageBubble } from "../MessageBubble/MessageBubble";
import { EmptyState } from "../EmptyState";
import "./MessageList.css";
import { useEffect, useRef } from "react";


export interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({
      behavior: "smooth",
    });
  }, [messages]);

  if (messages.length === 0) {
    return <EmptyState />;
  }

  return (
    <div
      className="agichat-message-list"
      role="log"
      aria-live="polite"
    >
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
        />
      ))}

      <div ref={messagesEndRef} />
    </div>
  );
}
