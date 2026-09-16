export type MessageRole = "user" | "agent" | "system";

export type MessageStatus = "sending" | "sent" | "error";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  status?: MessageStatus;
}

export type ChatTransportEvent =
  | { type: "message"; message: ChatMessage }
  | { type: "message-chunk"; id: string; delta: string }
  | { type: "message-complete"; id: string; status?: MessageStatus }
  | { type: "typing"; isTyping: boolean }
  | { type: "error"; error: string };

export type ChatTransportEventListener = (event: ChatTransportEvent) => void;
