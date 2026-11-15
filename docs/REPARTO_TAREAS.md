# Proyecto 2: reparto de tareas

Continuación del Proyecto 1: el widget de chat ahora habla con un **agente real** que recomienda películas (TMDB), las compara con su libro (Google Books), muestra el póster y abre IMDb o Google Books en una pestaña nueva. Las herramientas se exponen como **MCP servers** y el agente se defiende de **LLM01** (prompt injection) y **LLM07** (fuga del system prompt).

Somos 6. Cada quien lleva un frente, pero **todos deben poder explicar el sistema completo** en la presentación (vale 20 pts).

## Reglas del equipo

- **Flujo:** rama corta desde `develop` → PR hacia `develop` → CI en verde → merge. `develop` pasa a `main` por PR al entregar.
- Commits pequeños, con mensajes descriptivos (Conventional Commits, en español).
- Cobertura mayor a 80 % (líneas, funciones, ramas y sentencias). CI en verde.
- Antes del PR: `npm run lint`, `npm run typecheck`, `npm run test:coverage` y `npm run build`.
- Sin `any`. No importar adaptadores concretos desde `components/` ni `state/`; la UI solo habla con `ChatTransport`.
- No usar `eval`, no desactivar la sanitización de Markdown.
- Dependencia nueva = justificarla en el PR.
- **Las API keys nunca van en el repo.** Cada quien usa su `.env` local (copia de `.env.example`).
- Código del servidor: en `server/src/`, imports con extensión `.ts` y sin `enum`, `namespace` ni parameter properties. Ver `docs/INFRAESTRUCTURA.md`.

## Contrato compartido (acordar primero)

Todos dependen de esto. **La Persona 1 lo cierra en un PR corto antes de que arranquen los demás.**

**Herramientas MCP de TMDB** (`server/mcp/tmdb/`):

| Herramienta | Entrada | Salida |
|---|---|---|
| `search_movie` | `query` | lista de `{id, title, year, overview, poster_url}` |
| `get_recommendations` | `movie_id` o `genre` | lista de películas |
| `get_movie_details` | `movie_id` | `{id, title, year, overview, rating, poster_url, imdb_url}` |

**Herramientas MCP de libros** (`server/mcp/books/`):

| Herramienta | Entrada | Salida |
|---|---|---|
| `search_book` | `title`, `author?` | `{found, title, authors, description, rating, books_url}` |

**Widget:** `ChatTransport` gana un evento `{type: "open-url", url}`, y `ChatMessage` soporta un póster opcional. Es el único cambio permitido al contrato de la UI.

**Variables de entorno:** `OPENAI_API_KEY`, `TMDB_API_KEY`, `GOOGLE_BOOKS_API_KEY` (ya están en `.env.example`).

## Frentes

### 1. Contrato y coordinación — `feat/contrato-p2`
Entrega primero (desbloquea al resto):
- Tipos del contrato MCP y del evento `open-url` en `src/types/`.
- Estructura de carpetas `server/mcp/tmdb/`, `server/mcp/books/`, `evals/`.
- Actualizar `docs/ESTRUCTURA_CARPETAS.md` y `docs/ARQUITECTURA.md` con la parte del agente.
- Después: coordinar PRs y ayudar a integrar. Mantener el README al día.

### 2. MCP TMDB — `feat/mcp-tmdb`
- MCP server (SDK oficial) con las 3 herramientas.
- Cliente HTTP a TMDB con `fetch` inyectable (para tests sin red).
- `poster_url` completo (`https://image.tmdb.org/t/p/w500/...`) e `imdb_url` (`https://www.imdb.com/title/<imdb_id>`).
- Caché en memoria y manejo del límite de 1000 requests al día (error claro al agotarlo).
- Tests con respuestas simuladas.

### 3. MCP Libros — `feat/mcp-books`
- MCP server con `search_book` sobre Google Books.
- Detectar si la película **tiene libro**: devolver `found: false` si no hay coincidencia confiable.
- Incluir `books_url` para abrirlo en el navegador.
- Caché y límite diario, igual que TMDB. Tests con respuestas simuladas.

### 4. Agente y guardrails — `feat/agent-backend` (el más pesado)
- Orquestador con OpenAI y tool use, conectado a los dos MCP. Empezar con herramientas simuladas para no bloquearse.
- System prompt que **anuncia al usuario qué sabe hacer** (recomendar, comparar con libro y decir si vale la pena, abrir IMDb y Google Books).
- Endpoint de streaming (SSE) registrado en `routes` de `server/src/app.ts` (`POST /api/chat`).
- **LLM01:** filtrar la entrada, tratar lo que devuelven las herramientas como datos no confiables, no ejecutar instrucciones incrustadas.
- **LLM07:** el system prompt no se revela y no contiene secretos.
- Diagrama de bajo nivel de la organización de los agentes y su clasificación (propuesta: centralizado / jerárquico).

### 5. Widget — `feat/agent-transport`
- `AgentTransport` que implementa `ChatTransport` contra `/api/chat` (SSE).
- Manejo del evento `open-url` con `window.open`, y link de respaldo si el navegador bloquea el popup.
- Mostrar el **póster** de la película. En el sanitizador de Markdown, permitir imágenes **solo** de `image.tmdb.org`.
- **Logo y texto de atribución de TMDB**, según su manual de uso (obligatorio por licencia).
- Tests de UI; mantener la cobertura.

### 6. Evals y calidad — `feat/evals`
- Carpeta `evals/` con casos funcionales: recomienda una película, compara con libro, dice si vale la pena, abre links.
- Casos adversariales: **LLM01** (inyección directa e indirecta, por ejemplo instrucciones escondidas en la sinopsis de una película) y **LLM07** (intentos de extraer el system prompt).
- Script que corre los casos contra el agente y genera un reporte de resultados.
- Documentación para la presentación y justificación de decisiones.

### Infraestructura — ya hecha (Persona de infra)
Servidor, Docker, nginx, dominio `agichat.jhgo.online`, CI, backend base (`/health`, CORS, rate limit), diagrama de alto nivel y guía en `docs/INFRAESTRUCTURA.md`. Pendiente: deploy manual desde `develop` y cargar las API keys en el servidor.

## Keys: quién las consigue

| Key | Quién | Nota |
|---|---|---|
| OpenAI | Persona 4 (o quien tenga saldo) | API key de platform.openai.com, no la suscripción de ChatGPT |
| TMDB | Persona 2 | Declarar: estudiantes del curso CC3116 de la UVG, uso no comercial |
| Google Books | Persona 3 | Sin tarjeta de crédito. No activar la prueba gratuita de Cloud |

Las keys de producción las carga infraestructura en el `.env` del servidor.

## Orden de trabajo

1. **Contrato** (Persona 1) en un PR corto.
2. **En paralelo:** 2, 3 y 5 con sus herramientas y la UI; 4 con el agente sobre herramientas simuladas; 6 con los casos de eval.
3. **Integración:** el agente conecta los MCP reales; infraestructura despliega a mano.
4. **Evals** contra el agente desplegado, correcciones y ensayo de la presentación.

## Entregables de la nota

- Repo funcionando, con Github Flow y cobertura mayor a 80 %.
- Evals contra LLM01 y LLM07.
- Diagrama de alto nivel (ver `docs/INFRAESTRUCTURA.md`) y diagrama de bajo nivel de los agentes.
- Herramientas abstraídas como MCP servers.
- Poder justificar cada decisión.
