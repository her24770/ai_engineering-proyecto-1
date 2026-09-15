export interface ResponseGroup {
  keywords: string[];
  responses: string[];
}

export const fallbackResponses = [
  "No tengo una respuesta especifica para eso todavia. Puedes darme mas contexto?",
  "Interesante. No encontre una categoria relacionada, pero puedo seguir conversando contigo.",
  "Puedes preguntarme sobre funciones, codigo, planes o documentacion.",
];

export const responseGroups: ResponseGroup[] = [
  {
    keywords: ["hola", "buenas", "hey", "saludos"],
    responses: [
      "Hola! En que puedo ayudarte?",
      "Buenas! Soy el agente simulado de **AGIChat**.",
    ],
  },
  {
    keywords: ["ayuda", "funciones", "puedes", "hacer"],
    responses: [
      "Puedo simular respuestas en Markdown, streaming y distintos tiempos de respuesta.",
      "Puedo ayudarte a probar diferentes capacidades del widget.",
    ],
  },
  {
    keywords: ["codigo", "javascript", "typescript"],
    responses: [
      "Claro. Aqui tienes un ejemplo:\n\n```js\nconst message = \"Hola desde AGIChat\";\n```",
    ],
  },
  {
    keywords: ["precio", "precios", "planes", "plan"],
    responses: [
      "Tenemos varias opciones: **Basic**, **Pro** y **Enterprise**.",
    ],
  },
];