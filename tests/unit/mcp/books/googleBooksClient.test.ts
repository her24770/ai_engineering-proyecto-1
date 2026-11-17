import {
  BooksApiError,
  BooksQuotaExceededError,
  GoogleBooksClient,
} from "../../../../server/mcp/books/googleBooksClient.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("GoogleBooksClient", () => {
  it("exige una API key no vacia al instanciarse", () => {
    expect(() => new GoogleBooksClient({ apiKey: "   " })).toThrow(/API key/i);
  });

  it("devuelve found: false sin llamar a fetch si el titulo esta vacio", async () => {
    const fetchFn = vi.fn();
    const client = new GoogleBooksClient({ apiKey: "test-key", fetchFn });

    const res = await client.searchBook({ title: "   " });
    expect(res.found).toBe(false);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(client.getRemainingDailyQuota()).toBe(1000);
  });

  it("consulta Google Books API, cachea el resultado y evita llamadas repetidas", async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      jsonResponse({
        totalItems: 1,
        items: [
          {
            volumeInfo: {
              title: "Jurassic Park",
              authors: ["Michael Crichton"],
              description: "Dinosaurs cloned on an island.",
              averageRating: 4.3,
              canonicalVolumeLink: "https://books.google.com/books?id=jp",
            },
          },
        ],
      }),
    );

    const client = new GoogleBooksClient({ apiKey: "secret-key", fetchFn });

    const first = await client.searchBook({
      title: "Jurassic Park",
      author: "Michael Crichton",
    });
    const second = await client.searchBook({
      title: "  jurassic park! ",
      author: "michael crichton",
    });

    expect(first.found).toBe(true);
    expect(first.title).toBe("Jurassic Park");
    expect(second).toEqual(first);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(client.getRemainingDailyQuota()).toBe(999);

    const calledUrl = new URL(fetchFn.mock.calls[0]?.[0] as string);
    expect(calledUrl.searchParams.get("q")).toContain('intitle:"Jurassic Park"');
    expect(calledUrl.searchParams.get("q")).toContain('inauthor:"Michael Crichton"');
    expect(calledUrl.searchParams.get("key")).toBe("secret-key");
  });

  it("expira entradas de cache tras el TTL y desaloja la entrada mas antigua al llenarse", async () => {
    let currentTime = 1_000_000;
    const fetchFn = vi.fn().mockImplementation(async () =>
      jsonResponse({
        items: [{ volumeInfo: { title: "Dune", authors: ["Frank Herbert"] } }],
      }),
    );

    const client = new GoogleBooksClient({
      apiKey: "k",
      fetchFn,
      cacheTtlMs: 5000,
      maxCacheEntries: 1,
      now: () => currentTime,
    });

    await client.searchBook({ title: "Dune" });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Expira por TTL
    currentTime += 6000;
    await client.searchBook({ title: "Dune" });
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Llena cache (maxCacheEntries = 1) con otro libro y desaloja "Dune"
    await client.searchBook({ title: "Other" });
    await client.searchBook({ title: "Dune" });
    expect(fetchFn).toHaveBeenCalledTimes(4);
  });

  it("aplica el limite diario de requests y lo reinicia al cambiar de dia UTC", async () => {
    let currentTime = Date.parse("2026-11-16T12:00:00Z");
    const fetchFn = vi.fn().mockImplementation(async () => jsonResponse({ items: [] }));

    const client = new GoogleBooksClient({
      apiKey: "k",
      fetchFn,
      maxDailyRequests: 2,
      now: () => currentTime,
    });

    await client.searchBook({ title: "Movie 1" });
    await client.searchBook({ title: "Movie 2" });
    expect(client.getRemainingDailyQuota()).toBe(0);

    await expect(client.searchBook({ title: "Movie 3" })).rejects.toBeInstanceOf(
      BooksQuotaExceededError,
    );

    // Avanza al dia siguiente UTC
    currentTime = Date.parse("2026-11-17T00:01:00Z");
    expect(client.getRemainingDailyQuota()).toBe(2);
    await expect(client.searchBook({ title: "Movie 3" })).resolves.toMatchObject({
      found: false,
    });
  });

  it("envuelve errores HTTP y de red en BooksApiError sin filtrar la API key", async () => {
    const failingHttp = vi.fn().mockResolvedValue(jsonResponse({ error: "bad" }, 503));
    const clientHttp = new GoogleBooksClient({
      apiKey: "my-secret-key",
      fetchFn: failingHttp,
    });

    await expect(clientHttp.searchBook({ title: "Dune" })).rejects.toThrow(
      new BooksApiError("Google Books API respondio con estado HTTP 503", 503),
    );

    const failingNet = vi
      .fn()
      .mockRejectedValue(new Error("connect ETIMEDOUT https://...?key=my-secret-key"));
    const clientNet = new GoogleBooksClient({
      apiKey: "my-secret-key",
      fetchFn: failingNet,
    });

    try {
      await clientNet.searchBook({ title: "Dune" });
      expect.unreachable("Debio lanzar BooksApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(BooksApiError);
      expect((error as Error).message).not.toContain("my-secret-key");
      expect((error as Error).message).toContain("[REDACTED]");
    }
  });
});
