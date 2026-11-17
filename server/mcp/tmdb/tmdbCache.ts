
interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

export function createMemoryCache<T>(
    ttlMs: number,
    now: () => number = Date.now
) {
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) {
        throw new Error("El TTL debe ser mayor que cero");
    }

    const entries = new Map<string, CacheEntry<T>>();

    return {
        get(key: string):
            | { hit: true; value: T }
            | { hit: false } {
            const entry = entries.get(key);

            if (!entry) {
                return { hit: false };
            }

            if (now() >= entry.expiresAt) {
                entries.delete(key);
                return { hit: false };
            }

            return {
                hit: true,
                value: entry.value
            };
        },

        set(key: string, value: T): void {
            entries.set(key, {
                value,
                expiresAt: now() + ttlMs
            });
        },

        clear(): void {
            entries.clear();
        }
    };
}
