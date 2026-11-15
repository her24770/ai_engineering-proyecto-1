/** Limitador de ventana fija por clave (IP). Suficiente para una sola instancia. */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  private readonly max: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(max: number, windowMs: number, now: () => number = Date.now) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
  }

  /** Devuelve true si la peticion esta permitida. */
  allow(key: string): boolean {
    const current = this.now();
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= current) {
      this.hits.set(key, { count: 1, resetAt: current + this.windowMs });
      this.prune(current);
      return true;
    }
    entry.count += 1;
    return entry.count <= this.max;
  }

  private prune(current: number): void {
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= current) this.hits.delete(key);
    }
  }
}
