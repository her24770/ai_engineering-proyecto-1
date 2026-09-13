import "./TypingIndicator.css";

export interface TypingIndicatorProps {
  isVisible: boolean;
}

export function TypingIndicator({ isVisible }: TypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <div className="agichat-typing-indicator" role="status" aria-live="polite">
      <span />
      <span />
      <span />
    </div>
  );
}
