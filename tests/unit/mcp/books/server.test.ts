import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { BooksQuotaExceededError } from "../../../../server/mcp/books/googleBooksClient.ts";
import {
  createBooksMcpServer,
  type BooksSearchService,
} from "../../../../server/mcp/books/server.ts";

async function connectInMemory(service: BooksSearchService) {
  const server = createBooksMcpServer(service);
  const client = new Client({ name: "test-agent-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    close: async () => {
      await Promise.all([client.close(), server.close()]);
    },
  };
}

describe("createBooksMcpServer", () => {
  it("expone la herramienta search_book y devuelve el contrato BookSearchResult", async () => {
    const service: BooksSearchService = {
      searchBook: vi.fn().mockResolvedValue({
        found: true,
        title: "The Martian",
        authors: ["Andy Weir"],
        description: "Stranded on Mars.",
        rating: 4.6,
        books_url: "https://books.google.com/books?id=martian",
      }),
    };

    const { client, close } = await connectInMemory(service);
    try {
      const tools = await client.listTools();
      expect(tools.tools.map((t) => t.name)).toEqual(["search_book"]);

      const response = await client.callTool({
        name: "search_book",
        arguments: { title: "The Martian", author: "Andy Weir" },
      });

      expect(response.isError).toBeFalsy();
      expect(response.structuredContent).toEqual({
        found: true,
        title: "The Martian",
        authors: ["Andy Weir"],
        description: "Stranded on Mars.",
        rating: 4.6,
        books_url: "https://books.google.com/books?id=martian",
      });
    } finally {
      await close();
    }
  });

  it("devuelve isError: true con mensaje claro cuando se agota la cuota diaria o falla el servicio", async () => {
    const service: BooksSearchService = {
      searchBook: vi
        .fn()
        .mockRejectedValueOnce(new BooksQuotaExceededError(1000))
        .mockRejectedValueOnce(new Error("Fallo inesperado interno")),
    };

    const { client, close } = await connectInMemory(service);
    try {
      const quotaRes = await client.callTool({
        name: "search_book",
        arguments: { title: "Dune" },
      });

      expect(quotaRes.isError).toBe(true);
      const firstContent = (quotaRes.content as Array<{ type: string; text: string }>)[0];
      expect(firstContent?.text).toContain("1000");

      const genericRes = await client.callTool({
        name: "search_book",
        arguments: { title: "Dune" },
      });
      expect(genericRes.isError).toBe(true);
      const genericContent = (
        genericRes.content as Array<{ type: string; text: string }>
      )[0];
      expect(genericContent?.text).toContain("Error inesperado");
    } finally {
      await close();
    }
  });
});
