# MCP Server de Libros (`server/mcp/books/`)

Servidor **Model Context Protocol (MCP)** que conecta el agente de AGIChat con la **Google Books API** para detectar si una película está basada en un libro, obtener sus datos verificados y devolver el enlace oficial (`books_url`).

## Estructura y responsabilidades

- [`matcher.ts`](./matcher.ts): Heurística de coincidencia película → libro (`scoreVolumeMatch`, `pickBestBookMatch`), descarte de material derivado no oficial (_study guides_, _summaries_, etc.) y sanitización contra **OWASP LLM01** (`sanitizeDescription`, `sanitizeBooksUrl`).
- [`googleBooksClient.ts`](./googleBooksClient.ts): Cliente HTTP con `fetch` inyectable, timeout por petición (5 s), caché LRU en memoria (TTL 24 h) y control estricto de cuota diaria (**1,000 requests/día**).
- [`server.ts`](./server.ts): Registro de la herramienta `search_book` sobre `McpServer` (`@modelcontextprotocol/sdk`) con validación de esquema de entrada y salida en `zod`.
- [`index.ts`](./index.ts): Punto de entrada ejecutable por `stdio` y re-exportaciones para uso directo en proceso.

## Contrato de la herramienta `search_book`

- **Entrada (`SearchBookInput`):**
  - `title` (`string`, obligatorio, 1–200 caracteres)
  - `author` (`string`, opcional, 1–120 caracteres)
- **Salida (`BookSearchResult`):**
  ```json
  {
    "found": true,
    "title": "Dune",
    "authors": ["Frank Herbert"],
    "description": "Sinopsis limpia sin HTML y acotada a 500 caracteres...",
    "rating": 4.5,
    "books_url": "https://books.google.com/books/about/Dune.html?id=..."
  }
  ```
  Si no existe coincidencia confiable (`score < 0.6`), devuelve `found: false` y el resto de campos en `null` (`authors: []`).

## Cómo usarlo desde el Agente (Persona 4)

### Opción A: En el mismo proceso (recomendado para tests o baja latencia)

```ts
import { GoogleBooksClient, createBooksMcpServer } from "../mcp/books/index.ts";

const booksClient = new GoogleBooksClient({ apiKey: config.googleBooksApiKey! });
const mcpServer = createBooksMcpServer(booksClient);
```

### Opción B: Como subproceso MCP vía `stdio`

```bash
node server/mcp/books/index.ts
```

Requiere la variable de entorno `GOOGLE_BOOKS_API_KEY` definida en `.env`.
