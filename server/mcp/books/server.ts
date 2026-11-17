import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BookSearchResult, SearchBookInput } from "../contracts.ts";
import { BooksApiError, BooksQuotaExceededError } from "./googleBooksClient.ts";

export interface BooksSearchService {
  searchBook(input: SearchBookInput): Promise<BookSearchResult>;
}

export const searchBookInputSchema = {
  title: z
    .string()
    .trim()
    .min(1, "El titulo es obligatorio")
    .max(200, "El titulo no puede exceder 200 caracteres")
    .describe("Titulo de la pelicula o del libro a buscar en Google Books"),
  author: z
    .string()
    .trim()
    .min(1)
    .max(120, "El autor no puede exceder 120 caracteres")
    .optional()
    .describe("Nombre del autor del libro (opcional, mejora la precision)"),
};

export const searchBookOutputSchema = {
  found: z.boolean(),
  title: z.string().nullable(),
  authors: z.array(z.string()),
  description: z.string().nullable(),
  rating: z.number().nullable(),
  books_url: z.string().nullable(),
};

/**
 * Crea una instancia del servidor MCP de Libros con la herramienta `search_book`
 * registrada. Acepta cualquier implementacion de `BooksSearchService` (cliente
 * real de Google Books o doble de prueba).
 */
export function createBooksMcpServer(service: BooksSearchService): McpServer {
  const server = new McpServer({
    name: "agichat-books-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "search_book",
    {
      title: "Buscar libro en Google Books",
      description:
        "Busca si una pelicula tiene un libro asociado en Google Books y devuelve su informacion verificada y enlace oficial.",
      inputSchema: searchBookInputSchema,
      outputSchema: searchBookOutputSchema,
    },
    async ({ title, author }) => {
      try {
        const result = await service.searchBook({ title, author });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result),
            },
          ],
          structuredContent: { ...result },
        };
      } catch (error) {
        const message =
          error instanceof BooksQuotaExceededError || error instanceof BooksApiError
            ? error.message
            : "Error inesperado al consultar el servicio de libros";

        return {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: message }),
            },
          ],
        };
      }
    },
  );

  return server;
}

