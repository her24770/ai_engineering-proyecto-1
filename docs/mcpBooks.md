# Servidor MCP de Libros (Google Books)

## Descripción

El servidor **Model Context Protocol (MCP) de Libros** es el componente encargado de conectar el agente de AGIChat con la **Google Books API** para determinar si una película recomendada está basada en una obra literaria, extraer sus metadatos verificados y devolver el enlace oficial de referencia.

Está construido en **TypeScript estricto** (`strict: true`, `erasableSyntaxOnly: true`) utilizando el SDK oficial `@modelcontextprotocol/sdk` y `zod` para validación de esquemas en runtime. Cumple con los contratos tipados compartidos definidos en `server/mcp/contracts.ts`.

---

## Estructura del Módulo

```
server/mcp/
├── contracts.ts              # Contratos tipados compartidos (Persona 1)
└── books/
    ├── matcher.ts            # Heurística de coincidencia película->libro y sanitización LLM01
    ├── googleBooksClient.ts  # Cliente HTTP, caché LRU en memoria y control de cuota (1000 req/día)
    ├── server.ts             # Definición y registro de la herramienta search_book en McpServer
    └── index.ts              # Entrypoint stdio ejecutable y re-exportaciones in-process
```

### Responsabilidades por archivo:

- **`matcher.ts`:** Algoritmo de puntuación y similitud (`scoreVolumeMatch`, `pickBestBookMatch`). Filtra material derivado no oficial (guías, resúmenes, libros de colorear) y aplica defensas contra **OWASP LLM01** (`sanitizeDescription`, `sanitizeBooksUrl`).
- **`googleBooksClient.ts`:** Cliente HTTP con `fetch` inyectable (permite tests 100% desconectados), control de cuota diaria (tope de 1,000 req/día UTC), timeout de red por petición (5 s) y caché LRU en memoria con TTL de 24 horas.
- **`server.ts`:** Factoría `createBooksMcpServer` que registra la herramienta `search_book` sobre `McpServer` con esquemas Zod de entrada y salida, asegurando respuestas estandarizadas y captura controlada de errores.
- **`index.ts`:** Punto de entrada ejecutable para conexión por `stdio` (`StdioServerTransport`), leyendo `GOOGLE_BOOKS_API_KEY` mediante `config.ts`.

---

## Flujo de Ejecución Interno

```mermaid
flowchart TD
    Req["Petición search_book(title, author)"] --> Norm["Normalizar título y autor<br/>(minúsculas, sin tildes, sin signos)"]
    Norm --> CacheCheck{"¿Está en Caché LRU?<br/>(TTL 24h)"}

    CacheCheck -->|Sí (Cache Hit)| ReturnCache["Devolver resultado cacheado<br/>(0 consumo de cuota / <5ms)"]

    CacheCheck -->|No (Cache Miss)| QuotaCheck{"¿Queda cuota diaria?<br/>(< 1000 req/día UTC)"}
    QuotaCheck -->|No| ErrQuota["Lanzar BooksQuotaExceededError<br/>(isError: true)"]

    QuotaCheck -->|Sí| FetchAPI["Llamar a Google Books API<br/>(GET /volumes?q=intitle:...&printType=books)"]
    FetchAPI -->|Error HTTP o Timeout 5s| ErrHttp["Lanzar BooksApiError<br/>(API key redactada)"]

    FetchAPI -->|200 OK| Matcher["Heurística de Coincidencia (matcher.ts)<br/>• Descartar guías y resúmenes<br/>• Evaluar título y autor<br/>• Umbral de corte (score >= 0.6)"]

    Matcher --> FoundCheck{"¿Superó el umbral?"}
    FoundCheck -->|No| NotFound["found: false<br/>title: null, authors: [], url: null"]
    FoundCheck -->|Sí| Sanitize["Sanitización OWASP LLM01<br/>• Eliminar etiquetas HTML<br/>• Acotar descripción a 500 chars<br/>• Validar URL oficial https://"]

    NotFound --> SaveCache["Guardar en Caché LRU"]
    Sanitize --> SaveCache
    SaveCache --> ResMCP["Respuesta MCP estructurada (BookSearchResult)"]
```

---

## Herramienta Disponible: `search_book`

### Parámetros de Entrada (`SearchBookInput`)

| Parámetro | Tipo     | Requerido | Descripción                                                                                   |
| --------- | -------- | --------- | --------------------------------------------------------------------------------------------- |
| `title`   | `string` | **Sí**    | Título de la película o libro a buscar (1 a 200 caracteres).                                  |
| `author`  | `string` | No        | Nombre del autor del libro (1 a 120 caracteres). Desambigua resultados y mejora la precisión. |

