import { loadConfig, requireKey } from "../../../server/src/config.ts";

describe("loadConfig", () => {
  it("usa valores por defecto", () => {
    const config = loadConfig({});
    expect(config.port).toBe(3000);
    expect(config.allowedOrigins).toEqual([]);
    expect(config.rateLimitMax).toBe(30);
    expect(config.llmApiKey).toBeUndefined();
    expect(config.llmModel).toBe("openai/gpt-oss-120b");
    expect(config.llmBaseUrl).toBe("https://api.groq.com/openai/v1");
    expect(config.llmReasoningEffort).toBe("low");
    expect(loadConfig({ LLM_REASONING_EFFORT: "" }).llmReasoningEffort).toBeUndefined();
  });

  it("permite cambiar el modelo y la URL base del LLM", () => {
    const config = loadConfig({
      LLM_MODEL: "otro-modelo",
      LLM_BASE_URL: "https://proveedor.ejemplo/v1/",
    });
    expect(config.llmModel).toBe("otro-modelo");
    expect(config.llmBaseUrl).toBe("https://proveedor.ejemplo/v1");
  });

  it("lee variables y separa los origenes permitidos", () => {
    const config = loadConfig({
      PORT: "8080",
      ALLOWED_ORIGINS: "https://a.com, https://b.com",
      LLM_API_KEY: "sk-x",
      TMDB_API_KEY: "t",
      GOOGLE_BOOKS_API_KEY: "g",
    });
    expect(config.port).toBe(8080);
    expect(config.allowedOrigins).toEqual(["https://a.com", "https://b.com"]);
    expect(config.llmApiKey).toBe("sk-x");
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
    expect(() => requireKey(undefined, "LLM_API_KEY")).toThrow(/LLM_API_KEY/);
  });
});
