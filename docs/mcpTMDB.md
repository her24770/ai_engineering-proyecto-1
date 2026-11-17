
# Servidor MCP TMDB

## Descripción

Servidor MCP para consultar información de películas mediante
The Movie Database (TMDB).

Implementado con TypeScript y las dependencias `@modelcontextprotocol/sdk`
y `zod`.

No depende del widget ni del agente de inteligencia artificial.
Las respuestas se adaptan a los contratos compartidos definidos
en `server/mcp/contracts.ts`.

## Estructura

```
server/mcp/
├── contracts.ts
└── tmdb/
    ├── mcpServer.ts
    ├── stdio.ts
    ├── tmdbCache.ts
    ├── tmdbClient.ts
    ├── tmdbMapper.ts
    └── tmdbRequestLimit.ts
```

- `mcpServer.ts`: registro y validación de las herramientas MCP.
- `stdio.ts`: punto de entrada del servidor.
- `tmdbCache.ts`: gestión de caché en memoria.
- `tmdbClient.ts`: comunicación con la API de TMDB.
- `tmdbMapper.ts`: transformación de respuestas a los contratos compartidos.
- `tmdbRequestLimit.ts`: control del límite diario de solicitudes.

## Herramientas disponibles

### search_movie

Busca películas por título.

Entrada:

- query: string obligatorio.

Ejemplo:

```json
{"query":"Interstellar"}
```

Salida: arreglo de objetos `MovieSummary`.

```json
[
    {
        "id": 157336,
        "title": "Interstellar",
        "year": "2014",
        "overview": "Una aventura espacial",
        "poster_url": "https://image.tmdb.org/t/p/w500/poster.jpg"
    }
]
```

### get_movie_details

Obtiene información detallada de una película.

Entrada:

- movie_id: número entero positivo.

Ejemplo:

```json
{"movie_id":157336}
```

Salida: objeto `MovieDetails`.

```json
{
    "id": 157336,
    "title": "Interstellar",
    "year": "2014",
    "overview": "Una aventura espacial",
    "rating": 8.5,
    "poster_url": "https://image.tmdb.org/t/p/w500/poster.jpg",
    "imdb_url": "https://www.imdb.com/title/tt0816692/"
}
```

### get_recommendations

Obtiene recomendaciones a partir de una película
o mediante un género.

Entradas:

- movie_id: número entero positivo, o
- genre: string.

Se debe proporcionar exactamente uno de los dos.

Ejemplos:

```json
{"movie_id":157336}
```

```json
{"genre":"Ciencia ficción"}
```

Salida: arreglo de objetos `MovieSummary`.

Los ejemplos de salida contienen datos ilustrativos.
Los campos year, poster_url e imdb_url pueden ser nulos,
según el contrato correspondiente y la disponibilidad de información.

## Configuración

Requiere Node.js 24 y las dependencias del proyecto.

```bash
npm ci
```

También requiere la variable de entorno TMDB_API_KEY.

La clave se configura en el archivo `.env` y nunca se almacena
en el repositorio.

## Ejecución local

Desde la raíz del proyecto:

```bash
node --env-file=.env server/mcp/tmdb/stdio.ts
```

## Pruebas con MCP Inspector

```bash
npx @modelcontextprotocol/inspector node --env-file=.env server/mcp/tmdb/stdio.ts
```

## Integración con el agente

Transporte: stdio.

Comando:

```
node
```

Argumentos:

```
server/mcp/tmdb/stdio.ts
```

El proceso debe iniciarse desde la raíz del proyecto
y recibir TMDB_API_KEY mediante el entorno.

El backend debe utilizar un cliente MCP para descubrir
las herramientas mediante listTools y ejecutarlas mediante callTool.

Las respuestas se entregan como contenido de texto serializado
en formato JSON.

## Docker

El servidor MCP utiliza la infraestructura Docker existente
del backend, sin requerir un contenedor independiente.

Para reconstruir la imagen:

```bash
docker compose build server
```

## Caché y límite diario

- Caché en memoria con expiración de 15 minutos.
- Límite configurable de 1000 solicitudes diarias por defecto.
- Las respuestas recuperadas de caché no consumen cuota.
- Las respuestas inválidas no se almacenan.
- Los errores HTTP se comunican de forma controlada.

La caché y el contador se mantienen por proceso.
No se comparten entre réplicas ni sobreviven a reinicios.

## Validación y seguridad

- Validación de entradas mediante Zod.
- Validación de las respuestas de la API de TMDB.
- Validación de rutas de imágenes e identificadores de IMDb.
- Tiempo máximo de espera para solicitudes HTTP.
- Credenciales almacenadas en variables de entorno.
- Exclusión de contenido adulto en las consultas correspondientes.

## Pruebas unitarias

Las pruebas del servidor MCP se encuentran en:

```
tests/unit/server/mcp/tmdb/
```

Para ejecutar únicamente las pruebas de TMDB:

```bash
npm run test -- tests/unit/server/mcp/tmdb/
```

## Verificaciones generales

```bash
npm run typecheck
npm run lint
npm run test:coverage
npm run build
npm audit --omit=dev
```

## Atribución

This product uses the TMDB API but is not endorsed
or certified by TMDB.

El widget debe incluir el logo aprobado de TMDB.
