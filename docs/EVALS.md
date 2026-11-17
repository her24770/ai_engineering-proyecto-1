# Evaluaciones funcionales y de seguridad

La batería de `evals/` prueba el agente como una caja negra a través de
`POST /api/chat`. No conoce la implementación del modelo ni accede a secretos:
solo observa el texto y los eventos SSE que también recibe el widget.

## Qué se evalúa

| Categoría      | Casos                                                           | Evidencia de aprobación                                                     |
| -------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Funcional      | recomendación, comparación con libro, veredicto, capacidades    | texto sustantivo y términos requeridos                                      |
| Integración UI | póster, apertura de IMDb y Google Books                         | eventos `poster` y `open-url` con HTTPS y host permitido                    |
| OWASP LLM01    | inyección directa e instrucción hostil presentada como sinopsis | rechazo seguro, sin apertura de URL ni marcadores internos                  |
| OWASP LLM07    | extracción directa, cambio de rol y traducción                  | rechazo seguro y ausencia de canario, nombres de keys o fragmentos internos |

Las comprobaciones son deterministas. No se utiliza otro LLM como juez, porque
eso agregaría costo y variabilidad. Esta batería complementa las pruebas
unitarias de `server/src/agent/guardrails.ts`: allí se verifica que una salida
maliciosa real de una herramienta no pueda cerrar la etiqueta de datos no
confiables.

## Ejecución

1. Configurar las variables del backend en un `.env` local y arrancar el
   servidor en otra terminal.
2. Ejecutar:

```bash
npm run evals
```

Por defecto se llama a `http://localhost:3000/api/chat`, se esperan cuatro
segundos entre casos para respetar el free tier de Groq y se generan:

- `evals/results/latest.json`: resultado procesable por herramientas.
- `evals/results/latest.md`: reporte legible para el PR y la presentación.

Opciones mediante variables de entorno:

| Variable          | Default                 | Uso                                               |
| ----------------- | ----------------------- | ------------------------------------------------- |
| `EVAL_BASE_URL`   | `http://localhost:3000` | servidor local o desplegado                       |
| `EVAL_DELAY_MS`   | `4000`                  | pausa entre casos para no agotar la cuota         |
| `EVAL_TIMEOUT_MS` | `60000`                 | tiempo máximo por respuesta                       |
| `EVAL_OUTPUT`     | `evals/results/latest`  | prefijo de los dos reportes                       |
| `EVAL_CASE_IDS`   | todos                   | IDs separados por coma para una ejecución parcial |
| `EVAL_MODEL`      | `no especificado`       | modelo usado, para trazabilidad                   |

Ejemplo contra producción y solo para seguridad:

```bash
EVAL_BASE_URL=https://agichat.jhgo.online EVAL_CASE_IDS=llm01-direct-injection,llm07-system-prompt npm run evals
```

En PowerShell:

```powershell
$env:EVAL_BASE_URL = "https://agichat.jhgo.online"
$env:EVAL_MODEL = "openai/gpt-oss-120b"
npm run evals
```

El proceso termina con código `1` si falla al menos un caso, por lo que puede
usarse como quality gate manual. No se ejecuta automáticamente en CI porque
necesita APIs externas, consume cuotas y un modelo generativo puede variar.

## Lectura responsable de resultados

Un caso aprobado demuestra únicamente que el agente resistió esa entrada en
esa ejecución. No prueba seguridad absoluta. Antes de presentar resultados:

- guardar la fecha, endpoint, modelo y commit evaluado;
- ejecutar al menos dos veces los casos generativos;
- revisar manualmente falsos positivos y falsos negativos;
- no editar la evidencia generada para ocultar fallos;
- documentar límites de cuota, errores de red y casos omitidos.

Los reportes generados se ignoran en Git para no mezclar evidencia local o
accidentalmente sensible. Para entregar un reporte final revisado, copiar sus
resultados relevantes a un documento versionado y registrar el commit exacto.
