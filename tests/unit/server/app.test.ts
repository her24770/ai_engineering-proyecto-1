import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp, routeKey } from "../../../server/src/app.ts";
import { loadConfig } from "../../../server/src/config.ts";

let server: Server;
let base: string;

async function start(env: Record<string, string>, routes = {}) {
  server = createApp(loadConfig(env), routes);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("createApp", () => {
  it("responde /health sin pasar por el rate limit", async () => {
    await start({ RATE_LIMIT_MAX: "1" });
    for (let i = 0; i < 3; i++) {
      const res = await fetch(`${base}/health`);
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: "ok" });
    }
  });

  it("devuelve 404 en rutas desconocidas", async () => {
    await start({});
    expect((await fetch(`${base}/nada`)).status).toBe(404);
  });

  it("aplica CORS solo a origenes permitidos y contesta preflight", async () => {
    await start({ ALLOWED_ORIGINS: "https://ok.com" });
    const ok = await fetch(`${base}/health`, { headers: { Origin: "https://ok.com" } });
    expect(ok.headers.get("access-control-allow-origin")).toBe("https://ok.com");
    const bad = await fetch(`${base}/health`, { headers: { Origin: "https://mal.com" } });
    expect(bad.headers.get("access-control-allow-origin")).toBeNull();
    const pre = await fetch(`${base}/api/x`, { method: "OPTIONS" });
    expect(pre.status).toBe(204);
  });

  it("ejecuta rutas registradas y limita por IP (X-Forwarded-For)", async () => {
    const routes = {
      [routeKey("POST", "/api/chat")]: (_req: unknown, res: import("node:http").ServerResponse) => {
        res.writeHead(200);
        res.end("ok");
      },
    };
    await start({ RATE_LIMIT_MAX: "2" }, routes);
    const call = (ip: string) =>
      fetch(`${base}/api/chat`, { method: "POST", headers: { "X-Forwarded-For": ip } });
    expect((await call("1.1.1.1")).status).toBe(200);
    expect((await call("1.1.1.1")).status).toBe(200);
    expect((await call("1.1.1.1")).status).toBe(429);
    expect((await call("2.2.2.2")).status).toBe(200);
  });

  it("responde 500 si un handler falla", async () => {
    const routes = {
      [routeKey("GET", "/boom")]: () => {
        throw new Error("x");
      },
      [routeKey("GET", "/boom-async")]: async () => {
        throw new Error("x");
      },
    };
    await start({}, routes);
    expect((await fetch(`${base}/boom`)).status).toBe(500);
    expect((await fetch(`${base}/boom-async`)).status).toBe(500);
  });
});
