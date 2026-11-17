import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, requireKey } from "../../src/config.ts";
import { GoogleBooksClient } from "./googleBooksClient.ts";
import { createBooksMcpServer } from "./server.ts";

export {
  BooksApiError,
  BooksQuotaExceededError,
  GoogleBooksClient,
  type GoogleBooksClientOptions,
} from "./googleBooksClient.ts";
export {
  createNotFoundResult,
  normalizeText,
  pickBestBookMatch,
  sanitizeBooksUrl,
  sanitizeDescription,
  scoreVolumeMatch,
} from "./matcher.ts";
export { createBooksMcpServer, type BooksSearchService } from "./server.ts";

async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const apiKey = requireKey(config.googleBooksApiKey, "GOOGLE_BOOKS_API_KEY");

  const client = new GoogleBooksClient({ apiKey });
  const server = createBooksMcpServer(client);
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

// Solo inicia el transporte stdio cuando se ejecuta directamente como script
const isDirectExecution =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]) &&
  process.argv[1].replace(/\\/g, "/").endsWith("server/mcp/books/index.ts");

if (isDirectExecution) {
  main().catch((err: unknown) => {
    const message =
      err instanceof Error ? err.message : "Error fatal al iniciar Books MCP";
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
