import type { ChatTransport } from "../ChatTransport";
import {
  generateResponse,
  getRandomDelay,
  getRandomChunkSize,
  getRandomTypingDelay,
} from "./ResponsesEngine";
import type {
  ChatMessage,
  ChatTransportEvent,
  ChatTransportEventListener,
} from "../../types";

// const CANNED_RESPONSE =
//   "¡Hola! Soy un **agente simulado**. Todavia no estoy conectado a un modelo real, " +
//   "pero ya puedo mostrar *Markdown*, por ejemplo:\n\n" +
//   "- listas\n" +
//   "- `codigo en linea`\n" +
//   "- **texto en negrita**\n\n" +
//   "Esto se reemplazara por una conexion real en la fase 2 del proyecto.";

/**
 * Implementacion simulada del contrato `ChatTransport`. Emula latencia de
 * red y streaming de texto token a token. Puede extenderse (indicadores de
 * error, respuestas mas variadas, un WebSocket real de por medio) sin tocar
 * la UI, ya que todo pasa por la interfaz `ChatTransport`.
 */
export class MockTransport implements ChatTransport {
  private listeners = new Set<ChatTransportEventListener>();
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
    this.listeners.clear();
  }

  onEvent(listener: ChatTransportEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async sendMessage(content: string): Promise<void> {
    const response = generateResponse(content);


    if (!this.connected) {
      throw new Error("MockTransport: llama a connect() antes de sendMessage()");
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content,
      createdAt: Date.now(),
      status: "sent",
    };
    this.emit({ type: "message", message: userMessage });
    this.emit({ type: "typing", isTyping: true });



    // await delay(500);
    await delay(getRandomDelay());

    const agentMessageId = createId();
    this.emit({
      type: "message",
      message: {
        id: agentMessageId,
        role: "agent",
        content: "",
        createdAt: Date.now(),
        status: "sending",
      },
    });

    const chunkSize = getRandomChunkSize();
    const typingDelay = getRandomTypingDelay();

    await this.streamResponse(agentMessageId, response, chunkSize, typingDelay,);

    this.emit({ type: "typing", isTyping: false });
    this.emit({ type: "message-complete", id: agentMessageId });
  }

  private async streamResponse(id: string, text: string, chunkSize: number, typingDelay: number): Promise<void> {
    for (let i = 0; i < text.length; i += chunkSize) {
      // await delay(20);
      await delay(typingDelay);
      this.emit({ type: "message-chunk", id, delta: text.slice(i, i + chunkSize) });
    }
  }

  private emit(event: ChatTransportEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
