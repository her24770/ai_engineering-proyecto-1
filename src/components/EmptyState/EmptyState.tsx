import "./EmptyState.css";

export function EmptyState() {
  return (
    <div className="agichat-empty-state">
      <p className="agichat-empty-state__title">¿Qué película quieres ver hoy?</p>
      <p className="agichat-empty-state__subtitle">
        Pide una recomendación y te cuento si vale la pena, también frente a su libro.
      </p>
    </div>
  );
}
