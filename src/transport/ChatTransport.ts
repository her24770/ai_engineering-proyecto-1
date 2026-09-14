import type { ChatTransportEventListener } from "../types";

/**
 * Puerto (arquitectura hexagonal) que desacopla la UI del origen real de
 * los mensajes: los adaptadores concretos (mock, agente real) pueden
 * intercambiarse sin que `ChatWidget` ni `useChat` cambien.
 */
export interface ChatTransport {
  connect(): Promise<void>;
  disconnect(): void;
  sendMessage(content: string): Promise<void>;
  onEvent(listener: ChatTransportEventListener): () => void;
}
