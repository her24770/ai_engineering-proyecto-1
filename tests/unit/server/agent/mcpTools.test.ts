// @vitest-environment node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createMcpExecutor } from "../../../../server/src/agent/mcpTools.ts";

/** MCP server de prueba en memoria, con la misma forma que el de TMDB. */
async function connectFakeServer(): Promise<Client> {
  const server = new McpServer({ name: "fake-tmdb", version: "0.0.0" });
  server.registerTool(
    "search_movie",
    { description: "Busca películas", inputSchema: { query: z.string() } },
    async ({ query }) => ({
      content: [{ type: "text", text: `resultados de ${query}` }],
    }),
  );
  server.registerTool(
    "get_movie_details",
    { description: "Detalle", inputSchema: { movie_id: z.number() } },
    async ({ movie_id }) => ({
      content: [{ type: "text", text: "ignorado" }],
      structuredContent: { id: movie_id, title: "Dune" },
    }),
  );
  server.registerTool("broken", {}, async () => ({
    content: [{ type: "text", text: "límite diario agotado" }],
    isError: true,
  }));
  server.registerTool("image_only", {}, async () => ({
    content: [{ type: "image", data: "", mimeType: "image/png" }],
  }));

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "0.0.0" });
  await client.connect(clientTransport);
  return client;
}

describe("createMcpExecutor", () => {
  it("expone las herramientas del MCP server como specs para el LLM", async () => {
    const executor = await createMcpExecutor([await connectFakeServer()]);
    const search = executor.specs.find((spec) => spec.name === "search_movie");
    expect(search?.description).toBe("Busca películas");
    expect(search?.parameters).toMatchObject({
      type: "object",
      properties: { query: { type: "string" } },
    });
  });

  it("llama herramientas y convierte el resultado en texto", async () => {
    const executor = await createMcpExecutor([await connectFakeServer()]);
    expect(await executor.call("search_movie", { query: "Dune" })).toBe(
      "resultados de Dune",
    );
    expect(
      JSON.parse(await executor.call("get_movie_details", { movie_id: 438631 })),
    ).toEqual({
      id: 438631,
      title: "Dune",
    });
    expect(await executor.call("broken", {})).toBe("ERROR: límite diario agotado");
    expect(await executor.call("image_only", {})).toBe("");
  });

  it("falla con herramientas desconocidas", async () => {
    const executor = await createMcpExecutor([]);
    expect(executor.specs).toEqual([]);
    await expect(executor.call("nada", {})).rejects.toThrow(/desconocida/);
  });
});
