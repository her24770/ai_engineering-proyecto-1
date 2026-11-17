export interface ServerConfig {
  port: number;
  allowedOrigins: string[];
  rateLimitMax: number;
  rateLimitWindowMs: number;
  llmApiKey: string | undefined;
  llmModel: string;
  llmBaseUrl: string;
  llmReasoningEffort: string | undefined;
  tmdbApiKey: string | undefined;
  googleBooksApiKey: string | undefined;
}

export type Env = Record<string, string | undefined>;

function toPositiveInt(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`La variable ${name} debe ser un entero positivo (recibido: "${value}")`);
  }
  return parsed;
}

/**
 * Lee la configuracion del proceso desde variables de entorno. Las API keys
 * son opcionales aqui para que `/health` y el CI funcionen sin secretos; cada
 * modulo que las necesite debe validarlas al usarlas (ver `requireKey`).
 */
export function loadConfig(env: Env): ServerConfig {
  return {
    port: toPositiveInt(env.PORT, 3000, "PORT"),
    allowedOrigins: (env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    rateLimitMax: toPositiveInt(env.RATE_LIMIT_MAX, 30, "RATE_LIMIT_MAX"),
    rateLimitWindowMs: toPositiveInt(env.RATE_LIMIT_WINDOW_MS, 60_000, "RATE_LIMIT_WINDOW_MS"),
    llmApiKey: env.LLM_API_KEY || undefined,
    llmModel: env.LLM_MODEL || "openai/gpt-oss-120b",
    llmBaseUrl: (env.LLM_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, ""),
    // "low" por defecto: en gpt-oss reduce ~70 % los tokens (clave con 8k tokens/min).
    // Vacío = no se envía (para modelos sin razonamiento, p. ej. gpt-4o-mini).
    llmReasoningEffort: (env.LLM_REASONING_EFFORT ?? "low") || undefined,
    tmdbApiKey: env.TMDB_API_KEY || undefined,
    googleBooksApiKey: env.GOOGLE_BOOKS_API_KEY || undefined,
  };
}

/** Falla con un mensaje claro si una key obligatoria para una feature falta. */
export function requireKey(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}
