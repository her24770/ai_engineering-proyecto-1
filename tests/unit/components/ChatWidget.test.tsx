import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChatWidget } from "../../../src/components/ChatWidget/ChatWidget";
import { MockTransport } from "../../../src/transport/mock/MockTransport";

describe("ChatWidget", () => {
  it("permite enviar un mensaje y muestra la respuesta simulada del agente", async () => {
    const user = userEvent.setup();
    render(<ChatWidget transport={new MockTransport()} title="AGIChat" />);

    expect(screen.getByText("AGIChat")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Mensaje"), "hola");
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    expect(await screen.findByText("hola")).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getAllByTestId("message-bubble")).toHaveLength(2);
      },
      { timeout: 3000 },
    );
  });
});
