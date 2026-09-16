export interface MarkdownSample {
  title: string;
  markdown: string;
}

// Muestra de cada diseño de Markdown soportado

export const MARKDOWN_SAMPLES: MarkdownSample[] = [
  {
    title: "Encabezados",
    markdown: "# H1\n## H2\n### H3\n#### H4",
  },
  {
    title: "Enfasis",
    markdown:
      "Texto **en negrita**, *en cursiva*, ~~tachado~~ y `codigo en linea` en una misma linea.",
  },
  {
    title: "Listas",
    markdown:
      "Lista sin orden:\n\n" +
      "- Primer elemento\n- Segundo elemento\n  - Sub elemento anidado\n- Tercer elemento\n\n" +
      "Lista ordenada:\n\n" +
      "1. Uno\n2. Dos\n3. Tres\n\n" +
      "Lista de tareas (GFM):\n\n" +
      "- [x] Completado\n- [ ] Pendiente",
  },
  {
    title: "Link y cita",
    markdown:
      "Visita [la documentacion](https://example.com) para mas detalle.\n\n" +
      "> Una cita destacada que resume un punto importante.",
  },
  {
    title: "Tabla",
    markdown:
      "| Lenguaje | Uso |\n| --- | --- |\n| TypeScript | Frontend |\n| Python | Backend |\n| SQL | Datos |",
  },
  {
    title: "Regla horizontal",
    markdown: "Antes de la regla.\n\n---\n\nDespues de la regla.",
  },
  {
    title: "Codigo JavaScript",
    markdown:
      "```js\n" +
      "// suma dos numeros\n" +
      "function sum(a, b) {\n" +
      "  const total = a + b;\n" +
      '  return `total: ${total}`;\n' +
      "}\n\n" +
      "const result = sum(21, 21);\nconsole.log(result);\n" +
      "```",
  },
  {
    title: "Codigo Python",
    markdown:
      "```python\n" +
      "class Agente:\n" +
      '    """Agente simulado."""\n\n' +
      "    def __init__(self, nombre: str):\n" +
      "        self.nombre = nombre\n\n" +
      "    def saludar(self) -> str:\n" +
      '        return f"Hola, soy {self.nombre}"\n' +
      "```",
  },
  {
    title: "Codigo JSON",
    markdown:
      "```json\n" +
      "{\n" +
      '  "id": 42,\n' +
      '  "activo": true,\n' +
      '  "tags": ["chat", "sdk"]\n' +
      "}\n" +
      "```",
  },
  {
    title: "Codigo CSS",
    markdown:
      "```css\n" +
      ".agichat-bubble {\n" +
      "  border-radius: 999px;\n" +
      "  color: var(--agichat-color-primary);\n" +
      "}\n" +
      "```",
  },
  {
    title: "Codigo Bash",
    markdown: "```bash\nnpm install\nnpm run dev -- --port 5173\n```",
  },
];
