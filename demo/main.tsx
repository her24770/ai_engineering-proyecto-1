import { createRoot } from "react-dom/client";
import { ChatWidget } from "../src/components/ChatWidget";
import { MockTransport } from "../src/transport/mock/MockTransport";

const transport = new MockTransport();
const container = document.getElementById("root");

if (!container) {
  throw new Error("No se encontro el elemento #root");
}

createRoot(container).render(<ChatWidget transport={transport} />);
