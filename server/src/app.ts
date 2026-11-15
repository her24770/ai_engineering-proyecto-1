import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { ServerConfig } from "./config.ts";
import { RateLimiter } from "./rateLimiter.ts";

/**
 * Manejador de ruta registrable. El equipo del agente agrega aqui sus
 * endpoints (p. ej. `POST /api/chat`) sin tocar CORS, rate limit ni health.
 */
export type RouteHandler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
export type Routes = Record<string, RouteHandler>;

export function routeKey(method: string | undefined, path: string): string {
  return `${(method ?? "GET").toUpperCase()} ${path}`;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function applyCors(req: IncomingMessage, res: ServerResponse, allowed: string[]): void {
  const origin = req.headers.origin;
  if (origin && allowed.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
}

export function createApp(config: ServerConfig, routes: Routes = {}): Server {
  const limiter = new RateLimiter(config.rateLimitMax, config.rateLimitWindowMs);

  return createServer((req, res) => {
    applyCors(req, res, config.allowedOrigins);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const path = new URL(req.url ?? "/", "http://localhost").pathname;

    if (path === "/health") {
      sendJson(res, 200, { status: "ok" });
      return;
    }

    // Detras de Caddy la IP real llega en X-Forwarded-For.
    const forwarded = req.headers["x-forwarded-for"];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0])?.trim() ??
      req.socket.remoteAddress ??
      "unknown";

    if (!limiter.allow(ip)) {
      sendJson(res, 429, { error: "Demasiadas peticiones, intenta de nuevo en un momento" });
      return;
    }

    const handler = routes[routeKey(req.method, path)];
    if (!handler) {
      sendJson(res, 404, { error: "No encontrado" });
      return;
    }

    // El wrapper async convierte tambien los errores sincronos en rechazos.
    (async () => handler(req, res))().catch(() => {
      if (!res.headersSent) sendJson(res, 500, { error: "Error interno" });
      else res.end();
    });
  });
}
