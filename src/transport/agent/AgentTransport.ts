import type { ChatTransport } from "../ChatTransport";
import type {
  ChatMessage,
  ChatTransportEvent,
  ChatTransportEventListener,
} from "../../types";

export interface AgentTransportOptions {
  /** Endpoint del agente. Por defecto `/api/chat`. */
  endpoint?: string;
  fetchFn?: typeof fetch;
}

type HistoryRole = "user" | "assistant";

interface HistoryItem {
  role: HistoryRole;
  content: string;
}

/** Eventos SSE de `POST /api/chat`. */
type ServerEvent =
  | { type: "delta"; text: string }
  | { type: "poster"; url: string }
  | { type: "open-url"; url: string }
  | { type: "done" }
  | { type: "error"; error: string };

/** El servidor valida 1..30 mensajes por petición. */
const MAX_HISTORY = 30;
const GENERIC_ERROR = "No se pudo conectar con el agente. Intenta de nuevo.";

/**
 * Adaptador del puerto `ChatTransport` contra el backend real. El servidor
 * no guarda estado, así que el historial vive aquí y se envía completo en
 * cada petición. La respuesta llega por SSE sobre un POST.
 */
export class AgentTransport implements ChatTransport {
  private listeners = new Set<ChatTransportEventListener>();
  private history: HistoryItem[] = [];
  private connected = false;
  private abortController: AbortController | null = null;
  private readonly endpoint: string;
  private readonly fetchFn: typeof fetch;

  constructor(options: AgentTransportOptions = {}) {
    this.endpoint = options.endpoint ?? "/api/chat";
    this.fetchFn = options.fetchFn ?? ((...args) => fetch(...args));
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
    this.abortController?.abort();
    this.abortController = null;
    this.listeners.clear();
  }

  onEvent(listener: ChatTransportEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async sendMessage(content: string): Promise<void> {
    if (!this.connected) {
      throw new Error("AgentTransport: llama a connect() antes de sendMessage()");
    }
    const text = content.trim();
    if (!text) return;

    this.emit({
      type: "message",
      message: { id: createId(), role: "user", content: text, createdAt: Date.now(), status: "sent" },
    });
    this.emit({ type: "typing", isTyping: true });

    const controller = new AbortController();
    this.abortController = controller;
    const messages = [...this.history, { role: "user" as const, content: text }].slice(-MAX_HISTORY);

    try {
      const reply = await this.streamReply(messages, controller.signal);
      // Solo se guarda el turno si el agente respondió: el historial siempre alterna.
      this.history.push({ role: "user", content: text });
      if (reply) this.history.push({ role: "assistant", content: reply });
    } catch (err) {
      if (!controller.signal.aborted) {
        this.emit({ type: "error", error: err instanceof Error ? err.message : GENERIC_ERROR });
      }
    } finally {
      if (this.abortController === controller) this.abortController = null;
      if (!controller.signal.aborted) this.emit({ type: "typing", isTyping: false });
    }
  }

  /** Lee el SSE, emite eventos al widget y devuelve el texto completo del agente. */
  private async streamReply(messages: HistoryItem[], signal: AbortSignal): Promise<string> {
    const response = await this.fetchFn(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal,
    });

    if (!response.ok) {
      throw new Error(await errorFromResponse(response));
    }
    if (!response.body) {
      throw new Error(GENERIC_ERROR);
    }

    let agentId: string | null = null;
    let posterUrl: string | undefined;
    let reply = "";

    const handle = (event: ServerEvent): void => {
      switch (event.type) {
        case "poster":
          // Llega antes que el texto: se adjunta al mensaje del agente.
          if (agentId === null) posterUrl = event.url;
          break;
        case "open-url":
          this.emit({ type: "open-url", url: event.url });
          break;
        case "delta":
          if (agentId === null) {
            agentId = createId();
            const message: ChatMessage = {
              id: agentId,
              role: "agent",
              content: event.text,
              createdAt: Date.now(),
              status: "sending",
              ...(posterUrl ? { posterUrl } : {}),
            };
            this.emit({ type: "message", message });
          } else {
            this.emit({ type: "message-chunk", id: agentId, delta: event.text });
          }
          reply += event.text;
          break;
        case "error":
          if (agentId !== null) this.emit({ type: "message-complete", id: agentId, status: "error" });
          throw new Error(event.error);
        case "done":
          break;
      }
    };

    await readSse(response.body, handle);
    if (agentId !== null) this.emit({ type: "message-complete", id: agentId });
    return reply;
  }

  private emit(event: ChatTransportEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }
}

async function readSse(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: ServerEvent) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const flush = (block: string): void => {
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) return;
    const event = parseServerEvent(data);
    if (event) onEvent(event);
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
    let boundary = buffer.indexOf("\n\n");
    while (boundary !== -1) {
      flush(buffer.slice(0, boundary));
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf("\n\n");
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) flush(buffer);
}

function parseServerEvent(data: string): ServerEvent | null {
  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const event = raw as Record<string, unknown>;
  switch (event.type) {
    case "delta":
      return typeof event.text === "string" ? { type: "delta", text: event.text } : null;
    case "poster":
    case "open-url":
      return typeof event.url === "string" ? { type: event.type, url: event.url } : null;
    case "error":
      return { type: "error", error: typeof event.error === "string" ? event.error : GENERIC_ERROR };
    case "done":
      return { type: "done" };
    default:
      return null;
  }
}

async function errorFromResponse(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    if (typeof data === "object" && data !== null && "error" in data) {
      const { error } = data as { error: unknown };
      if (typeof error === "string") return error;
    }
  } catch {
    // Cuerpo no JSON: se usa el mensaje genérico.
  }
  return response.status === 429
    ? "Hay muchas solicitudes. Espera unos segundos e intenta de nuevo."
    : GENERIC_ERROR;
}

function createId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
