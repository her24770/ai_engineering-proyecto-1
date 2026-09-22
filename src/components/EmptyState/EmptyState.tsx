import bearFace from "./bear-face.svg";
import "./EmptyState.css";

export function EmptyState() {
  return (
    <div className="agichat-empty-state">
      <div className="agichat-empty-state__avatar">
        <img src={bearFace} alt="" className="agichat-empty-state__icon" />
      </div>
      <p className="agichat-empty-state__title">¡Hola soy tu asistente virtual!</p>
      <p className="agichat-empty-state__subtitle">
        Escribe una duda y yo te ayudaré en lo que pueda
      </p>
    </div>
  );
}
