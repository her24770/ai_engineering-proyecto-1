/** Único host desde el que se muestran imágenes (espejo de POSTER_HOSTS del servidor). */
const ALLOWED_IMAGE_HOSTS = ["image.tmdb.org"];

/**
 * Defensa en profundidad: el servidor ya valida el póster, pero el widget no
 * debe cargar imágenes de terceros (rastreo, contenido inesperado) aunque el
 * LLM las pida en Markdown o llegue una URL inesperada.
 */
export function isAllowedPosterUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && ALLOWED_IMAGE_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}
