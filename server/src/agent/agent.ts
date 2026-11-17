import {
  INPUT_REFUSAL,
  LEAK_REFUSAL,
  allowedUrl,
  checkInput,
  leaksSystemPrompt,
  wrapUntrusted,
} from "./guardrails.ts";
import type { ToolExecutor } from "./mcpTools.ts";
import type { Llm, LlmMessage, ToolCall, ToolSpec } from "./llm.ts";
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

/** Valida el dominio y convierte `open_url`/`show_poster` en un evento para el widget. */
function runUiTool(
  name: "open_url" | "show_poster",
  args: Record<string, unknown>,
  emit: (event: AgentEvent) => void,
): string {
  const isOpen = name === "open_url";
  const url = allowedUrl(args.url, isOpen ? OPEN_URL_HOSTS : POSTER_HOSTS);
  if (!url) return "Rechazado: dominio no permitido.";
  emit({ type: isOpen ? "open-url" : "poster", url });
  return "Hecho.";
}

/** 
 * En algunos casos el modelo escribe la llamada de una herramienta como texto y no usa el mecanismo real de tool calls
 * Se rescatan esas llamadas y se quitan del texto que ve el usuario
 */
const TEXT_UI_CALL_JSON = /<\|(show_poster|open_url)\|>?\s*(\{[^{}]*\})\s*\|?>/g;
const TEXT_UI_CALL_TAG =
  /<(show_poster|open_url)\s+url\s*=\s*["']([^"'<>]*)["']\s*\/?>(?:\s*<\/\1>)?/g;

const TEXT_UI_CALL_LINE = /(show_poster|open_url)/;
const HTTPS_URL = /https:\/\/[^\s"'<>|}]+/;

const POSTER_HEADING = /^[\s#>*_-]*p[óo]ster[\s:*_-]*$/i;

function withoutEmoji(line: string): string {
  return line.replace(/\p{Extended_Pictographic}/gu, "").replace(/[️‍]/g, "");
}

/** Quita los encabezados "Póster" sueltos que el modelo deja antes de la llamada. */
export function stripPosterHeadings(text: string): string {
  const lines = text.split("\n");
  const kept = lines.filter((line) => !POSTER_HEADING.test(withoutEmoji(line)));
  return kept.length === lines.length ? text : kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function extractTextUiCalls(
  text: string,
  emit: (event: AgentEvent) => void,
): string {
  const run = (name: string, args: Record<string, unknown>): string => {
    runUiTool(name as "open_url" | "show_poster", args, emit);
    return "";
  };
  const cleaned = text
    .replace(TEXT_UI_CALL_JSON, (_m, name: string, raw: string) => run(name, parseArgs(raw)))
    .replace(TEXT_UI_CALL_TAG, (_m, name: string, url: string) => run(name, { url }))
    .split("\n")
    .filter((line) => {
      // Red de seguridad: el modelo inventa formatos nuevos, una línea con marcas de
      // llamada, el nombre de la herramienta y una URL https se rescata y se borra.
      const match = TEXT_UI_CALL_LINE.exec(line);
      if (!match || !/[<{|]/.test(line)) return true;
      const url = HTTPS_URL.exec(line)?.[0];
      if (url) run(match[1], { url });
      return false;
    })
    .join("\n");
  return cleaned === text ? text : cleaned.replace(/\n{3,}/g, "\n\n").trim();
}

interface PosterCandidate {
  title: string;
  year: string;
  url: string;
  detailed: boolean;
}

/** Recoge de la salida de una herramienta MCP las películas que traen `poster_url`. */
function collectPosters(raw: string, toolName: string, into: PosterCandidate[]): void {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return;
  }
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "object" || value === null) return;
    const item = value as Record<string, unknown>;
    if (typeof item.title === "string" && typeof item.poster_url === "string") {
      into.push({
        title: item.title,
        year: typeof item.year === "string" ? item.year : "",
        url: item.poster_url,
        detailed: toolName === "get_movie_details",
      });
    }
    Object.values(item).forEach(visit);
  };
  visit(data);
}

/**
 * Elige el póster de la película de la que habla la respuesta final: gana la
 * que tiene el título más largo mencionado en el texto (y el año, si coincide).
 * Si ninguna se menciona, usa la última consultada con `get_movie_details`.
 */
function pickPoster(candidates: PosterCandidate[], text: string): string | null {
  const haystack = text.toLowerCase();
  let best: PosterCandidate | null = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const title = candidate.title.toLowerCase();
    if (!title || !haystack.includes(title)) continue;
    const score = title.length + (candidate.year && haystack.includes(candidate.year) ? 1000 : 0);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return (best ?? candidates.filter((c) => c.detailed).at(-1))?.url ?? null;
}

async function executeTool(
  call: ToolCall,
  tools: ToolExecutor,
  emit: (event: AgentEvent) => void,
  posters: PosterCandidate[],
): Promise<string> {
  const name = call.function.name;
  const args = parseArgs(call.function.arguments);

  if (name === "open_url" || name === "show_poster") {
    return runUiTool(name, args, emit);
  }

  try {
    const output = await tools.call(name, args);
    collectPosters(output, name, posters);
    return wrapUntrusted(name, output);
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
  send: (event: AgentEvent) => void,
): Promise<void> {
  let posterShown = false;
  const emit = (event: AgentEvent): void => {
    if (event.type === "poster") posterShown = true;
    send(event);
  };
  const posters: PosterCandidate[] = [];
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
      const text = stripPosterHeadings(extractTextUiCalls(reply.content ?? "", emit));
      // El póster no debe depender de que el modelo llame bien a show_poster:
      // si hay uno de la película recomendada y no se mostró, se emite aquí.
      if (!posterShown && !leaksSystemPrompt(text)) {
        const url = pickPoster(posters, text);
        if (url) runUiTool("show_poster", { url }, emit);
      }
      emit({ type: "delta", text: leaksSystemPrompt(text) ? LEAK_REFUSAL : text });
      return;
    }

    messages.push({
      role: "assistant",
      content: reply.content,
      tool_calls: reply.tool_calls,
    });
    for (const call of reply.tool_calls) {
      const output = await executeTool(call, deps.tools, emit, posters);
      messages.push({ role: "tool", tool_call_id: call.id, content: output });
    }
  }

  emit({ type: "delta", text: STEP_LIMIT_MESSAGE });
}
