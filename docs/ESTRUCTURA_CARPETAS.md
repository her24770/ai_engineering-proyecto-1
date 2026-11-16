# Estructura de carpetas del proyecto

Guía de referencia rápida para saber **dónde colocar** cada artefacto nuevo en el repositorio. Para el razonamiento arquitectónico detrás de esta organización, consulta [ARQUITECTURA.md](./ARQUITECTURA.md).

---

## Árbol conceptual

```
ai_engineering-proyecto-1/
├── .github/              # CI y plantilla de PR
├── demo/                 # Punto de composición para desarrollo local
├── docs/                 # Documentación técnica del equipo
├── evals/                # Evaluaciones funcionales y de seguridad (LLM01, LLM07)
├── infra/                # Configuración de despliegue (nginx, etc.)
├── server/
│   ├── src/              # Backend Node (app, endpoints, rate limiter, config)
│   └── mcp/              # Servidores y contratos MCP
│       ├── contracts.ts  # Contratos tipados compartidos de las herramientas MCP
│       ├── tmdb/         # Servidor MCP para The Movie Database
│       └── books/        # Servidor MCP para Google Books
├── src/
│   ├── index.ts          # Superficie pública del SDK (re-exportaciones)
│   ├── components/       # Componentes React de presentación
│   ├── markdown/         # Render y sanitización de Markdown
│   ├── state/            # Hooks y lógica de estado
│   ├── transport/
│   │   ├── ChatTransport.ts   # Puerto (interfaz pública)
│   │   ├── mock/              # Adaptador simulado (Proyecto 1)
│   │   └── agent/             # Adaptador real hacia /api/chat (Proyecto 2)
│   └── types/            # Tipos compartidos entre capas
├── tests/
│   └── unit/             # Pruebas unitarias (espeja la estructura de src/ y server/)
├── README.md             # Documentación para usuarios externos del SDK
├── AGENTS.md             # Guía de implementación de agentes
├── package.json
└── vite.config.ts
```

---

## Responsabilidades

| Carpeta           | Responsabilidad                                                                                                           |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `.github/`        | Pipeline de CI (lint, typecheck, pruebas, docker build) y plantilla de PR.                                                |
| `demo/`           | Monta el widget con un adaptador concreto para desarrollo y demostración local.                                           |
| `docs/`           | Documentación técnica del proyecto. `README.md` en la raíz cubre a usuarios externos del SDK.                             |
| `evals/`          | Evaluaciones de calidad del agente y pruebas de seguridad contra ataques LLM01 y LLM07.                                   |
| `infra/`          | Configuración de infraestructura (nginx, compose, etc.) para el despliegue.                                               |
| `server/src/`     | Backend Node: servidor HTTP, endpoints (`/health`, `/api/chat`), rate limiting y configuración.                           |
| `server/mcp/`     | Servidores MCP independientes (`tmdb/`, `books/`) y contratos compartidos (`contracts.ts`).                               |
| `src/components/` | Componentes React de presentación pura. Reciben datos y callbacks como props; no conocen adaptadores concretos.           |
| `src/markdown/`   | Conversión de Markdown a HTML seguro (`react-markdown` + `rehype-sanitize`).                                              |
| `src/state/`      | Hooks que traducen eventos del transporte a estado React. Conocen `ChatTransport` pero no sus implementaciones concretas. |
| `src/transport/`  | Contiene el puerto (`ChatTransport.ts`) y todos los adaptadores en subcarpetas propias (`mock/`, `agent/`).               |
| `src/types/`      | Tipos de dominio compartidos del SDK. No importa de ninguna otra capa.                                                    |
| `tests/unit/`     | Pruebas unitarias organizadas en subcarpetas que reflejan las de `src/` y `server/`.                                      |

---

## Reglas de ubicación

### Componentes React → `src/components/<NombreComponente>/`

Componentes de presentación pura. Lógica de estado compleja va en un hook dentro de `src/state/`.

### Hooks y estado → `src/state/`

Hooks que gestionan estado derivado del transporte o de la interacción del usuario.

### Transportes y adaptadores → `src/transport/<nombre>/`

- `ChatTransport.ts` permanece en la raíz de `transport/`; es la interfaz, no una implementación.
- Cada adaptador concreto vive en su propia subcarpeta: `mock/`, `agent/`, etc.

### Servidor y endpoints → `server/src/`

Servidor HTTP Node, configuración (`config.ts`), rate limiter y registro de endpoints de API (ej. `/api/chat`). Se ejecuta directamente con Node sin compilación previa (solo sintaxis borrable).

### Servidores y herramientas MCP → `server/mcp/<nombre>/`

Cada servidor MCP vive en su subcarpeta (`tmdb/`, `books/`). El archivo `contracts.ts` en la raíz de `server/mcp/` contiene los contratos tipados compartidos entre los servidores MCP y el agente.

### Evaluaciones y seguridad → `evals/`

Pruebas funcionales de los flujos del agente y baterías de ataque adversarial para OWASP LLM01 y LLM07.

### Tipos compartidos → `src/types/`

Tipos necesarios en más de una capa. Tipos locales a un único archivo pueden definirse en ese mismo archivo.

### Markdown → `src/markdown/`

Componentes y utilidades de conversión o sanitización de Markdown. Plugins adicionales de remark/rehype se agregan aquí.

### Pruebas → `tests/unit/<capa>/`

La subcarpeta replica la de `src/`. Ejemplo: pruebas de `src/state/useChat.ts` van en `tests/unit/state/`.

### Documentación → `docs/`

Documentos técnicos de alcance del proyecto: arquitectura, estructura, decisiones de diseño, guías de contribución.

---

## Reglas de dependencias

- `components/` y `state/` no importan adaptadores concretos (`mock/`, `agent/`, etc.).
- Toda comunicación entre la UI y el origen de datos pasa por la interfaz `ChatTransport`.
- `types/` no importa de ninguna otra carpeta de `src/`.
- `src/index.ts` re-exporta únicamente los símbolos que forman parte de la API pública del SDK.

---

## Proyecto 2: adaptador real

En el Proyecto 2 se incorporará `src/transport/agent/AgentTransport.ts` implementando la interfaz `ChatTransport` contra el agente real. Los detalles se definirán en el PR correspondiente; los componentes, hooks y tipos existentes no deberían requerir cambios.

---

## Cuándo actualizar este documento

Actualizar `docs/ESTRUCTURA_CARPETAS.md` cuando:

- Cambie la responsabilidad de una carpeta principal.
- Se agregue o elimine una capa o módulo arquitectónico.
- Cambien los puntos de entrada, la interfaz `ChatTransport` u otras reglas de ubicación.

**No es necesario actualizar** por cada componente, prueba o archivo que siga las convenciones existentes.