Ejemplo de llamada JSON-RPC:

```json
{
  "title": "Dune",
  "author": "Frank Herbert"
}
```

---

### Formato de Salida (`BookSearchResult`)

La salida sigue estrictamente el contrato compartido de `server/mcp/contracts.ts`:

#### Caso 1: Película con libro verificado (`found: true`)

```json
{
  "found": true,
  "title": "Dune",
  "authors": ["Frank Herbert"],
  "description": "Ambientada en el desértico planeta Arrakis, Dune narra la historia del joven Paul Atreides...",
  "rating": 4.5,
  "books_url": "https://books.google.com/books/about/Dune.html?id=1"
}
```

#### Caso 2: Película sin libro o coincidencia no confiable (`found: false`)

Cuando la película es un guión original (p. ej. _Inception_) o las respuestas de la API son guías de estudio no solicitadas, el servidor devuelve consistentemente:

```json
{
  "found": false,
  "title": null,
  "authors": [],
  "description": null,
  "rating": null,
  "books_url": null
}
```

---

## Heurística de Coincidencia y Detección de Falsos Positivos

La API de Google Books es un motor de búsqueda amplio que tiende a devolver resultados para casi cualquier título, incluso cuando no existe un libro original de la película (por ejemplo, devolviendo ensayos, guías académicas o novelizaciones apócrifas).

Para evitar alucinar que una película "tiene libro", `matcher.ts` implementa una heurística en tres capas:

1. **Filtro de Material Derivado (`isDerivativeWork`):**
   - Descarta automáticamente publicaciones cuyo título incluya términos como: `study guide`, `guia de estudio`, `summary`, `resumen`, `workbook`, `coloring book`, `trivia`, `unofficial`, `analysis of`, `cliffnotes` o `sparknotes` (a menos que el usuario los haya solicitado explícitamente en la consulta).
   - Descarta publicaciones que no tengan `printType: "BOOK"` (p. ej. revistas o folletos).
2. **Puntuación de Título (`scoreVolumeMatch`):**
   - **Coincidencia Exacta (Score 1.0):** Título normalizado idéntico al solicitado.
   - **Subtítulo o Edición Especial (Score 0.85 – 0.9):** Coincidencia en la parte principal del título (ej. _"Dune: Deluxe Edition"_ o _"The Shining: The Definitive Novel"_).
   - **Coincidencia por Conjuntos de Tokens Significativos (Score 0.65 – 0.8):** Mide el _recall_ y _precision_ de palabras clave tras filtrar _stop words_ (el, la, the, of, etc.).
3. **Bonificación y Penalización por Autor:**
   - Si se proporciona `author`, una coincidencia con los autores del volumen suma **+0.15** puntos de confianza.
   - Si se proporciona `author` y el volumen pertenece a un autor completamente diferente, se penaliza con **-0.25** puntos.
4. **Umbral de Aprobación:**
   - Solo los volúmenes con un puntaje final **>= 0.6** se consideran válidos (`found: true`). Todo resultado por debajo se rechaza con `found: false`.

---

## Caché y Gestión del Límite Gratuito (1,000 req/día)

Google Books API ofrece una capa gratuita de 1,000 consultas diarias. Para operar de forma confiable sin interrupciones:

- **Caché en Memoria:**
  - Estructura Map indexada por clave normalizada `${title}|${author}`.
  - **Tiempo de vida (TTL):** 24 horas por entrada.
  - **Política de desalojo:** LRU (_Least Recently Used_) con capacidad máxima de 500 entradas para evitar desbordes de memoria.
  - Las consultas que aciertan en caché no llaman a Google Books ni incrementan el contador diario.
- **Control Diario de Solicitudes:**
  - Lleva un contador sincronizado con el día calendario en **UTC** (`YYYY-MM-DD`).
  - Al alcanzar 1,000 solicitudes en el día, rechaza llamadas adicionales de inmediato con `BooksQuotaExceededError` antes de abrir sockets de red.
  - El contador se reinicia automáticamente al comenzar el siguiente día UTC.

---

## Seguridad y Defensas OWASP Top 10 for LLM

### 1. Mitigación de Inyección Indirecta (OWASP LLM01)

Los datos recuperados de fuentes públicas de internet pueden contener código malicioso o instrucciones camufladas (prompts inyectados dentro de las sinopsis).

