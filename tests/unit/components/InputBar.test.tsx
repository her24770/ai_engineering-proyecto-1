import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InputBar } from "../../../src/components/InputBar/InputBar";

describe("InputBar", () => {
  it("llama a onSend con el texto escrito y limpia el input", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<InputBar onSend={onSend} />);

    const input = screen.getByLabelText("Mensaje");
    await user.type(input, "hola mundo");
    await user.click(screen.getByRole("button", { name: /enviar/i }));

    expect(onSend).toHaveBeenCalledWith("hola mundo");
    expect(input).toHaveValue("");
  });

  it("no llama a onSend si el mensaje esta vacio", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(<InputBar onSend={onSend} />);

    await user.click(screen.getByRole("button", { name: /enviar/i }));

    expect(onSend).not.toHaveBeenCalled();
  });
});
