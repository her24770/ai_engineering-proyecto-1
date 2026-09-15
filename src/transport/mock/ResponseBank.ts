export interface ResponseGroup {
    keywords: string[];
    responses: string[];
}

export const fallbackResponses: string[] = [
    "No tengo una respuesta específica para eso todavía. ¿Puedes darme un poco más de contexto?",
    "Interesante. No encontré una categoría relacionada, pero puedo seguir conversando contigo.",
    "No estoy seguro de cómo responder a eso. Puedes preguntarme sobre **funciones**, **código**, **planes** o **documentación**.",
];

export const responseGroups: ResponseGroup[] = [
    {
        keywords: ["hola", "buenas", "hey", "saludos"],
        responses: [
            "¡Hola! ¿En qué puedo ayudarte?",
            "¡Buenas! Soy el agente simulado de **AGIChat**.",
            "¡Hola! ¿Qué quieres probar hoy?",
        ],
    },

    {
        keywords: ["ayuda", "funciones", "puedes", "hacer"],
        responses: [
            "Puedo ayudarte a probar diferentes capacidades del widget.",
            `Estas son algunas cosas que puedo simular:

            - Respuestas en Markdown
            - Streaming de texto
            - Listas y tablas
            - Bloques de código`,
            `Actualmente estoy en modo **simulado**.

            Puedo responder preguntas básicas y ayudarte a comprobar cómo se comporta la interfaz antes de conectar un agente real.`,
        ],
    },

    {
        keywords: ["codigo", "código", "javascript", "typescript"],
        responses: [
            `Claro. Aquí tienes un ejemplo sencillo en JavaScript:

        \`\`\`js
        const message = "Hola desde AGIChat";
        console.log(message);
        \`\`\``,
            `También puedo mostrar código en TypeScript:

        \`\`\`ts
        function greet(name: string): string {
        return \`Hola, \${name}\`;
        }

        console.log(greet("AGIChat"));
        \`\`\``,
            `Los bloques de código se pueden enviar utilizando Markdown.

        Por ejemplo:

        \`\`\`js
        const response = {
        role: "agent",
        content: "Respuesta simulada"
        };
        \`\`\``,
        ],
    },

    {
        keywords: ["precio", "precios", "planes", "plan"],
        responses: [
            `Estos son algunos planes de ejemplo:

            | Plan | Usuarios | Precio |
            | --- | ---: | ---: |
            | Basic | 5 | $10 |
            | Pro | 25 | $30 |
            | Enterprise | Ilimitados | Consultar |`,
            `Tenemos varias opciones disponibles:

            - **Basic:** pensado para equipos pequeños.
            - **Pro:** para equipos en crecimiento.
            - **Enterprise:** para organizaciones con necesidades específicas.`,
            "Los precios dependen de la cantidad de usuarios y funcionalidades requeridas. Puedes preguntarme por una **comparación de planes**.",
        ],
    },

    {
        keywords: ["documentacion", "documentación", "docs", "manual"],
        responses: [
            "Puedes consultar la [documentación oficial de React](https://react.dev/) para obtener más información.",
            `La documentación del producto podría incluir:

            1. Instalación
            2. Configuración
            3. Integración del widget
            4. Personalización
            5. Referencia de la API`,
            "También puedo mostrar enlaces en Markdown, por ejemplo [GitHub](https://github.com/).",
        ],
    },

    {
        keywords: ["adios", "adiós", "bye", "hasta luego"],
        responses: [
            "¡Hasta luego!",
            "Fue un gusto ayudarte. ¡Nos vemos pronto!",
            "¡Nos vemos! Espero que la prueba del widget haya sido útil.",
        ],
    },

    {
        keywords: ["quien eres", "quién eres", "qué eres", "que eres", "agente", "bot"],
        responses: [
            "Soy un **agente simulado** utilizado para probar la interfaz de AGIChat.",
            "Actualmente funciono como un **mock**. En la siguiente fase podré ser reemplazado por un agente real.",
            `Por ahora no utilizo inteligencia artificial real.

            Mi función es simular:

            - respuestas del agente,
            - tiempos de espera,
            - streaming,
            - y diferentes formatos de Markdown.`,
        ],
    },

    {
        keywords: ["capacidades", "caracteristicas", "características"],
        responses: [
            `Actualmente puedo simular:

        - Respuestas en Markdown
        - Listas
        - Código
        - Tablas
        - Enlaces
        - Streaming de texto`,
            `El widget actualmente permite probar:

        1. Mensajes del usuario
        2. Respuestas del agente
        3. Indicadores de escritura
        4. Texto enviado por partes
        5. Contenido Markdown`,
            `Aunque soy un agente simulado, puedo devolver distintos formatos:

        **Texto importante**

        *Texto en cursiva*

        \`código en línea\`

        - Listas
        - Enlaces
        - Tablas`,
        ],
    },

    {
        keywords: ["ejemplo", "ejemplo codigo", "ejemplo código"],
        responses: [
            `Aquí tienes un ejemplo:

        \`\`\`ts
        const message = "Hola desde AGIChat";
        console.log(message);
        \`\`\`

        Este bloque debería renderizarse como código.`,
            `Otro ejemplo podría ser una función:

        \`\`\`ts
        function sendMessage(message: string): void {
        console.log(message);
        }
        \`\`\``,
            `También puedo mostrar objetos:

        \`\`\`ts
        const user = {
        name: "Maxine",
        role: "admin"
        };
        \`\`\`

        El contenido se envía como Markdown y el widget se encarga de renderizarlo.`,
        ],
    },

    {
        keywords: ["comparar", "comparacion", "comparación"],
        responses: [
            `| Plan | Usuarios | Precio |
        | --- | ---: | ---: |
        | Basic | 5 | $10 |
        | Pro | 25 | $30 |
        | Enterprise | Ilimitados | Consultar |`,
            `| Característica | Basic | Pro |
        | --- | :---: | :---: |
        | Chat | Y | Y |
        | Markdown | Y | Y |
        | Soporte prioritario | N | Y |
        | Usuarios adicionales | N | Y |`,
            `Una comparación rápida:

        - **Basic:** adecuado para pruebas y equipos pequeños.
        - **Pro:** incluye funciones adicionales y mayor capacidad.
        - **Enterprise:** pensado para integraciones personalizadas.`,
        ],
    },
];