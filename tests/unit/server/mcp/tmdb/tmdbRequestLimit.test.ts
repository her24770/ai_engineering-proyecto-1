
import { describe, it, expect } from "vitest";
import { createDailyQuota } from "../../../../../server/mcp/tmdb/tmdbRequestLimit.ts";

describe("TMDB Daily Quota", () => {
    it("debe iniciar con 1000 solicitudes disponibles", () => {
        const quota = createDailyQuota();

        expect(quota.getStatus().remaining).toBe(1000);
        expect(quota.getStatus().used).toBe(0);
    });

    it("debe contabilizar las solicitudes realizadas", () => {
        const quota = createDailyQuota(3);

        quota.consume();
        quota.consume();

        expect(quota.getStatus().used).toBe(2);
        expect(quota.getStatus().remaining).toBe(1);
    });

    it("debe rechazar solicitudes cuando se agota la cuota", () => {
        const quota = createDailyQuota(2);

        quota.consume();
        quota.consume();

        expect(() => quota.consume()).toThrow(
            "TMDB: se agotó el límite de solicitudes diarias"
        );

        expect(quota.getStatus().used).toBe(2);
    });

    it("debe reiniciar la cuota al cambiar el día UTC", () => {
        let currentTime = new Date("2026-11-16T23:59:00Z");

        const quota = createDailyQuota(
            2,
            () => currentTime
        );

        quota.consume();
        quota.consume();

        expect(quota.getStatus().remaining).toBe(0);

        currentTime = new Date("2026-11-17T00:00:00Z");

        expect(quota.getStatus().remaining).toBe(2);
        expect(quota.getStatus().used).toBe(0);
    });

    it("debe rechazar límites inválidos", () => {
        expect(() => createDailyQuota(0)).toThrow();
        expect(() => createDailyQuota(-1)).toThrow();
        expect(() => createDailyQuota(1.5)).toThrow();
    });
});
