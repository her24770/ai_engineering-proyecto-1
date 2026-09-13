import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

export interface MarkdownContentProps {
  content: string;
}

/**
 * Render base de Markdown para mensajes de agente. Usa `rehype-sanitize`
 * porque el contenido puede venir de un LLM real, por lo que nunca debe
 * tratarse como HTML de confianza.
 */
export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
      {content}
    </ReactMarkdown>
  );
}
