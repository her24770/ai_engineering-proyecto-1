import {
  INPUT_REFUSAL,
  LEAK_REFUSAL,
  allowedUrl,
  checkInput,
  leaksSystemPrompt,
  wrapUntrusted,
} from "./guardrails.ts";
import type { ToolExecutor } from "./mcpTools.ts";
import type { Llm, LlmMessage, ToolCall, ToolSpec } from "./openai.ts";
import { SYSTEM_PROMPT } from "./systemPrompt.ts";

/** Eventos que el agente emite hacia el widget (viajan por SSE). */
export type AgentEvent =
  | { type: "delta"; text: string }
  | { type: "poster"; url: string }
  | { type: "open-url"; url: string };

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AgentDeps {
  llm: Llm;
  tools: ToolExecutor;
  /** Máximo de rondas de herramientas por mensaje (evita bucles y gasto). */
  maxSteps?: number;
}

export const OPEN_URL_HOSTS = [
  "www.imdb.com",
  "imdb.com",
  "m.imdb.com",
  "books.google.com",
] as const;
export const POSTER_HOSTS = ["image.tmdb.org"] as const;

export const STEP_LIMIT_MESSAGE =
  "No pude completar la solicitud con la información disponible. ¿Puedes reformularla?";

/** Herramientas de interfaz: no son MCP, se convierten en eventos para el widget. */
const UI_TOOLS: ToolSpec[] = [
  {
    name: "open_url",
    description:
      "Abre en una pestaña nueva del usuario una página de IMDb o de Google Books.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "imdb_url o books_url devuelto por una herramienta",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "show_poster",
    description: "Muestra al usuario el póster de la película recomendada.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "poster_url devuelto por TMDB" },
      },
      required: ["url"],
    },
  },
];

function parseArgs(raw: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === "object" && value !== null
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function executeTool(
  call: ToolCall,
  tools: ToolExecutor,
  emit: (event: AgentEvent) => void,
): Promise<string> {
  const name = call.function.name;
  const args = parseArgs(call.function.arguments);

  if (name === "open_url" || name === "show_poster") {
    const isOpen = name === "open_url";
    const url = allowedUrl(args.url, isOpen ? OPEN_URL_HOSTS : POSTER_HOSTS);
    if (!url) return "Rechazado: dominio no permitido.";
    emit({ type: isOpen ? "open-url" : "poster", url });
    return "Hecho.";
  }

  try {
    return wrapUntrusted(name, await tools.call(name, args));
  } catch (err) {
    return `ERROR: ${err instanceof Error ? err.message : "la herramienta falló"}`;
  }
}

/**
 * Agente orquestador (centralizado): un único LLM decide qué herramienta
 * llamar en cada ronda hasta tener la respuesta final. La respuesta se
 * revisa completa antes de enviarse para poder bloquear filtraciones (LLM07).
 */
export async function runAgent(
  history: ChatTurn[],
  deps: AgentDeps,
  emit: (event: AgentEvent) => void,
): Promise<void> {
  const userTurns = history.filter((turn) => turn.role === "user");
  if (userTurns.some((turn) => !checkInput(turn.content).ok)) {
    emit({ type: "delta", text: INPUT_REFUSAL });
    return;
  }

  const messages: LlmMessage[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];
  const specs = [...deps.tools.specs, ...UI_TOOLS];
  const maxSteps = deps.maxSteps ?? 5;

  for (let step = 0; step < maxSteps; step++) {
    const reply = await deps.llm(messages, specs);

    if (!reply.tool_calls?.length) {
      const text = reply.content ?? "";
      emit({ type: "delta", text: leaksSystemPrompt(text) ? LEAK_REFUSAL : text });
      return;
    }

    messages.push({
      role: "assistant",
      content: reply.content,
      tool_calls: reply.tool_calls,
    });
    for (const call of reply.tool_calls) {
      const output = await executeTool(call, deps.tools, emit);
      messages.push({ role: "tool", tool_call_id: call.id, content: output });
    }
  }

  emit({ type: "delta", text: STEP_LIMIT_MESSAGE });
}
