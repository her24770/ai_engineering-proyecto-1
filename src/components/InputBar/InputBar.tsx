import { useState, type FormEvent } from "react";
import "./InputBar.css";

export interface InputBarProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function InputBar({ onSend, disabled }: InputBarProps) {
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <form className="agichat-input-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Escribe un mensaje..."
        disabled={disabled}
        aria-label="Mensaje"
      />
      <button type="submit" aria-label="Enviar" disabled={disabled || !value.trim()}>
        →
      </button>
    </form>
  );
}
