# Estructura de carpetas del proyecto

Guía de referencia rápida para saber **dónde colocar** cada artefacto en el repositorio y entender la distribución física del sistema AGIChat (Fase 2). Para el razonamiento arquitectónico detrás de esta organización, consulta [ARQUITECTURA.md](./ARQUITECTURA.md).

---

## Árbol conceptual del repositorio

```
ai_engineering-proyecto-1/
├── .github/                  # CI/CD (GitHub Actions) y plantilla de PR
│   └── workflows/ci.yml      # Pipeline: typecheck → lint → test:coverage → build → docker-build
├── demo/                     # Punto de composición y pruebas manuales del widget
├── docs/                     # Documentación técnica completa del sistema
│   ├── AGENTE.md             # Orquestador, especificación de chat SSE y defensas LLM
│   ├── ARQUITECTURA.md       # Diagramas conceptual y técnico, justificación de escalabilidad
│   ├── ESTRUCTURA_CARPETAS.md# Esta guía de referencia de carpetas
│   ├── EVALS.md              # Batería de evaluaciones caja negra y reporte
│   ├── INFRAESTRUCTURA.md    # Despliegue en VPS, Cloudflare, Docker y Nginx
│   ├── mcpBooks.md           # Servidor MCP de Google Books
│   ├── mcpTMDB.md            # Servidor MCP de The Movie Database
│   └── REPARTO_TAREAS.md     # Acuerdos de equipo y asignación de componentes
├── evals/                    # Suite de evaluaciones funcionales y de seguridad
│   ├── cases.mjs             # Definición determinista de casos de prueba
│   ├── evaluator.mjs         # Motor de aserciones sobre respuestas y eventos SSE
│   ├── report.mjs            # Generador de reportes en Markdown y JSON
│   ├── run.mjs               # Ejecutor CLI de la batería
│   ├── sseClient.mjs         # Cliente HTTP / SSE para interactuar con /api/chat
│   └── results/              # Resultados generados (latest.json, latest.md)
├── infra/                    # Archivos de despliegue en servidor (Nginx, Caddy)
├── server/                   # Backend Node.js y servidores de herramientas MCP
│   ├── src/                  # Servidor de aplicación HTTP y lógica del agente
│   │   ├── app.ts            # Servidor HTTP nativo con CORS y rate limiter por IP
│   │   ├── config.ts         # Carga y validación estricta de variables de entorno
│   │   ├── index.ts          # Entrypoint del backend; conecta MCPs y levanta puerto 3000
│   │   ├── rateLimiter.ts    # Control de tasa de peticiones por IP en memoria
│   │   └── agent/            # Módulo del agente de inteligencia artificial
│   │       ├── agent.ts      # Orquestador ReAct; bucle de llamadas a herramientas
│   │       ├── chatRoute.ts  # Manejador POST /api/chat con streaming SSE
│   │       ├── guardrails.ts # Defensas OWASP LLM01 (inyección) y LLM07 (fuga prompt)
│   │       ├── llm.ts        # Cliente agnóstico a APIs compatibles con OpenAI (Groq)
│   │       ├── mcpTools.ts   # Conector y ejecutor de herramientas MCP
│   │       └── systemPrompt.ts # Prompt del sistema con token canario
│   └── mcp/                  # Servidores MCP independientes
│       ├── contracts.ts      # Contratos e interfaces tipadas compartidas
│       ├── books/            # MCP Server Google Books (Persona 3)
│       │   ├── googleBooksClient.ts # Cliente HTTP con caché LRU y cuota diaria
│       │   ├── matcher.ts    # Heurística película-libro y sanitización LLM01
│       │   ├── server.ts     # Registro de herramienta search_book en McpServer
│       │   └── index.ts      # Entrypoint stdio ejecutable
│       └── tmdb/             # MCP Server TMDB (Persona 2)
│           ├── mcpServer.ts  # Registro de search_movie, get_movie_details, etc.
│           ├── stdio.ts      # Entrypoint stdio ejecutable
│           ├── index.ts      # Re-exportación para resolución estándar
│           ├── tmdbCache.ts  # Caché en memoria de consultas
│           ├── tmdbClient.ts # Cliente HTTP de la API de TMDB
│           ├── tmdbMapper.ts # Transformación a contratos compartidos
│           └── tmdbRequestLimit.ts # Control de cuota diaria (1,000 req/día)
├── src/                      # SDK Frontend del Widget de Chat (React + TypeScript)
│   ├── index.ts              # Superficie pública exportada del SDK
│   ├── components/           # Componentes visuales puros (React + CSS)
│   │   ├── ChatWidget/       # Contenedor principal del widget
│   │   ├── EmptyState/       # Estado inicial de bienvenida
│   │   ├── InputBar/         # Barra de captura de texto y envío
│   │   ├── MessageBubble/    # Burbuja de mensaje con soporte de póster
│   │   ├── MessageList/      # Contenedor scrolleable de mensajes
│   │   └── TypingIndicator/  # Animación de escritura del agente
│   ├── markdown/             # Renderizado y sanitización estricta de Markdown
│   │   └── MarkdownContent.tsx # react-markdown + rehype-sanitize
│   ├── state/                # Lógica de estado reactivo
│   │   └── useChat.ts        # Hook principal desacoplado del transporte
│   ├── transport/            # Capa de transporte (Arquitectura Hexagonal)
│   │   ├── ChatTransport.ts  # Puerto (interfaz base obligatoria)
│   │   ├── mock/             # Adaptador simulado para desarrollo local (Fase 1)
│   │   └── agent/            # Adaptador real SSE contra /api/chat (Fase 2)
│   │       └── AgentTransport.ts # Conexión SSE, eventos poster y open-url
│   └── types/                # Tipos de dominio compartidos del SDK
│       └── index.ts          # ChatMessage, ChatTransportEvent, roles, etc.
├── tests/                    # Pruebas automatizadas (espejo de src/ y server/)
│   ├── setup.ts              # Configuración global de Vitest y jest-dom
│   └── unit/
│       ├── components/       # Pruebas unitarias de componentes React
│       ├── evals/            # Pruebas unitarias del motor de aserciones de evals
│       ├── mcp/books/        # Pruebas unitarias del MCP de libros
│       ├── server/           # Pruebas del servidor HTTP (app, config, rateLimiter)
│       │   ├── agent/        # Pruebas de orquestador, guardrails, llm y chatRoute
│       │   └── mcp/tmdb/     # Pruebas unitarias del MCP de TMDB
│       ├── state/            # Pruebas unitarias del hook useChat
│       └── transport/        # Pruebas del adaptador MockTransport y simulador
├── .dockerignore
├── .env.example              # Plantilla documentada de variables requeridas
├── .gitignore
├── AGENTS.md                 # Directrices para agentes de codificación y equipo
├── Caddyfile                 # Configuración de proxy inverso web para Caddy
├── docker-compose.yml        # Orquestación de contenedores web y server
├── Dockerfile                # Construcción multi-stage (targets: server y web)
├── eslint.config.js          # Reglas de estilo y linting
├── package.json              # Dependencias y scripts del proyecto
├── README.md                 # Documentación general y guía de bienvenida
├── tsconfig.json             # Configuración TypeScript estricta (erasableSyntaxOnly)
└── vite.config.ts            # Configuración de Vite y Vitest con cobertura
```

