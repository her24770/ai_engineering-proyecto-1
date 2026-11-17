
export function createDailyQuota(
    limit = 1000,
    now: () => Date = () => new Date()
) {
    if (!Number.isSafeInteger(limit) || limit <= 0) {
        throw new Error("El límite diario debe ser un entero positivo");
    }

    let currentDay = now().toISOString().slice(0, 10);
    let requests = 0;

    function refreshDay(): void {
        const today = now().toISOString().slice(0, 10);

        if (today !== currentDay) {
            currentDay = today;
            requests = 0;
        }
    }

    return {
        consume(): void {
            refreshDay();

            if (requests >= limit) {
                throw new Error(
                    "TMDB: se agotó el límite de solicitudes diarias"
                );
            }

            requests++;
        },

        getStatus() {
            refreshDay();

            return {
                date: currentDay,
                used: requests,
                remaining: limit - requests,
                limit
            };
        }
    };
}
