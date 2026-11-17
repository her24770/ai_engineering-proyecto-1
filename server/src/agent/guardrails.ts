import { CANARY, SYSTEM_PROMPT } from "./systemPrompt.ts";

export const MAX_INPUT_CHARS = 2000;

export const INPUT_REFUSAL =
  "No puedo ayudar con esa solicitud. Puedo recomendarte películas, compararlas con su libro y abrirte IMDb o Google Books. ¿Qué te gustaría ver?";

export const LEAK_REFUSAL =
  "No puedo compartir mi configuración interna. ¿Te recomiendo una película?";

/**
 * LLM01 (inyección directa): patrones típicos de intentos de cambiar las
 * reglas o extraer el prompt. Es una primera barrera barata; el system
 * prompt, el filtro de salida y la allowlist de URLs cubren lo que se escape.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /ignor\w*\s+(\w+\s+){0,3}(instrucciones|reglas|indicaciones|instructions|rules)/i,
  /(olvida|forget|disregard|omite)\w*\s+(\w+\s+){0,3}(instrucciones|reglas|instructions|rules)/i,
  /(system|sistema)\s*prompt|prompt\s+(del\s+)?sistema/i,
  /(revel|muestr|mostr|repit|repet|imprim|escrib|dime|dec|copi)\w*\s+(\w+\s+){0,2}(instrucciones|reglas|configuracion)/i,
  /(reveal|show|repeat|print|output|tell)\s+(me\s+)?(\w+\s+){0,2}(instructions|rules|configuration)/i,
  /\b(jailbreak|DAN)\b|modo\s+(desarrollador|dios|sin\s+restricciones)|developer\s+mode/i,
  /<\/?\s*(system|resultado_herramienta)\b/i,
];

export type InputCheck = { ok: true } | { ok: false; reason: string };

export function checkInput(text: string): InputCheck {
  if (text.trim() === "") return { ok: false, reason: "vacio" };
  if (text.length > MAX_INPUT_CHARS) return { ok: false, reason: "demasiado-largo" };
  // Se quitan tildes para que "Muéstrame" y "muestrame" coincidan igual.
  const plain = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (INJECTION_PATTERNS.some((pattern) => pattern.test(plain))) {
    return { ok: false, reason: "inyeccion" };
  }
  return { ok: true };
}

/**
 * LLM01 (inyección indirecta): envuelve la salida de una herramienta como
 * dato no confiable. Se elimina cualquier etiqueta de cierre para que el
 * contenido no pueda "salirse" del bloque.
 */
export function wrapUntrusted(toolName: string, content: string): string {
  const clean = content.replace(/<\/?\s*resultado_herramienta[^>]*>/gi, "");
  return `<resultado_herramienta nombre="${toolName}">\n${clean}\n</resultado_herramienta>`;
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Frases del prompt lo bastante largas como para no coincidir por casualidad. */
const PROMPT_FRAGMENTS = SYSTEM_PROMPT.split(/\n|(?<=[.:])\s/)
  .map((fragment) => normalize(fragment.replace(/^-\s*/, "")))
  .filter((fragment) => fragment.length >= 40);

/** LLM07: detecta si una respuesta filtra el system prompt. */
export function leaksSystemPrompt(output: string): boolean {
  if (output.includes(CANARY)) return true;
  const text = normalize(output);
  return PROMPT_FRAGMENTS.some((fragment) => text.includes(fragment));
}

/**
 * Valida una URL contra una allowlist de dominios. Limita el impacto de una
 * inyección exitosa: el agente nunca puede abrir ni mostrar otros sitios.
 * Devuelve la URL forzada a https, o null si no se permite.
 */
export function allowedUrl(raw: unknown, hosts: readonly string[]): string | null {
  if (typeof raw !== "string") return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const hostname = url.hostname.toLowerCase();
  const isAllowedHost =
    hosts.includes(hostname) ||
    (/^books\.google\.[a-z.]+$/.test(hostname) && hosts.includes("books.google.com"));

  if (!isAllowedHost || url.username || url.password) return null;
  url.protocol = "https:";
  return url.href;
}
