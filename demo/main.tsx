import { createRoot } from "react-dom/client";
import { ChatWidget } from "../src/components/ChatWidget";
import { AgentTransport } from "../src/transport/agent/AgentTransport";
import { MockTransport } from "../src/transport/mock/MockTransport";
import type { ChatTransport } from "../src/transport/ChatTransport";
import { PreviewTransport } from "./PreviewTransport";

const params = new URLSearchParams(location.search);

/** Por defecto habla con el agente real; `?mock` usa el simulador y `?preview=markdown` la vista previa. */
function createTransport(): ChatTransport {
  if (params.get("preview") === "markdown") return new PreviewTransport();
  if (params.has("mock")) return new MockTransport();
  return new AgentTransport();
}

const transport = createTransport();
const container = document.getElementById("root");

if (!container) {
  throw new Error("No se encontro el elemento #root");
}

createRoot(container).render(<ChatWidget transport={transport} />);
