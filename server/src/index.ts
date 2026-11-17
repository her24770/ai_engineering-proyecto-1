import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createApp, routeKey } from "./app.ts";
import { loadConfig } from "./config.ts";
import { createChatHandler } from "./agent/chatRoute.ts";
import { createMcpExecutor } from "./agent/mcpTools.ts";
import { createLlm } from "./agent/llm.ts";

/** Punto de entrada (stdio) de cada MCP server. Acordado con Personas 2 y 3. */
const MCP_SERVERS = ["../mcp/tmdb/index.ts", "../mcp/books/index.ts"].map((path) =>
  fileURLToPath(new URL(path, import.meta.url)),
);

function stringEnv(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => entry[1] !== undefined,
    ),
  );
}

/** Conecta un MCP server por stdio. Si falta o falla, el agente arranca sin él. */
async function connectMcp(entry: string): Promise<Client | null> {
  if (!existsSync(entry)) {
    console.warn(`MCP server no encontrado, se omite: ${entry}`);
    return null;
  }
  try {
    const client = new Client({ name: "agichat-agent", version: "0.1.0" });
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [entry],
        env: stringEnv(),
      }),
    );
    return client;
  } catch (err) {
    console.error(`No se pudo conectar al MCP server ${entry}:`, err);
    return null;
  }
}

const config = loadConfig(process.env);
const clients = (await Promise.all(MCP_SERVERS.map(connectMcp))).filter(
  (client): client is Client => client !== null,
);
const tools = await createMcpExecutor(clients);
const llm = createLlm({
  apiKey: config.llmApiKey,
  model: config.llmModel,
  baseUrl: config.llmBaseUrl,
});

const server = createApp(config, {
  [routeKey("POST", "/api/chat")]: createChatHandler({ llm, tools }),
});

server.listen(config.port, () => {
  console.log(
    `agichat-server escuchando en :${config.port} (${tools.specs.length} herramientas MCP)`,
  );
});

function shutdown(): void {
  server.close(() => {
    Promise.all(clients.map((client) => client.close())).finally(() => process.exit(0));
  });
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
