import type { BookSearchResult, SearchBookInput } from "../contracts.ts";
import {
  createNotFoundResult,
  normalizeText,
  pickBestBookMatch,
  type GoogleBooksVolumeItem,
} from "./matcher.ts";

export const DEFAULT_MAX_DAILY_REQUESTS = 1000;
export const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
export const DEFAULT_MAX_CACHE_ENTRIES = 500;
export const DEFAULT_TIMEOUT_MS = 5000;
const GOOGLE_BOOKS_API_URL = "https://www.googleapis.com/books/v1/volumes";

export interface GoogleBooksApiResponse {
  totalItems?: number;
  items?: GoogleBooksVolumeItem[];
}

export interface GoogleBooksClientOptions {
  apiKey: string;
  fetchFn?: typeof fetch;
  maxDailyRequests?: number;
  cacheTtlMs?: number;
  maxCacheEntries?: number;
  timeoutMs?: number;
  now?: () => number;
}

interface CacheEntry {
  value: BookSearchResult;
  expiresAt: number;
}

export class BooksQuotaExceededError extends Error {
  readonly limit: number;

  constructor(limit: number) {
    super(
      `Se alcanzo el limite diario de ${limit} consultas a Google Books API. Intenta de nuevo manana.`,
    );
    this.name = "BooksQuotaExceededError";
    this.limit = limit;
  }
}

export class BooksApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "BooksApiError";
    this.status = status;
  }
}

function getUtcDateKey(timestampMs: number): string {
  return new Date(timestampMs).toISOString().slice(0, 10);
}

function cloneResult(result: BookSearchResult): BookSearchResult {
  return {
    ...result,
    authors: [...result.authors],
  };
}

function redactSecret(text: string, secret: string): string {
  if (!secret) return text;
  return text.split(secret).join("[REDACTED]");
}

/**
 * Cliente de Google Books con cache en memoria (TTL + LRU simple), control
 * de cuota diaria (1000 req/dia por defecto) y `fetch` inyectable para tests.
 */
export class GoogleBooksClient {
  private readonly apiKey: string;
  private readonly fetchFn: typeof fetch;
  private readonly maxDailyRequests: number;
  private readonly cacheTtlMs: number;
  private readonly maxCacheEntries: number;
  private readonly timeoutMs: number;
  private readonly now: () => number;

  private readonly cache = new Map<string, CacheEntry>();
  private currentDayKey: string;
  private requestsToday = 0;

  constructor(options: GoogleBooksClientOptions) {
    const trimmedKey = options.apiKey.trim();
    if (!trimmedKey) {
      throw new Error("La API key de Google Books no puede estar vacia");
    }

    this.apiKey = trimmedKey;
    this.fetchFn = options.fetchFn ?? globalThis.fetch;
    this.maxDailyRequests = options.maxDailyRequests ?? DEFAULT_MAX_DAILY_REQUESTS;
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.maxCacheEntries = options.maxCacheEntries ?? DEFAULT_MAX_CACHE_ENTRIES;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.now = options.now ?? (() => Date.now());
    this.currentDayKey = getUtcDateKey(this.now());
  }

  getRemainingDailyQuota(): number {
    this.syncDayWindow();
    return Math.max(0, this.maxDailyRequests - this.requestsToday);
  }

  async searchBook(input: SearchBookInput): Promise<BookSearchResult> {
    const normalizedTitle = normalizeText(input.title);
    if (!normalizedTitle) {
      return createNotFoundResult();
    }

    const normalizedAuthor = input.author ? normalizeText(input.author) : "";
    const cacheKey = `${normalizedTitle}|${normalizedAuthor}`;

    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    this.consumeQuotaOrThrow();

    const queryParts = [`intitle:"${input.title.trim().replace(/"/g, "")}"`];
    if (input.author && input.author.trim() !== "") {
      queryParts.push(`inauthor:"${input.author.trim().replace(/"/g, "")}"`);
    }

    const url = new URL(GOOGLE_BOOKS_API_URL);
    url.searchParams.set("q", queryParts.join(" "));
    url.searchParams.set("printType", "books");
    url.searchParams.set("maxResults", "5");
    url.searchParams.set("key", this.apiKey);

    let response: Response;
    try {
      response = await this.fetchFn(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      const rawMsg = error instanceof Error ? error.message : "Error de red desconocido";
      throw new BooksApiError(
        `No se pudo conectar con Google Books API: ${redactSecret(rawMsg, this.apiKey)}`,
      );
    }

    if (!response.ok) {
      throw new BooksApiError(
        `Google Books API respondio con estado HTTP ${response.status}`,
        response.status,
      );
    }

    const data = (await response.json()) as GoogleBooksApiResponse;
    const result = pickBestBookMatch(input, data.items);

    this.saveToCache(cacheKey, result);
    return cloneResult(result);
  }

  private syncDayWindow(): void {
    const today = getUtcDateKey(this.now());
    if (today !== this.currentDayKey) {
      this.currentDayKey = today;
      this.requestsToday = 0;
    }
  }

  private consumeQuotaOrThrow(): void {
    this.syncDayWindow();
    if (this.requestsToday >= this.maxDailyRequests) {
      throw new BooksQuotaExceededError(this.maxDailyRequests);
    }
    this.requestsToday += 1;
  }

  private getFromCache(key: string): BookSearchResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (this.now() >= entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Refresca orden de uso reciente (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return cloneResult(entry.value);
  }

  private saveToCache(key: string, value: BookSearchResult): void {
    if (this.cache.size >= this.maxCacheEntries && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value: cloneResult(value),
      expiresAt: this.now() + this.cacheTtlMs,
    });
  }
}

