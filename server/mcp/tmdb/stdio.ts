import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig, requireKey } from "../../src/config.ts";
import { createTmdbClient } from "./tmdbClient.ts";
import { createTmdbMcpServer } from "./mcpServer.ts";

const config = loadConfig(process.env);
const apiKey = requireKey(config.tmdbApiKey, "TMDB_API_KEY");

const client = createTmdbClient(apiKey);
const server = createTmdbMcpServer(client);
const transport = new StdioServerTransport();

await server.connect(transport);