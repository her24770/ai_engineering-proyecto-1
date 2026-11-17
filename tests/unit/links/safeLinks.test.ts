import { describe, expect, it } from "vitest";
import { toSafeLink } from "../../../src/links/safeLinks";

describe("toSafeLink", () => {
  it("acepta IMDb y lo etiqueta", () => {
    expect(toSafeLink("https://www.imdb.com/title/tt1160419/")).toEqual({
      url: "https://www.imdb.com/title/tt1160419/",
      label: "IMDb",
    });
    expect(toSafeLink("https://m.imdb.com/title/tt1/")?.label).toBe("IMDb");
  });

  it("acepta Google Books en cualquier TLD y fuerza https", () => {
    expect(toSafeLink("http://books.google.com/books?id=1")).toEqual({
      url: "https://books.google.com/books?id=1",
      label: "Google Books",
    });
    expect(toSafeLink("https://books.google.com.gt/books?id=1")?.label).toBe("Google Books");
  });

  it("rechaza otros dominios, subdominios engañosos, credenciales y esquemas peligrosos", () => {
    expect(toSafeLink("https://evil.com")).toBeNull();
    expect(toSafeLink("https://imdb.com.evil.com/x")).toBeNull();
    expect(toSafeLink("https://user:pass@www.imdb.com/")).toBeNull();
    expect(toSafeLink("javascript:alert(1)")).toBeNull();
    expect(toSafeLink("no-es-url")).toBeNull();
  });
});