---

## Responsabilidades por Capa y Módulo

| Carpeta             | Responsabilidad                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/`          | Pipeline de CI automatizado: compilación de tipos, linter, pruebas con cobertura, build y docker build.                                 |
| `demo/`             | Entorno local de demostración que permite alternar entre `AgentTransport`, `MockTransport` y `PreviewTransport`.                        |
| `docs/`             | Documentación técnica profunda de arquitectura, agentes, infraestructura, herramientas MCP y reparto de tareas.                         |
| `evals/`            | Batería determinista de pruebas de caja negra contra `/api/chat` para validar requerimientos funcionales y seguridad OWASP LLM01/LLM07. |
| `infra/`            | Plantillas de configuración de servidor para Nginx y certificados TLS.                                                                  |
| `server/src/`       | Aplicación backend Node.js: routing HTTP, rate limiting por IP, CORS y punto de entrada.                                                |
| `server/src/agent/` | Inteligencia artificial centralizada: orquestador, cliente de LLM compatible con OpenAI/Groq, system prompt y filtros de seguridad.     |
| `server/mcp/`       | Servidores MCP desacoplados (`tmdb/`, `books/`) y contratos unificados (`contracts.ts`).                                                |
| `src/components/`   | Presentación pura en React. Reciben props y callbacks; desconocen adaptadores de transporte o APIs de backend.                          |
| `src/markdown/`     | Sanitización rigurosa de Markdown a HTML para evitar XSS o inyecciones visuales maliciosas.                                             |
| `src/state/`        | Hook reactivo `useChat` que expone la lista de mensajes, estado de envío y callbacks a la UI.                                           |
| `src/transport/`    | Puerto `ChatTransport` y adaptadores desacoplados (`MockTransport` para desarrollo aislado, `AgentTransport` para producción).          |
| `src/types/`        | Tipos TypeScript de dominio compartidos por todo el SDK.                                                                                |
| `tests/unit/`       | Pruebas unitarias automatizadas con Vitest que garantizan una cobertura mínima del 80% en todas las capas.                              |

---

## Reglas de Dependencias entre Módulos

Para preservar el desacoplamiento y la mantenibilidad del sistema:

1. **La UI nunca importa adaptadores concretos:** `src/components/` y `src/state/` únicamente conocen la interfaz `ChatTransport`. La decisión de qué transporte instanciar se delega al punto de composición (`demo/main.tsx` o la aplicación cliente huésped).
2. **Tipos del SDK aislados:** `src/types/` no depende de ninguna otra capa de `src/` ni del servidor.
3. **Contratos MCP compartidos:** `server/mcp/contracts.ts` define los tipos de datos que intercambian los servidores MCP y el agente. Ningún servidor MCP debe depender de la UI del widget ni viceversa.
4. **Ejecución directa en Node (`server/`):** El código del servidor se ejecuta directamente con Node.js sin paso de transpilación previa. Debe respetar la regla `erasableSyntaxOnly`: imports con extensión `.ts` explícita y ausencia total de `enum`, `namespace` o _parameter properties_.
5. **Superficie pública estricta:** `src/index.ts` expone únicamente los artefactos públicos del SDK destinados a ser embebidos por clientes externos.

---

## Cuándo actualizar este documento

Actualizar `docs/ESTRUCTURA_CARPETAS.md` cuando:

- Se incorpore o elimine un módulo, servidor MCP o paquete dentro del repositorio.
- Cambien los puntos de entrada del servidor, la interfaz `ChatTransport` o la ubicación de las pruebas unitarias.
- Se refactorice la jerarquía de directorios de backend o frontend.
