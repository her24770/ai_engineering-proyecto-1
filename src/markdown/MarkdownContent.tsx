import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

export interface MarkdownContentProps {
  content: string;
}

/**
 * Render base de Markdown para mensajes de agente. Usa `rehype-sanitize`
 * porque el contenido viene de un agente (y en fase 2, de un LLM real), por
 * lo que nunca debe tratarse como HTML de confianza.
 *
 * Estilos, resaltado de sintaxis para bloques de codigo y theming quedan a
 * cargo de la persona encargada de renderizado de contenido.
 */
export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
      {content}
    </ReactMarkdown>
  );
}
