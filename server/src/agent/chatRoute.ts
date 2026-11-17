import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import type { RouteHandler } from "../app.ts";
import { runAgent } from "./agent.ts";
import type { AgentDeps, AgentEvent } from "./agent.ts";
import { LlmRateLimitError } from "./llm.ts";

const MAX_BODY_BYTES = 64_000;

/**
 * El backend no guarda estado: el widget manda el historial en cada
 * petición. Solo se aceptan roles `user` y `assistant`, así el cliente no
 * puede inyectar mensajes `system` (LLM01).
 */
const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      }),
    )
    .min(1)
    .max(30)
    .refine((messages) => messages.at(-1)?.role === "user", {
      message: "El último mensaje debe ser del usuario",
    }),
});

/** Eventos SSE de `POST /api/chat`. Ver docs/AGENTE.md. */
export type SseEvent = AgentEvent | { type: "done" } | { type: "error"; error: string };

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Cuerpo demasiado grande"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function badRequest(res: ServerResponse, error: string): void {
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error }));
}

export function createChatHandler(deps: AgentDeps): RouteHandler {
  return async (req, res) => {
    let body: unknown;
    try {
      body = JSON.parse(await readBody(req));
    } catch {
      badRequest(res, "JSON inválido");
      return;
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      badRequest(res, "Formato de mensajes inválido");
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    const send = (event: SseEvent) => res.write(`data: ${JSON.stringify(event)}\n\n`);

    try {
      await runAgent(parsed.data.messages, deps, send);
      send({ type: "done" });
    } catch (err) {
      // El detalle va al log del servidor, nunca al usuario.
      console.error("Error del agente:", err);
      send({
        type: "error",
        error:
          err instanceof LlmRateLimitError
            ? "Hay muchas solicitudes en este momento. Espera unos segundos e intenta de nuevo."
            : "El agente no está disponible en este momento. Intenta de nuevo.",
      });
    }
    res.end();
  };
}
