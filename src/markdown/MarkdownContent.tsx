import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import "./MarkdownContent.css";

export interface MarkdownContentProps {
  content: string;
}

// Permite className en <span> el schema lo omite y se borra
// las clases hljs-* que agrega rehype-highlight al sanitizar
const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [...(defaultSchema.attributes?.span ?? []), "className"],
  },
};

/**
 * Render base de Markdown para mensajes de agente. Usa `rehype-sanitize`
 * porque el contenido puede venir de un LLM real, por lo que nunca debe
 * tratarse como HTML de confianza.
 */
export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="agichat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, [rehypeSanitize, sanitizeSchema]]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
