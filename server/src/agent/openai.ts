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

export interface OpenAiOptions {
  apiKey: string | undefined;
  model: string;
  baseUrl: string;
  fetch?: typeof fetch;
}

/**
 * Adaptador a la API de Chat Completions de OpenAI con `fetch` (sin SDK).
 * `baseUrl` permite usar cualquier proveedor compatible con la API de OpenAI.
 */
export function createOpenAiLlm(options: OpenAiOptions): Llm {
  const doFetch = options.fetch ?? fetch;

  return async (messages, tools) => {
    const apiKey = requireKey(options.apiKey, "OPENAI_API_KEY");
    const res = await doFetch(`${options.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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
