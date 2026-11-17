# AGIChat — Proyecto #2: Sistema Multiagente de Recomendación y Comparación de Películas (CC3116)

SDK de widget de chat agentico conectado a un backend orquestador con herramientas desacopladas bajo el protocolo estándar **Model Context Protocol (MCP)**. El sistema recomienda películas usando The Movie Database (TMDB), las compara con sus obras literarias mediante Google Books, visualiza pósters oficiales, abre enlaces de referencia en pestañas del navegador y cuenta con guardrails de seguridad activos contra vulnerabilidades **OWASP LLM01** (Prompt Injection) y **OWASP LLM07** (System Prompt Leakage).

---

## Despliegue en Vivo

El sistema completo se encuentra desplegado y accesible públicamente en:

**[https://agichat.jhgo.online](https://agichat.jhgo.online)**

---

## Características Clave

- **Widget Embebible (SDK React):** Interfaz gráfica interactiva y desacoplada del transporte de red mediante arquitectura hexagonal (`ChatTransport`), con soporte de streaming SSE, renderizado seguro de Markdown y visualización de pósters oficiales.
- **Orquestador Centralizado de Agentes:** Backend en Node.js que conecta modelos LLM (Groq / OpenAI) con capacidades de llamada a herramientas (_tool calling_).
- **Herramientas MCP de TMDB (`server/mcp/tmdb`):** Búsqueda de películas, obtención de detalles (calificación, póster oficial, enlace de IMDb) y recomendaciones por ID o género cinematográfico.
- **Herramientas MCP de Libros (`server/mcp/books`):** Búsqueda en Google Books API con heurística estricta de coincidencia y descarte de material derivado (_study guides_, resúmenes no oficiales) para determinar con certeza si una película tiene libro.
- **Apertura de Enlaces en Navegador (`open-url`):** Apertura directa en pestañas nuevas a IMDb y Google Books sin requerir clics manuales del usuario sobre hipervínculos.
- **Protección de Cuotas Gratuitas:** Caché LRU en memoria (TTL de 24 horas) y limitadores de tasa diarios (tope de 1,000 req/día) para las APIs de TMDB y Google Books.
- **Defensas de Seguridad OWASP Top 10 for LLM:**
  - **LLM01 (Prompt Injection):** Filtro de patrones de inyección directa a la entrada, aislamiento y sanitización de salidas de herramientas (`<resultado_herramienta>`) y _allowlist_ estricta de URLs.
  - **LLM07 (System Prompt Leakage):** Mecanismos de detección de canarios, bloqueo de fragmentos del prompt interno y respuestas de denegación predefinidas.
- **Atribución TMDB:** Cumplimiento de los términos de servicio y atribución legal de The Movie Database.

---

## Instrucciones de Ejecución desde Cero

### 1. Requisitos Previos

- **Node.js:** Versión 20 o 24.
- **npm:** Versión 10+.
- Claves de API gratuitas (sin tarjeta de crédito):
  - **LLM (Groq por defecto):** [console.groq.com/keys](https://console.groq.com/keys) (o una API key de OpenAI en `LLM_API_KEY` con `LLM_BASE_URL=https://api.openai.com/v1`).
  - **The Movie Database (TMDB):** [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) (especificar uso no comercial / educativo UVG).
  - **Google Books:** [console.cloud.google.com](https://console.cloud.google.com/) (habilitar Books API y generar clave de API sin activar facturación).

### 2. Configuración de Variables de Entorno

Clona el repositorio y crea tu archivo `.env` a partir del ejemplo:

```bash
cp .env.example .env
```

Edita `.env` con tus claves y configuraciones:

```env
# Servidor HTTP
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3230
RATE_LIMIT_MAX=30
RATE_LIMIT_WINDOW_MS=60000

# Proveedor LLM (Groq free tier por defecto)
LLM_API_KEY=tu_api_key_de_groq
LLM_MODEL=openai/gpt-oss-120b
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_REASONING_EFFORT=low

# APIs de Herramientas
TMDB_API_KEY=tu_api_key_de_tmdb
GOOGLE_BOOKS_API_KEY=tu_api_key_de_google_books
```

### 3. Instalación de Dependencias

```bash
npm install
```

### 4. Ejecución en Desarrollo Local

Para levantar el entorno completo se ejecutan el backend y el frontend:

**Terminal 1 — Servidor Backend (Agente + MCP):**

```bash
node --env-file=.env server/src/index.ts
```

_El servidor iniciará en `http://localhost:3000` descubriendo automáticamente las herramientas MCP._

**Terminal 2 — Widget Frontend (Vite):**

```bash
npm run dev
```

_Abre tu navegador en `http://localhost:5173` para interactuar con el widget._

### 5. Comandos de Calidad y Pruebas

```bash
npm run typecheck       # Verificación estricta de TypeScript (sin emitir archivos)
npm run lint            # Verificación de estilo y sintaxis con ESLint
npm run test            # Ejecución de pruebas unitarias con Vitest
npm run test:coverage   # Pruebas con reporte de cobertura (> 80% requerido)
npm run build           # Compilación del bundle de producción
```

### 6. Ejecución con Docker

Para levantar el entorno local contenerizado idéntico a producción:

```bash
docker compose up --build
```

- Widget web: `http://localhost:3230`
- API backend: `http://localhost:3231` (o a través del proxy web)

---

## Documentación Técnica de Referencia

Para consultar en detalle las decisiones de arquitectura, estándares y diseño del sistema:

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md): Arquitectura hexagonal, diagrama Mermaid de alto nivel del sistema y justificación de escalabilidad.
- [`docs/AGENTE.md`](docs/AGENTE.md): Especificación del orquestador centralizado, diagrama de bajo nivel, contrato SSE de `POST /api/chat` y defensas LLM01 / LLM07.
- [`docs/ESTRUCTURA_CARPETAS.md`](docs/ESTRUCTURA_CARPETAS.md): Guía de organización modular y escalabilidad del repositorio.
- [`docs/INFRAESTRUCTURA.md`](docs/INFRAESTRUCTURA.md): Infraestructura de despliegue, Docker, Caddy, Nginx y proxy inverso en `agichat.jhgo.online`.
- [`docs/mcpTMDB.md`](docs/mcpTMDB.md): Documentación del servidor MCP de The Movie Database.
- [`docs/mcpBooks.md`](docs/mcpBooks.md): Documentación del servidor MCP de Google Books.
- [`docs/REPARTO_TAREAS.md`](docs/REPARTO_TAREAS.md): Matriz de responsabilidades y contratos acordados entre integrantes.
- [`AGENTS.md`](AGENTS.md): Reglas operativas, convenciones de código y directrices para agentes de codificación.

---

## Objetivos del Proyecto

Diseñar e implementar un sistema de inteligencia artificial o MAS (_Multi-Agent System_) escalable utilizando herramientas de codeo agéntico, creando una base de código mantenible, de alta calidad, robusta y confiable.

---

## Instrucciones

Resuelvan el siguiente problema utilizando los conceptos vistos en clase, continuando el desarrollo realizado en el Proyecto #1 bajo las mismas reglas de acuerdo a:

- **Test coverage:** Al menos el 80% en líneas, funciones, ramas y sentencias.
- **Estrategia de ramas:** GitHub Flow (`main` protegida, ramas descriptivas y revisiones vía Pull Requests).
- **Pipeline de CI/CD:** Verificación automatizada con GitHub Actions de `typecheck → lint → test:coverage → build → docker-build`.

### Requisitos de Entrega

1. Link al repositorio con el código funcionando e implementando los requisitos funcionales.
2. Evals probando el uso correcto del agente y cómo se comporta contra al menos 2 tipos de ataque (**LLM01** y **LLM07**) del OWASP Top 10 for LLM.
3. Diagrama de arquitectura de alto nivel de los componentes del proyecto, justificando por qué la solución escala.
4. Diagrama de arquitectura de bajo nivel de la organización de los agentes en conjunto con su clasificación (jerárquico, centralizado, descentralizado o combinado).

---

## Problema

Maxine se encuentra satisfecha con los resultados presentados por su grupo. Por lo que ahora les ha solicitado implementar un producto entero con una infraestructura escalable para ella poder salir a vender personalmente el producto (ya que despidió a su departamento de ventas).

Para esto debe implementar un sistema de inteligencia artificial que tenga las siguientes habilidades:

- Se pueda comunicar a través del widget desarrollado en el Proyecto #1.
- Sea capaz de recomendar películas utilizando la API de [The Movie Database (TMDB)](https://www.themoviedb.org/).
  - Incluir el logo de The Movie Database (o atribución) tal y como indica su manual de uso de API, para evitar inconvenientes legales.
  - Cap de 1,000 requests diarias sin costo alguno (especificar uso educativo UVG no comercial).
- Sea capaz de comparar películas con libros (si es que la película tiene libro) y decidir si la película vale la pena verla o no.
  - Utilizar [Google Books API](https://developers.google.com/books) (gratuita, sin tarjeta de crédito, free tier de 1,000 requests diarias).
  - El agente debe anunciar al usuario que es capaz de realizar esta comparación si lo desea.
- Sea capaz de abrir en una pestaña de navegador, sin que el usuario haga clic en un enlace, los sitios de referencia:
  - Google Books
  - IMDb
- El agente debe ser capaz de mostrar una imagen del póster de la película recomendada al usuario.
- El agente debe estar reforzado contra al menos 2 ataques (**LLM01** y **LLM07**) del OWASP Top 10 for LLMs.
- Las herramientas deben estar abstraídas en uno o varios **MCP Servers** para permitir su reutilización futura por otros agentes.

---

## Integrantes

- Jackelyn Nicolle Girón Villacinda
- Gustavo Andrés González Pineda
- Josue Hernández González
- Juan Daniel Ordoñez Sierra
- Javier André Salazar de Leon
- Sergio Estuardo Tan Coromac

---

**Universidad del Valle de Guatemala**  
CC3116 — Ingeniería de Inteligencia Artificial / Diseño de Sistemas Agénticos  
Profesor: Rodrigo Custodio
