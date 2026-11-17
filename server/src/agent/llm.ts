import { requireKey } from "../config.ts";

/** Herramienta en el formato que entiende el LLM (JSON Schema en `parameters`). */
export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type LlmMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface LlmReply {
  content: string | null;
  tool_calls?: ToolCall[];
}

/** Puerto del modelo: el agente no sabe qué proveedor hay detrás. */
export type Llm = (messages: LlmMessage[], tools: ToolSpec[]) => Promise<LlmReply>;

export interface LlmOptions {
  apiKey: string | undefined;
  model: string;
  baseUrl: string;
  fetch?: typeof fetch;
  /** Inyectable para tests. */
  sleep?: (ms: number) => Promise<void>;
}

/** Espera máxima antes de reintentar un 429; si el proveedor pide más, se falla. */
const MAX_RETRY_WAIT_MS = 10_000;

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Decide si vale la pena reintentar una vez y cuánto esperar:
 * - 429: límite por minuto del free tier; se respeta `retry-after`.
 * - 400 `tool_use_failed`: el modelo generó una llamada a herramienta mal
 *   formada (ocurre de vez en cuando con modelos abiertos en Groq).
 */
async function retryDelay(res: Response): Promise<number | null> {
  if (res.status === 429) {
    const seconds = Number(res.headers.get("retry-after") ?? "1");
    const ms = (Number.isFinite(seconds) ? seconds : 1) * 1000;
    return ms <= MAX_RETRY_WAIT_MS ? ms : null;
  }
  if (res.status === 400 && (await res.text()).includes("tool_use_failed")) {
    return 0;
  }
  return null;
}

/**
 * Adaptador a cualquier API compatible con Chat Completions de OpenAI
 * (Groq por defecto, OpenAI u otros) usando `fetch`, sin SDK.
 */
export function createLlm(options: LlmOptions): Llm {
  const doFetch = options.fetch ?? fetch;
  const sleep = options.sleep ?? defaultSleep;

  return async (messages, tools) => {
    const apiKey = requireKey(options.apiKey, "LLM_API_KEY");
    const request = () =>
      doFetch(`${options.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: options.model,
          temperature: 0.3,
          messages,
          tools:
            tools.length > 0
              ? tools.map((tool) => ({ type: "function", function: tool }))
              : undefined,
        }),
      });

    let res = await request();
    if (!res.ok) {
      const delay = await retryDelay(res);
      if (delay !== null) {
        await sleep(delay);
        res = await request();
      }
    }
    if (!res.ok) {
      throw new Error(`El LLM respondió con estado ${res.status}`);
    }
    const data = (await res.json()) as { choices?: { message?: LlmReply }[] };
    const message = data.choices?.[0]?.message;
    if (!message) {
      throw new Error("Respuesta vacía del LLM");
    }
    return { content: message.content ?? null, tool_calls: message.tool_calls };
  };
}
