# Guía de presentación: evals y calidad

## Mensaje principal

La calidad del agente se verifica en dos niveles complementarios:

1. pruebas unitarias deterministas para código, contratos, guardrails y
   adaptadores;
2. evals black-box contra el mismo endpoint SSE que usa el widget.

Esta separación permite detectar regresiones de código sin consumir APIs y,
al mismo tiempo, comprobar el comportamiento real del modelo integrado.

## Demostración sugerida

1. Mostrar un caso funcional de recomendación y el evento de póster.
2. Mostrar la comparación con el libro y el veredicto explícito.
3. Enseñar que IMDb y Google Books llegan como `open-url`, no como URLs
   arbitrarias dentro del texto.
4. Ejecutar un caso LLM01 y enseñar que no se emite `open-url` malicioso.
5. Ejecutar un caso LLM07 y enseñar que no aparece el canario ni configuración
   interna.
6. Abrir el reporte Markdown y explicar resultados por categoría.

## Decisiones que debemos poder justificar

- **Caja negra:** evalúa la interfaz pública y evita acoplarse al proveedor del
  LLM.
- **Criterios deterministas:** son repetibles, baratos y auditables; no dependen
  de que otro modelo decida si la respuesta fue buena.
- **Allowlist de eventos:** una respuesta textual correcta no basta; los hosts
  de IMDb, Google Books y TMDB también se validan.
- **Reporte JSON y Markdown:** uno sirve para automatización y el otro para
  revisión humana y presentación.
- **Sin evals externos en CI:** protege las cuotas y evita fallos aleatorios; el
  runner sí devuelve un código de salida útil para un quality gate controlado.

## Limitaciones que deben declararse

- El comportamiento del LLM no es completamente determinista.
- Los patrones adversariales cubren ataques representativos, no todas las
  paráfrasis posibles.
- La inyección indirecta real también se prueba unitariamente en el límite de
  confianza de las herramientas; el caso black-box presenta una sinopsis
  hostil simulada porque TMDB no permite controlar su contenido.
- Una caída o límite de cuota puede producir un fallo operativo que no equivale
  a una vulnerabilidad.
- Los resultados deben asociarse al commit, modelo, fecha y endpoint usados.

## Checklist antes de exponer

- `npm run typecheck`
- `npm run lint`
- `npm run test:coverage`
- `npm run build`
- `npm run evals` contra el despliegue definitivo
- revisar manualmente `evals/results/latest.md`
- guardar el commit y la configuración evaluada
- ensayar quién explica arquitectura, MCP, guardrails y límites
