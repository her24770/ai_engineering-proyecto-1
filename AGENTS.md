# AGENTS.md

## Contexto del proyecto

`agichat` es un SDK de widget de chat construido con React, TypeScript y Vite. Actualmente usa un transporte simulado (`MockTransport`). La arquitectura está diseñada para incorporar un agente real en el Proyecto 2 implementando la interfaz `ChatTransport`, sin modificar los componentes ni los hooks existentes.

## Documentación de referencia

Consultar antes de cambiar la estructura del proyecto o los límites entre módulos:

- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — decisiones de diseño y capas del sistema.
- [`docs/ESTRUCTURA_CARPETAS.md`](docs/ESTRUCTURA_CARPETAS.md) — dónde colocar cada tipo de artefacto.

## Comandos del proyecto

```bash
npm install          # Instalar dependencias
npm run dev          # Servidor de desarrollo local
npm run lint         # Verificar estilo y reglas de código
npm run typecheck    # Verificar tipos sin emitir archivos
npm run test         # Ejecutar pruebas unitarias
npm run test:coverage  # Ejecutar pruebas con reporte de cobertura
npm run build        # Generar el bundle de producción
```

El pipeline de CI ejecuta `typecheck → lint → test:coverage → build` en cada PR hacia `main`.

## Reglas operativas

- Seguir las convenciones de React y TypeScript del código existente.
- No usar `any`; el compilador está configurado en modo estricto (`"strict": true`).
- La UI y los hooks se comunican con el origen de datos únicamente a través de `ChatTransport`; no importar adaptadores concretos desde `components/` ni desde `state/`.
- Renderizar Markdown con el módulo existente en `src/markdown/`; no desactivar ni sustituir la sanitización.
- No agregar dependencias ni cambiar la API pública (`src/index.ts`) sin justificarlo en el PR.
- Agregar o actualizar pruebas cuando cambie el comportamiento.
- Mantener la cobertura por encima del 80 % en líneas, funciones, ramas y sentencias.
- Antes de finalizar, ejecutar `lint`, `typecheck` y `test:coverage` y `build` sin errores.

## Flujo de trabajo

- Crear una rama corta desde `main` con un nombre descriptivo.
- Mantener los commits pequeños y enfocados en un único propósito.
- Escribir mensajes de commit descriptivos.
- Abrir un PR hacia `main`; no integrar directamente sin revisión.
- Documentar en el PR decisiones relevantes, limitaciones o riesgos.

## Criterio de finalización

Una tarea está completa cuando:

- Cumple el comportamiento solicitado.
- Respeta los contratos y límites entre capas.
- Incluye las pruebas necesarias y la cobertura no baja del 80 %.
- Pasa `lint`, `typecheck` y `test:coverage` sin errores.
- No introduce renderizado inseguro de contenido Markdown.
