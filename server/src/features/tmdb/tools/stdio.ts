
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { loadConfig, requireKey } from "../../../config.ts";
import { createTmdbClient } from "../tmdbClient.ts";
import { createTmdbMcpServer } from "./mcpServer.ts";

const config = loadConfig(process.env);
const apiKey = requireKey(config.tmdbApiKey, "TMDB_API_KEY");

const client = createTmdbClient(apiKey);

void serveStdio(() => createTmdbMcpServer(client));
