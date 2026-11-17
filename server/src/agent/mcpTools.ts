import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ToolSpec } from "./llm.ts";

/** Lo que el agente necesita de "las herramientas", sin importar de dónde vengan. */
export interface ToolExecutor {
  specs: ToolSpec[];
  call(name: string, args: Record<string, unknown>): Promise<string>;
}

interface ToolResultLike {
  content?: unknown;
  structuredContent?: unknown;
  isError?: unknown;
}

/** Presupuesto por resultado: el free tier de Groq permite ~8k tokens/min en total. */
const MAX_LIST_ITEMS = 5;
const MAX_STRING_CHARS = 300;
const MAX_OUTPUT_CHARS = 4000;

function shrink(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > MAX_STRING_CHARS
      ? `${value.slice(0, MAX_STRING_CHARS)}…`
      : value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, MAX_LIST_ITEMS).map(shrink);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, shrink(item)]),
    );
  }
  return value;
}

/**
 * Recorta lo que devuelve una herramienta antes de enviarlo al LLM: máximo
 * 5 elementos por lista y 300 caracteres por texto. Así el agente no depende
 * de que cada MCP server devuelva respuestas compactas.
 */
export function compactToolOutput(text: string): string {
  let compact: string;
  try {
    compact = JSON.stringify(shrink(JSON.parse(text)));
  } catch {
    compact = text;
  }
  return compact.length > MAX_OUTPUT_CHARS
    ? `${compact.slice(0, MAX_OUTPUT_CHARS)}…`
    : compact;
}

function resultToText(result: ToolResultLike): string {
  let text: string;
  if (result.structuredContent !== undefined) {
    text = JSON.stringify(result.structuredContent);
  } else if (Array.isArray(result.content)) {
    text = result.content
      .map((item: { type?: string; text?: string }) =>
        item.type === "text" ? item.text : "",
      )
      .join("\n");
  } else {
    text = "";
  }
  const compact = compactToolOutput(text);
  return result.isError ? `ERROR: ${compact}` : compact;
}

/**
 * Junta las herramientas de varios MCP servers (TMDB, libros...) en un solo
 * `ToolExecutor`. El agente solo habla MCP: cualquier otro agente puede
 * reutilizar los mismos servidores.
 */
export async function createMcpExecutor(clients: Client[]): Promise<ToolExecutor> {
  const owners = new Map<string, Client>();
  const specs: ToolSpec[] = [];

  for (const client of clients) {
    const { tools } = await client.listTools();
    for (const tool of tools) {
      owners.set(tool.name, client);
      specs.push({
        name: tool.name,
        description: tool.description ?? "",
        parameters: tool.inputSchema,
      });
    }
  }

  return {
    specs,
    async call(name, args) {
      const client = owners.get(name);
      if (!client) throw new Error(`Herramienta desconocida: ${name}`);
      const result = await client.callTool({ name, arguments: args });
      // `callTool` tipa también un formato legado; ambos encajan en ToolResultLike.
      return resultToText(result as ToolResultLike);
    },
  };
}
