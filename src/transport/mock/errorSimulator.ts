/**
 * Tipos de fallo que `MockTransport` puede simular. Se modelan por separado
 * de la logica de streaming para poder evolucionar/testear el "camino
 * infeliz" (errores, rate limiting, desconexiones) sin tocar el motor de
 * respuestas ni la orquestacion de eventos.
 */
export type SimulatedErrorKind =
  "timeout" | "disconnect" | "rate_limit" | "invalid_input" | "server_error";

/** Fallos que pueden inyectarse aleatoriamente durante una respuesta. */
export type TransientErrorKind = Extract<
  SimulatedErrorKind,
  "timeout" | "disconnect" | "server_error"
>;

export interface ErrorSimulatorConfig {
  /** Probabilidad (0-1) de que una respuesta falle con un error transitorio. */
  failureRate: number;
  /** Subconjunto de errores transitorios que se pueden sortear aleatoriamente. */
  enabledKinds: TransientErrorKind[];
  /** Longitud maxima permitida para un mensaje entrante. */
  maxMessageLength: number;
  /** Ventana de tiempo (ms) usada para el rate limiting. */
  rateLimitWindowMs: number;
  /** Cantidad maxima de mensajes permitidos dentro de la ventana. */
  rateLimitMaxMessages: number;
}

/**
 * Por defecto el mock es "confiable" (failureRate 0): un desarrollador que
 * construye la UI contra el mock no quiere fallos aleatorios en su flujo
 * normal ni tests intermitentes. Los fallos transitorios se activan a
 * proposito pasando `errorConfig` a `MockTransport`, mientras que la
 * validacion de entrada y el rate limit si estan activos
 * siempre porque son correctitud basica, no "caos" opcional.
 */
export const DEFAULT_ERROR_SIMULATOR_CONFIG: ErrorSimulatorConfig = {
  failureRate: 0,
  enabledKinds: ["timeout", "disconnect", "server_error"],
  maxMessageLength: 4000,
  rateLimitWindowMs: 10_000,
  rateLimitMaxMessages: 5,
};

const ERROR_MESSAGES: Record<SimulatedErrorKind, string> = {
  timeout: "El agente tardo demasiado en responder. Intenta de nuevo.",
  disconnect: "Se perdio la conexion con el agente a mitad de la respuesta.",
  rate_limit:
    "Estas enviando mensajes muy rapido. Espera unos segundos e intenta de nuevo.",
  invalid_input: "El mensaje esta vacio o es demasiado largo.",
  server_error: "El agente simulado tuvo un error interno inesperado.",
};

export function getErrorMessage(kind: SimulatedErrorKind): string {
  return ERROR_MESSAGES[kind];
}

/**
 * Encapsula toda la logica de "cosas que pueden salir mal" en el backend
 * simulado:
 *  - Validacion sincronica del mensaje entrante.
 *  - Rate limiting por ventana deslizante.
 *  - Sorteo de fallos transitorios (timeout, desconexion a media
 *    respuesta, error de servidor) con una tasa configurable.
 *
 * El generador aleatorio se puede inyectar (`random`) para que los tests
 * sean deterministicos en vez de depender de `Math.random`.
 */
export class ErrorSimulator {
  private config: ErrorSimulatorConfig;
  private sentTimestamps: number[] = [];
  private readonly random: () => number;

  constructor(
    config: Partial<ErrorSimulatorConfig> = {},
    random: () => number = Math.random,
  ) {
    this.config = { ...DEFAULT_ERROR_SIMULATOR_CONFIG, ...config };
    this.random = random;
  }

  updateConfig(config: Partial<ErrorSimulatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ErrorSimulatorConfig {
    return { ...this.config };
  }

  /** Validacion sincronica e inmediata del mensaje entrante. */
  validateInput(content: string): SimulatedErrorKind | null {
    if (content.trim().length === 0) {
      return "invalid_input";
    }
    if (content.length > this.config.maxMessageLength) {
      return "invalid_input";
    }
    return null;
  }

  /**
   * Registra el envio actual y determina si excede el rate limit
   * configurado (ventana deslizante de `rateLimitWindowMs`).
   */
  checkRateLimit(now: number = Date.now()): boolean {
    const windowStart = now - this.config.rateLimitWindowMs;
    this.sentTimestamps = this.sentTimestamps.filter(
      (timestamp) => timestamp > windowStart,
    );
    this.sentTimestamps.push(now);
    return this.sentTimestamps.length > this.config.rateLimitMaxMessages;
  }

  /**
   * Decide si la respuesta actual debe fallar con un error transitorio y,
   * de ser asi, cual. Devuelve `null` cuando no hay fallo.
   */
  maybeFail(): TransientErrorKind | null {
    if (this.config.failureRate <= 0 || this.config.enabledKinds.length === 0) {
      return null;
    }
    if (this.random() >= this.config.failureRate) {
      return null;
    }
    const index = Math.floor(this.random() * this.config.enabledKinds.length);
    return this.config.enabledKinds[Math.min(index, this.config.enabledKinds.length - 1)];
  }

  /**
   * Elige un punto (indice de caracter) dentro de un texto de longitud
   * `textLength` donde "cortar" el streaming para simular una desconexion
   * a media respuesta. Siempre deja al menos un caracter emitido antes de
   * cortar, para que se note que la respuesta empezo a llegar.
   */
  pickInterruptPoint(textLength: number): number {
    if (textLength <= 1) return textLength;
    const min = Math.max(1, Math.floor(textLength * 0.2));
    const max = Math.max(min + 1, Math.floor(textLength * 0.8));
    return min + Math.floor(this.random() * (max - min));
  }

  /** Reinicia el historial de rate limiting (util entre tests o sesiones). */
  reset(): void {
    this.sentTimestamps = [];
  }
}
