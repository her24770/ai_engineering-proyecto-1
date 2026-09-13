# Proyecto #1 — CC3116

## Objetivos

Diseñar e implementar un sistema escalable utilizando herramientas de codeo agéntico, creando una base de código mantenible, de alta calidad, robusta y confiable.

## Instrucciones

Resuelvan el siguiente problema utilizando los conceptos vistos en clase. Este proyecto será la base del proyecto 2, por lo que los grupos asignados serán los mismos para el resto del curso.

## Problema

Ustedes han sido contratados por la startup **AGIChat**, que actualmente está tratando de llamar la atención de nuevos inversionistas para lograr seguir existiendo. Su fundadora, Maxine Prompt, luego de haber despedido a su última diseñadora, les comenta que lo último que le dejó fue un wireframe que ilustra exactamente la experiencia de usuario que ella quería y que puede ser visto en el siguiente link, señalando que tiene completa libertad en escoger paleta de colores y estilos:

**Wireframe** *(pendiente: agregar enlace)*

La idea en general de Maxine es diseñar un widget de un chat que le permita añadir una interfaz agéntica fácilmente a sus futuros clientes; en otras palabras, brindarles un **Software Development Kit (SDK)**. Adicionalmente a esto, Maxine comenta que necesita que lo implementen lo antes posible con las siguientes condiciones:

- Debe tener un **test coverage de al menos el 80%**, ya que ella asegura que tiene una cola de espera de alrededor de 200 usuarios para el día uno.
- Todos los desarrolladores involucrados pueden contribuir al código siempre y cuando pasen por **revisiones grupales (PR)**.
- Se debe tener un **pipeline de CI/CD** que le dé certeza a los desarrolladores de que sus cambios no rompen el sistema y facilite su distribución al momento de hacer cambios, utilizando **GitHub Actions**.
- En la pipeline de CI se debe tener un **check de lint**, para verificar que el código cumple con un estilo de código.
- La estrategia de ramas que debe ser utilizada es **GitHub Flow**.
- Dentro del repositorio se debe encontrar, en un archivo Markdown en español, documentando lo siguiente:
  - Un **diagrama de alto nivel hecho en Mermaid.js** (ya que GitHub es capaz de parsearlo y renderizarlo fácilmente) que describa la arquitectura del proyecto. Maxine dio toda la responsabilidad de escoger cualquier tipo de arquitectura, mientras esté bien justificada en dicho documento.
  - La **estructura de los folders** del proyecto, indicando a nuevos desarrolladores cómo debe ir escalando el proyecto.
- Se debe tener un archivo **`AGENTS.md`** que le permita a nuevos desarrolladores acoplar fácilmente sus herramientas agénticas y generar código similar.
- Los mensajes recibidos de un agente, de ser posible, deben ser capaces de ser recibidos como texto Markdown y renderizados correctamente.
- La interfaz gráfica tiene que conectarse a un **mock API endpoint** o algún **endpoint de WebSockets simulado**, para que al momento que se haga el switch por un agente en la fase 2 del proyecto la interfaz esté completamente lista.
- Se puede utilizar cualquier framework, GUI Toolkit (como GTK, QT), Ncurses, o tecnologías web para la interfaz.

---

**Universidad del Valle de Guatemala**
Profesor: Rodrigo Custodio | jrcustodio@uvg.edu.gt
