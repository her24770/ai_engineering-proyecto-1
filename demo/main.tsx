import { createRoot } from "react-dom/client";
import { ChatWidget } from "../src/components/ChatWidget";
import { MockTransport } from "../src/transport/mock/MockTransport";
import { PreviewTransport } from "./PreviewTransport";

const isMarkdownPreview = new URLSearchParams(location.search).get("preview") === "markdown";
const transport = isMarkdownPreview ? new PreviewTransport() : new MockTransport();
const container = document.getElementById("root");

if (!container) {
  throw new Error("No se encontro el elemento #root");
}

createRoot(container).render(<ChatWidget transport={transport} />);
