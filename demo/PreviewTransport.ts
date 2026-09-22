import type { ChatTransport } from "../src/transport/ChatTransport";
import type { ChatMessage, ChatTransportEvent, ChatTransportEventListener } from "../src/types";
import { MARKDOWN_SAMPLES } from "./markdownSamples";

// Transport de solo lectura para el demo de markdown

export class PreviewTransport implements ChatTransport {
  private listeners = new Set<ChatTransportEventListener>();

  async connect(): Promise<void> {
    setTimeout(() => {
      MARKDOWN_SAMPLES.forEach((sample, index) => {
        const message: ChatMessage = {
          id: `preview-${index}`,
          role: "agent",
          content: `**${sample.title}**\n\n${sample.markdown}`,
          createdAt: Date.now(),
          status: "sent",
        };
        this.emit({ type: "message", message });
      });
    }, 0);
  }

  disconnect(): void {
    this.listeners.clear();
  }

  async sendMessage(): Promise<void> { //solo lectura
  }

  onEvent(listener: ChatTransportEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ChatTransportEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}
