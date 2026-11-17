
# Servidor MCP TMDB

## Descripción

Servidor MCP para consultar información de películas mediante
The Movie Database (TMDB).

Implementado con TypeScript y el SDK oficial de MCP.
No depende del widget ni del agente de inteligencia artificial.

## Herramientas disponibles

### search_movie

Busca películas por título.

Entrada:
- query: string obligatorio

Ejemplo:
{"query":"Interstellar"}

### get_movie_details

Obtiene información detallada de una película.

Entrada:
- movie_id: número entero positivo

Ejemplo:
{"movie_id":157336}

Devuelve título, sinopsis, géneros, puntuación,
póster e IMDb, cuando estén disponibles.

### get_recommendations

Obtiene recomendaciones a partir de una película
o mediante un género.

Entradas:
- movie_id: número entero positivo, o
- genre: string

Se debe proporcionar exactamente uno de los dos.

Ejemplos:
{"movie_id":157336}
{"genre":"Ciencia ficción"}

## Configuración

Requiere Node.js 24 y la variable de entorno
TMDB_API_KEY.

La clave se configura en .env y nunca se almacena
en el repositorio.

## Ejecución local

Desde la raíz del proyecto:

node --env-file=.env server/src/features/tmdb/tools/stdio.ts

## Pruebas con MCP Inspector

npx @modelcontextprotocol/inspector node --env-file=.env server/src/features/tmdb/tools/stdio.ts

## Integración con el agente

Transporte: stdio

Comando:
node

Argumentos:
server/src/features/tmdb/tools/stdio.ts

El proceso debe iniciarse desde la raíz del proyecto
y recibir TMDB_API_KEY mediante el entorno.

El backend debe utilizar un cliente MCP para descubrir
las herramientas y ejecutarlas mediante callTool.

## Caché y límite diario

- Caché en memoria con expiración de 15 minutos.
- Límite configurable de 1000 solicitudes diarias.
- Las respuestas recuperadas de caché no consumen cuota.
- Las respuestas inválidas no se almacenan.
- Los errores HTTP se comunican de forma controlada.

La caché y el contador se mantienen por proceso.
No se comparten entre réplicas ni sobreviven a reinicios.

## Verificaciones

npm run typecheck
npm run lint
npm run test:coverage
npm run build

## Atribución

This product uses the TMDB API but is not endorsed
or certified by TMDB.

El widget debe incluir el logo aprobado de TMDB.
