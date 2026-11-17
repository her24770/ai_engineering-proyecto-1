import { loadConfig, requireKey } from "../../../server/src/config.ts";

describe("loadConfig", () => {
  it("usa valores por defecto", () => {
    const config = loadConfig({});
    expect(config.port).toBe(3000);
    expect(config.allowedOrigins).toEqual([]);
    expect(config.rateLimitMax).toBe(30);
    expect(config.openaiApiKey).toBeUndefined();
    expect(config.openaiModel).toBe("gpt-4o-mini");
    expect(config.openaiBaseUrl).toBe("https://api.openai.com/v1");
  });

  it("permite cambiar el modelo y la URL base del LLM", () => {
    const config = loadConfig({
      OPENAI_MODEL: "otro-modelo",
      OPENAI_BASE_URL: "https://proveedor.ejemplo/v1/",
    });
    expect(config.openaiModel).toBe("otro-modelo");
    expect(config.openaiBaseUrl).toBe("https://proveedor.ejemplo/v1");
  });

  it("lee variables y separa los origenes permitidos", () => {
    const config = loadConfig({
      PORT: "8080",
      ALLOWED_ORIGINS: "https://a.com, https://b.com",
      OPENAI_API_KEY: "sk-x",
      TMDB_API_KEY: "t",
      GOOGLE_BOOKS_API_KEY: "g",
    });
    expect(config.port).toBe(8080);
    expect(config.allowedOrigins).toEqual(["https://a.com", "https://b.com"]);
    expect(config.openaiApiKey).toBe("sk-x");
    expect(config.tmdbApiKey).toBe("t");
    expect(config.googleBooksApiKey).toBe("g");
  });

  it("rechaza numeros invalidos", () => {
    expect(() => loadConfig({ PORT: "abc" })).toThrow(/PORT/);
    expect(() => loadConfig({ RATE_LIMIT_MAX: "0" })).toThrow(/RATE_LIMIT_MAX/);
  });
});

describe("requireKey", () => {
  it("devuelve el valor o falla con el nombre de la variable", () => {
    expect(requireKey("abc", "X")).toBe("abc");
    expect(() => requireKey(undefined, "OPENAI_API_KEY")).toThrow(/OPENAI_API_KEY/);
  });
});
