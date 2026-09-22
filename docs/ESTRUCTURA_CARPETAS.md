# Estructura de carpetas del proyecto

Guía de referencia rápida para saber **dónde colocar** cada artefacto nuevo en el repositorio. Para el razonamiento arquitectónico detrás de esta organización, consulta [ARQUITECTURA.md](./ARQUITECTURA.md).

---

## Árbol conceptual

```
ai_engineering-proyecto-1/
├── .github/              # CI y plantilla de PR
├── demo/                 # Punto de composición para desarrollo local
├── docs/                 # Documentación técnica del equipo
├── src/
│   ├── index.ts          # Superficie pública del SDK (re-exportaciones)
│   ├── components/       # Componentes React de presentación
│   ├── markdown/         # Render y sanitización de Markdown
│   ├── state/            # Hooks y lógica de estado
│   ├── transport/
│   │   ├── ChatTransport.ts   # Puerto (interfaz pública)
│   │   └── mock/              # Adaptador simulado (Proyecto 1)
│   └── types/            # Tipos compartidos entre capas
├── tests/
│   └── unit/             # Pruebas unitarias (espeja la estructura de src/)
├── README.md             # Documentación para usuarios externos del SDK
├── AGENTS.md             # Guía de implementación de agentes
├── package.json
└── vite.config.ts
```

---

## Responsabilidades

| Carpeta | Responsabilidad |
|---|---|
| `.github/` | Pipeline de CI (lint, typecheck, pruebas) y plantilla de PR. |
| `demo/` | Monta el widget con un adaptador concreto para desarrollo y demostración local. |
| `docs/` | Documentación técnica del proyecto. `README.md` en la raíz cubre a usuarios externos del SDK. |
| `src/components/` | Componentes React de presentación pura. Reciben datos y callbacks como props; no conocen adaptadores concretos. |
| `src/markdown/` | Conversión de Markdown a HTML seguro (`react-markdown` + `rehype-sanitize`). |
| `src/state/` | Hooks que traducen eventos del transporte a estado React. Conocen `ChatTransport` pero no sus implementaciones concretas. |
| `src/transport/` | Contiene el puerto (`ChatTransport.ts`) y todos los adaptadores en subcarpetas propias. |
| `src/types/` | Tipos de dominio compartidos. No importa de ninguna otra capa. |
| `tests/unit/` | Pruebas unitarias organizadas en subcarpetas que reflejan las de `src/`. |

---

## Reglas de ubicación

### Componentes React → `src/components/<NombreComponente>/`

Componentes de presentación pura. Lógica de estado compleja va en un hook dentro de `src/state/`.

### Hooks y estado → `src/state/`

Hooks que gestionan estado derivado del transporte o de la interacción del usuario.

### Transportes y adaptadores → `src/transport/<nombre>/`

- `ChatTransport.ts` permanece en la raíz de `transport/`; es la interfaz, no una implementación.
- Cada adaptador concreto vive en su propia subcarpeta: `mock/`, `agent/`, etc.

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
