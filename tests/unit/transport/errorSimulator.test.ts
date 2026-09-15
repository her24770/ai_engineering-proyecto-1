import { describe, expect, it } from "vitest";
import {
  ErrorSimulator,
  getErrorMessage,
} from "../../../src/transport/mock/errorSimulator";

describe("ErrorSimulator", () => {
  describe("validateInput", () => {
    it("rechaza un mensaje vacio o solo con espacios", () => {
      const simulator = new ErrorSimulator();
      expect(simulator.validateInput("")).toBe("invalid_input");
      expect(simulator.validateInput("   ")).toBe("invalid_input");
    });

    it("rechaza un mensaje mas largo que maxMessageLength", () => {
      const simulator = new ErrorSimulator({ maxMessageLength: 10 });
      expect(simulator.validateInput("0123456789ABC")).toBe("invalid_input");
    });

    it("acepta un mensaje valido", () => {
      const simulator = new ErrorSimulator();
      expect(simulator.validateInput("hola")).toBeNull();
    });
  });

  describe("checkRateLimit", () => {
    it("no bloquea mientras el numero de mensajes este dentro del limite", () => {
      const simulator = new ErrorSimulator({
        rateLimitMaxMessages: 2,
        rateLimitWindowMs: 1000,
      });
      expect(simulator.checkRateLimit(0)).toBe(false);
      expect(simulator.checkRateLimit(10)).toBe(false);
    });

    it("bloquea al exceder el numero maximo de mensajes en la ventana", () => {
      const simulator = new ErrorSimulator({
        rateLimitMaxMessages: 2,
        rateLimitWindowMs: 1000,
      });
      simulator.checkRateLimit(0);
      simulator.checkRateLimit(10);
      expect(simulator.checkRateLimit(20)).toBe(true);
    });

    it("olvida mensajes fuera de la ventana deslizante", () => {
      const simulator = new ErrorSimulator({
        rateLimitMaxMessages: 1,
        rateLimitWindowMs: 1000,
      });
      simulator.checkRateLimit(0);
      // Este segundo mensaje, dentro de la ventana, excede el limite.
      expect(simulator.checkRateLimit(500)).toBe(true);
      // Este tercero ya esta fuera de la ventana del primero -> no bloquea.
      expect(simulator.checkRateLimit(2000)).toBe(false);
    });

    it("reset() limpia el historial de rate limiting", () => {
      const simulator = new ErrorSimulator({
        rateLimitMaxMessages: 1,
        rateLimitWindowMs: 1000,
      });
      simulator.checkRateLimit(0);
      simulator.reset();
      expect(simulator.checkRateLimit(10)).toBe(false);
    });
  });

  describe("maybeFail", () => {
    it("nunca falla cuando failureRate es 0 (default)", () => {
      const simulator = new ErrorSimulator({}, () => 0);
      expect(simulator.maybeFail()).toBeNull();
    });

    it("nunca falla cuando enabledKinds esta vacio", () => {
      const simulator = new ErrorSimulator({ failureRate: 1, enabledKinds: [] }, () => 0);
      expect(simulator.maybeFail()).toBeNull();
    });

    it("falla de forma deterministica cuando random() < failureRate", () => {
      const simulator = new ErrorSimulator(
        { failureRate: 0.5, enabledKinds: ["timeout"] },
        () => 0,
      );
      expect(simulator.maybeFail()).toBe("timeout");
    });

    it("no falla cuando random() >= failureRate", () => {
      const simulator = new ErrorSimulator(
        { failureRate: 0.5, enabledKinds: ["timeout"] },
        () => 0.9,
      );
      expect(simulator.maybeFail()).toBeNull();
    });

    it("elige un tipo de error dentro de enabledKinds", () => {
      const simulator = new ErrorSimulator(
        { failureRate: 1, enabledKinds: ["timeout", "server_error"] },
        () => 0.9,
      );
      expect(["timeout", "server_error"]).toContain(simulator.maybeFail());
    });
  });

  describe("pickInterruptPoint", () => {
    it("devuelve un indice entre el 20% y 80% del texto", () => {
      const simulator = new ErrorSimulator({}, () => 0.5);
      const point = simulator.pickInterruptPoint(100);
      expect(point).toBeGreaterThanOrEqual(20);
      expect(point).toBeLessThan(80);
    });

    it("nunca devuelve 0 para textos con longitud > 1", () => {
      const simulator = new ErrorSimulator({}, () => 0);
      expect(simulator.pickInterruptPoint(10)).toBeGreaterThanOrEqual(1);
    });
  });

  describe("updateConfig / getConfig", () => {
    it("permite actualizar la configuracion parcialmente", () => {
      const simulator = new ErrorSimulator({ failureRate: 0 });
      simulator.updateConfig({ failureRate: 1 });
      expect(simulator.getConfig().failureRate).toBe(1);
    });
  });
});

describe("getErrorMessage", () => {
  it("devuelve un mensaje en español para cada tipo de error", () => {
    for (const kind of [
      "timeout",
      "disconnect",
      "rate_limit",
      "invalid_input",
      "server_error",
    ] as const) {
      expect(getErrorMessage(kind).length).toBeGreaterThan(0);
    }
  });
});