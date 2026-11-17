import {
  MAX_DESCRIPTION_LENGTH,
  createNotFoundResult,
  normalizeText,
  pickBestBookMatch,
  sanitizeBooksUrl,
  sanitizeDescription,
  scoreVolumeMatch,
} from "../../../../server/mcp/books/matcher.ts";

describe("matcher", () => {
  describe("normalizeText", () => {
    it("convierte a minusculas, elimina tildes y signos de puntuacion", () => {
      expect(normalizeText("  ¡El Señor de los Anillos: La Comunidad! ")).toBe(
        "el senor de los anillos la comunidad",
      );
    });
  });

  describe("sanitizeDescription", () => {
    it("devuelve null cuando la descripcion esta vacia o solo tiene HTML", () => {
      expect(sanitizeDescription(undefined)).toBeNull();
      expect(sanitizeDescription("   <p>  </p> ")).toBeNull();
    });

    it("elimina etiquetas HTML y caracteres de control (mitigacion LLM01)", () => {
      const raw = "<p>Una <b>gran</b> novela.\u0007</p>\n<script> </script> Fin.";
      expect(sanitizeDescription(raw)).toBe("Una gran novela. Fin.");
    });

    it("trunca descripciones que superan MAX_DESCRIPTION_LENGTH", () => {
      const longText = "a".repeat(MAX_DESCRIPTION_LENGTH + 50);
      const clean = sanitizeDescription(longText);
      expect(clean).not.toBeNull();
      expect(clean!.length).toBe(MAX_DESCRIPTION_LENGTH);
      expect(clean!.endsWith("…")).toBe(true);
    });
  });

  describe("sanitizeBooksUrl", () => {
    it("acepta dominios oficiales de Google Books y fuerza https", () => {
      expect(sanitizeBooksUrl("http://books.google.com/books?id=123")).toBe(
        "https://books.google.com/books?id=123",
      );
      expect(sanitizeBooksUrl("https://books.google.com.gt/books?id=abc")).toBe(
        "https://books.google.com.gt/books?id=abc",
      );
      expect(sanitizeBooksUrl("https://play.google.com/store/books/details?id=xyz")).toBe(
        "https://play.google.com/store/books/details?id=xyz",
      );
    });

    it("rechaza URLs de otros dominios, esquemas peligrosos o malformadas", () => {
      expect(sanitizeBooksUrl(undefined)).toBeNull();
      expect(sanitizeBooksUrl("javascript:alert(1)")).toBeNull();
      expect(sanitizeBooksUrl("https://evil.example.com/books?id=123")).toBeNull();
      expect(sanitizeBooksUrl("no-es-una-url")).toBeNull();
    });
  });

  describe("scoreVolumeMatch y pickBestBookMatch", () => {
    it("encuentra coincidencia exacta y devuelve metadatos limpios", () => {
      const result = pickBestBookMatch({ title: "Dune", author: "Frank Herbert" }, [
        {
          volumeInfo: {
            title: "Dune",
            authors: ["Frank Herbert"],
            description: "<p>Arrakis epic story.</p>",
            averageRating: 4.5,
            canonicalVolumeLink: "http://books.google.com/books/about/Dune.html?id=1",
          },
        },
      ]);

      expect(result).toEqual({
        found: true,
        title: "Dune",
        authors: ["Frank Herbert"],
        description: "Arrakis epic story.",
        rating: 4.5,
        books_url: "https://books.google.com/books/about/Dune.html?id=1",
      });
    });

    it("descarta guias de estudio, resumenes y revistas para evitar falsos positivos", () => {
      const result = pickBestBookMatch({ title: "Inception" }, [
        {
          volumeInfo: {
            title: "Inception: A Study Guide",
            authors: ["Moviegoer"],
          },
        },
        {
          volumeInfo: {
            title: "Inception",
            printType: "MAGAZINE",
          },
        },
        {
          volumeInfo: {
            title: "Completely Unrelated Book",
          },
        },
      ]);

      expect(result).toEqual(createNotFoundResult());
    });

    it("reconoce subtitulos y desambigua usando el autor cuando se provee", () => {
      const result = pickBestBookMatch({ title: "The Shining", author: "Stephen King" }, [
        {
          volumeInfo: {
            title: "The Shining",
            authors: ["Otro Autor"],
            infoLink: "https://books.google.com/books?id=wrong",
          },
        },
        {
          volumeInfo: {
            title: "The Shining: Deluxe Edition",
            authors: ["Stephen King"],
            averageRating: 4.8,
            infoLink: "https://books.google.com/books?id=king",
          },
        },
      ]);

      expect(result.found).toBe(true);
      expect(result.authors).toEqual(["Stephen King"]);
      expect(result.books_url).toBe("https://books.google.com/books?id=king");
    });

    it("maneja listas vacias, candidatos por coincidencia parcial de tokens y ratings invalidos", () => {
      expect(pickBestBookMatch({ title: "Dune" }, [])).toEqual(createNotFoundResult());
      expect(scoreVolumeMatch({ title: "" }, { title: "Dune" })).toBe(0);

      const partial = pickBestBookMatch(
        { title: "Harry Potter and the Prisoner of Azkaban: Illustrated" },
        [
          {
            volumeInfo: {
              title: "Harry Potter and the Prisoner of Azkaban",
              authors: ["J.K. Rowling"],
              averageRating: 99, // invalido (> 5), debe normalizarse a null
            },
          },
        ],
      );

      expect(partial.found).toBe(true);
      expect(partial.rating).toBeNull();
    });
  });
});

