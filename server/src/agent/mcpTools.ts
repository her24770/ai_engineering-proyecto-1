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
  return result.isError ? `ERROR: ${text}` : text;
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
