export interface SafeLink {
  url: string;
  label: "IMDb" | "Google Books";
}

const IMDB_HOSTS = ["imdb.com", "www.imdb.com", "m.imdb.com"];

/**
 * Defensa en profundidad: el servidor ya limita `open-url` a IMDb y Google
 * Books, pero el widget no debe abrir pestañas hacia ningún otro sitio ni
 * aunque llegue un evento inesperado. Devuelve la URL (forzada a https) y su
 * nombre legible, o `null` si no está permitida.
 */
export function toSafeLink(raw: string): SafeLink | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const label = IMDB_HOSTS.includes(host)
    ? "IMDb"
    : /^books\.google\.[a-z.]+$/.test(host)
      ? "Google Books"
      : null;
  if (!label) return null;
  url.protocol = "https:";
  return { url: url.href, label };
}