- `sanitizeDescription`: Elimina cualquier etiqueta HTML (`<script>`, `<b>`, etc.), remueve caracteres de control ASCII (`\p{Cc}`) y normaliza espacios.
- **Acotado de Longitud:** Trunca las descripciones a un máximo de **500 caracteres**. Esto evita ataques de agotamiento de contexto y minimiza la superficie para instrucciones maliciosas incrustadas.
- **Aislamiento en el Agente:** La respuesta devuelta por el MCP es envuelta por el orquestador dentro de un bloque seguro `<resultado_herramienta nombre="search_book">` para que el modelo la interprete estrictamente como dato y no como instrucción de sistema.

### 2. Validación Estricta de Enlaces (`sanitizeBooksUrl`)

Para cumplir el requisito funcional de abrir Google Books sin permitir que un ataque redirija al usuario a sitios maliciosos:

- Solo se aceptan URLs con esquema `https:` (forzando actualización si venía `http:`).
- Se restringen los hostnames a dominios oficiales: `books.google.com`, `play.google.com` y dominios regionales `books.google.[a-z.]+`.
- Se rechazan esquemas peligrosos como `javascript:` o `data:`.

### 3. Confidencialidad de Secretos

- La `GOOGLE_BOOKS_API_KEY` se lee exclusivamente desde variables de entorno mediante `config.ts` (`loadConfig` y `requireKey`).
- Si ocurre un fallo de red o error HTTP, `googleBooksClient.ts` redacta automáticamente la clave (`[REDACTED]`) antes de registrar o propagar el mensaje de error.

---

## Configuración y Variables de Entorno

### 1. Obtención de la clave (sin tarjeta de crédito)

1. Entrar a [Google Cloud Console](https://console.cloud.google.com/).
2. Crear un proyecto y dirigirse a **APIs y servicios** → **Biblioteca**.
3. Buscar **`Books API`** y hacer clic en **Habilitar**.
4. Ir a **Credenciales** → **Crear credenciales** → **Clave de API**.
5. _(Recomendado)_ Restringir la clave únicamente a `Books API`. No se requiere registrar método de pago ni activar la prueba gratuita de Google Cloud.

### 2. Configuración en `.env`

Agregar la clave al archivo `.env` en la raíz del proyecto (nunca versionar en Git):

```env
GOOGLE_BOOKS_API_KEY=AIzaSy...tu_clave_aqui...
```

---

## Ejecución Local y Pruebas con MCP Inspector

### Ejecución directa como subproceso stdio:

```bash
node --env-file=.env server/mcp/books/index.ts
```

### Inspección interactiva con `@modelcontextprotocol/inspector`:

Permite probar interactivamente el servidor MCP desde una interfaz gráfica en el navegador sin levantar todo el backend:

```bash
npx @modelcontextprotocol/inspector node --env-file=.env server/mcp/books/index.ts
```

---

## Integración con el Agente y Despliegue en Docker

### Integración por `stdio` (Configuración del Agente):

En `server/src/index.ts`, el orquestador principal inicializa y conecta el cliente MCP ejecutando:

- Comando: `process.execPath` (Node.js)
- Argumento: `server/mcp/books/index.ts`
- Transporte: `StdioClientTransport` / `StdioServerTransport`

### Docker:

El servidor MCP no requiere un contenedor independiente. El `Dockerfile` del proyecto ya copia el directorio `server/` completo en el destino `server`:

```dockerfile
COPY server ./server
CMD ["node", "server/src/index.ts"]
```

Ambos servidores MCP corren en el mismo contenedor `agichat_server` comunicándose por flujos estándar de entrada y salida (`stdio`), lo que garantiza cero latencia de red inter-proceso y consumo mínimo de recursos.

---

## Pruebas Unitarias y Cobertura

Las pruebas unitarias del servidor MCP de libros se encuentran en:

```
tests/unit/mcp/books/
├── matcher.test.ts            # Pruebas de normalización, scoring, falsos positivos y sanitización
├── googleBooksClient.test.ts   # Pruebas de cliente HTTP, caché LRU, límite diario y timeout
└── server.test.ts             # Pruebas de integración del McpServer usando InMemoryTransport
```

### Ejecución de pruebas:

```bash
# Ejecutar solo las pruebas del MCP de libros
npx vitest run tests/unit/mcp/books

# Ejecutar con reporte de cobertura
npx vitest run tests/unit/mcp/books --coverage
```

### Métricas de Cobertura Obtenidas:

- **Líneas:** > 99.5% (umbral mínimo: 80%)
- **Funciones:** 100%
- **Ramas:** > 89%
- **Sentencias:** > 99.5%
