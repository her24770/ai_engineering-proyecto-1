import type { ChatTransport } from "../ChatTransport";
import type {
  ChatMessage,
  ChatTransportEvent,
  ChatTransportEventListener,
} from "../../types";
import {
  ErrorSimulator,
  getErrorMessage,
  type ErrorSimulatorConfig,
} from "./errorSimulator";

const CANNED_RESPONSE =
  "¡Hola! Soy un **agente simulado**. Todavia no estoy conectado a un modelo real, " +
  "pero ya puedo mostrar *Markdown*, por ejemplo:\n\n" +
  "- listas\n" +
  "- `codigo en linea`\n" +
  "- **texto en negrita**\n\n" +
  "Esto se reemplazara por una conexion real en la fase 2 del proyecto.";

const TIMEOUT_DELAY_MS = 4000;

export interface MockTransportOptions {
  /**
   * Configuracion (parcial) del simulador de errores. Por defecto el mock
   * no falla nunca de forma transitoria (`failureRate: 0`); pasa un
   * `failureRate` > 0 para probar como reacciona la UI a errores.
   */
  errorConfig?: Partial<ErrorSimulatorConfig>;
  /** Inyeccion directa del simulador, principalmente para tests. */
  errorSimulator?: ErrorSimulator;
}

/**
 * Implementacion simulada del contrato `ChatTransport`. Emula latencia de
 * red, streaming de texto token a token y, a traves de `ErrorSimulator`,
 * el "camino infeliz": mensajes invalidos, rate limiting y fallos
 * transitorios (timeout, desconexion a media respuesta, error de
 * servidor). Puede extenderse (mas variedad de respuestas, un WebSocket
 * real de por medio) sin tocar la UI, ya que todo pasa por la interfaz
 * `ChatTransport`.
 */
export class MockTransport implements ChatTransport {
  private listeners = new Set<ChatTransportEventListener>();
  private connected = false;
  private readonly errorSimulator: ErrorSimulator;

  constructor(options: MockTransportOptions = {}) {
    this.errorSimulator =
      options.errorSimulator ?? new ErrorSimulator(options.errorConfig);
  }

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
    if (!this.connected) {
      throw new Error("MockTransport: llama a connect() antes de sendMessage()");
    }

    const invalidKind = this.errorSimulator.validateInput(content);
    if (invalidKind) {
      this.emit({ type: "error", error: getErrorMessage(invalidKind) });
      return;
    }

    if (this.errorSimulator.checkRateLimit()) {
      this.emit({ type: "error", error: getErrorMessage("rate_limit") });
      return;
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

    const failureKind = this.errorSimulator.maybeFail();

    if (failureKind === "timeout") {
      await delay(TIMEOUT_DELAY_MS);
      this.emit({ type: "typing", isTyping: false });
      this.emit({ type: "error", error: getErrorMessage("timeout") });
      return;
    }

    await delay(500);

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

    if (failureKind === "server_error") {
      this.emit({ type: "typing", isTyping: false });
      this.emit({ type: "error", error: getErrorMessage("server_error") });
      this.emit({ type: "message-complete", id: agentMessageId, status: "error" });
      return;
    }

    const interruptAt =
      failureKind === "disconnect"
        ? this.errorSimulator.pickInterruptPoint(CANNED_RESPONSE.length)
        : null;

    await this.streamResponse(agentMessageId, CANNED_RESPONSE, interruptAt);

    this.emit({ type: "typing", isTyping: false });

    if (interruptAt !== null) {
      this.emit({ type: "error", error: getErrorMessage("disconnect") });
      this.emit({ type: "message-complete", id: agentMessageId, status: "error" });
      return;
    }

    this.emit({ type: "message-complete", id: agentMessageId });
  }

  private async streamResponse(
    id: string,
    text: string,
    interruptAt: number | null,
  ): Promise<void> {
    const chunkSize = 4;
    const limit = interruptAt ?? text.length;
    for (let i = 0; i < limit; i += chunkSize) {
      await delay(20);
      this.emit({
        type: "message-chunk",
        id,
        delta: text.slice(i, Math.min(i + chunkSize, limit)),
      });
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
