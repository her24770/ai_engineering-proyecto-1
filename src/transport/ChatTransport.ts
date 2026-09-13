import type { ChatTransportEventListener } from "../types";

/**
 * Puerto (en el sentido de arquitectura hexagonal) que desacopla la UI del
 * origen real de los mensajes. En el Proyecto 1 la unica implementacion es
 * `MockTransport`; en el Proyecto 2 se agrega un adaptador que hable con el
 * agente real sin que `ChatWidget` ni `useChat` cambien.
 */
export interface ChatTransport {
  connect(): Promise<void>;
  disconnect(): void;
  sendMessage(content: string): Promise<void>;
  onEvent(listener: ChatTransportEventListener): () => void;
}
