// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { createTmdbClient } from "./tmdbClient.ts";

const movie = {
  id: 157336,
  title: "Interstellar",
  overview: "Una aventura espacial",
  release_date: "2014-11-05",
  poster_path: "/poster.jpg"
};

const movieDetails = {
  ...movie,
  vote_average: 8.4,
  vote_count: 30000,
  imdb_id: "tt0816692",
  genres: [{ id: 878, name: "Ciencia ficción" }]
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function mockJsonFetch(data: unknown, status = 200) {
  return vi.fn<typeof fetch>(async () => jsonResponse(data, status));
}

describe("Cliente HTTP de TMDB", () => {
  describe("inicialización", () => {
    it("rechaza una API key vacía", () => {
      expect(() => createTmdbClient("  ")).toThrow(
        "Falta la API key de TMDB"
      );
    });
  });

  describe("searchMovie", () => {
    it("busca una película y construye correctamente la petición", async () => {
      const mockFetch = mockJsonFetch({ results: [movie] });
      const client = createTmdbClient("fake-api-key", mockFetch);

      const result = await client.searchMovie("  Interstellar  ");

      expect(result.results).toEqual([movie]);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const call = mockFetch.mock.calls[0];
      const url = new URL(String(call?.[0]));
      expect(url.origin).toBe("https://api.themoviedb.org");
      expect(url.pathname).toBe("/3/search/movie");
      expect(url.searchParams.get("query")).toBe("Interstellar");
      expect(url.searchParams.get("api_key")).toBe("fake-api-key");
      expect(url.searchParams.get("language")).toBe("es-ES");
      expect(url.searchParams.get("include_adult")).toBe("false");
      expect(call?.[1]?.signal).toBeInstanceOf(AbortSignal);
    });

    it("devuelve una lista vacía si no hay resultados", async () => {
      const client = createTmdbClient(
        "fake-api-key",
        mockJsonFetch({ results: [] })
      );

      await expect(client.searchMovie("Título inexistente")).resolves.toEqual({
        results: []
      });
    });

    it("rechaza títulos vacíos sin consultar TMDB", async () => {
      const mockFetch = mockJsonFetch({ results: [] });
      const client = createTmdbClient("fake-api-key", mockFetch);

      await expect(client.searchMovie("   ")).rejects.toThrow(
        "El título de la película es obligatorio"
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("rechaza una respuesta con películas mal formadas", async () => {
      const client = createTmdbClient(
        "fake-api-key",
        mockJsonFetch({ results: [{ id: "incorrecto", title: "Dune" }] })
      );

      await expect(client.searchMovie("Dune")).rejects.toThrow(
        "TMDB devolvió una respuesta inválida"
      );
    });
  });

  describe("getMovieDetails", () => {
    it("obtiene los detalles y construye las URLs de póster e IMDb", async () => {
      const mockFetch = mockJsonFetch(movieDetails);
      const client = createTmdbClient("fake-api-key", mockFetch);

      const result = await client.getMovieDetails(157336);

      expect(result.title).toBe("Interstellar");
      expect(result.vote_average).toBe(8.4);
      expect(result.vote_count).toBe(30000);
      expect(result.genres).toEqual([{ id: 878, name: "Ciencia ficción" }]);
      expect(result.poster_url).toBe(
        "https://image.tmdb.org/t/p/w500/poster.jpg"
      );
      expect(result.imdb_url).toBe(
        "https://www.imdb.com/title/tt0816692/"
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(new URL(String(mockFetch.mock.calls[0]?.[0])).pathname).toBe(
        "/3/movie/157336"
      );
    });

    it("devuelve null si faltan el póster y el identificador de IMDb", async () => {
      const client = createTmdbClient(
        "fake-api-key",
        mockJsonFetch({ ...movieDetails, poster_path: null, imdb_id: null })
      );

      const result = await client.getMovieDetails(157336);
      expect(result.poster_url).toBeNull();
      expect(result.imdb_url).toBeNull();
    });

    it("no construye URLs a partir de rutas o identificadores inválidos", async () => {
      const client = createTmdbClient(
        "fake-api-key",
        mockJsonFetch({
          ...movieDetails,
          poster_path: "https://otro-sitio.test/imagen.jpg",
          imdb_id: "https://otro-sitio.test"
        })
      );

      const result = await client.getMovieDetails(157336);
      expect(result.poster_url).toBeNull();
      expect(result.imdb_url).toBeNull();
    });

    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
      "rechaza el ID inválido %s sin usar la red",
      async (movieId) => {
        const mockFetch = mockJsonFetch(movieDetails);
        const client = createTmdbClient("fake-api-key", mockFetch);

        await expect(client.getMovieDetails(movieId)).rejects.toThrow(
          "El ID de la película debe ser un entero positivo"
        );
        expect(mockFetch).not.toHaveBeenCalled();
      }
    );

    it("rechaza detalles incompletos o inválidos", async () => {
      const client = createTmdbClient(
        "fake-api-key",
        mockJsonFetch({ ...movieDetails, vote_average: "8.4" })
      );

      await expect(client.getMovieDetails(157336)).rejects.toThrow(
        "TMDB devolvió detalles inválidos"
      );
    });
  });

  describe("getRecommendations", () => {
    it("recomienda películas utilizando el ID de otra película", async () => {
      const recommended = { ...movie, id: 438631, title: "Dune" };
      const mockFetch = mockJsonFetch({ results: [recommended] });
      const client = createTmdbClient("fake-api-key", mockFetch);

      const result = await client.getRecommendations({ movieId: 157336 });

      expect(result.results).toEqual([recommended]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const url = new URL(String(mockFetch.mock.calls[0]?.[0]));
      expect(url.pathname).toBe("/3/movie/157336/recommendations");
      expect(url.searchParams.get("include_adult")).toBe("false");
    });

    it("recomienda películas por género sin importar tildes o mayúsculas", async () => {
      const mockFetch = vi.fn<typeof fetch>(async (input) => {
        const url = new URL(String(input));

        if (url.pathname === "/3/genre/movie/list") {
          return jsonResponse({
            genres: [
              { id: 878, name: "Ciencia ficción" },
              { id: 28, name: "Acción" }
            ]
          });
        }
        if (url.pathname === "/3/discover/movie") {
          return jsonResponse({ results: [movie] });
        }
        return new Response(null, { status: 404 });
      });
      const client = createTmdbClient("fake-api-key", mockFetch);

      const result = await client.getRecommendations({
        genre: "  CIENCIA FICCION  "
      });

      expect(result.results).toEqual([movie]);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const catalogUrl = new URL(String(mockFetch.mock.calls[0]?.[0]));
      const discoverUrl = new URL(String(mockFetch.mock.calls[1]?.[0]));
      expect(catalogUrl.pathname).toBe("/3/genre/movie/list");
      expect(discoverUrl.pathname).toBe("/3/discover/movie");
      expect(discoverUrl.searchParams.get("with_genres")).toBe("878");
      expect(discoverUrl.searchParams.get("sort_by")).toBe("popularity.desc");
    });

    it("rechaza IDs inválidos sin consultar TMDB", async () => {
      const mockFetch = mockJsonFetch({ results: [] });
      const client = createTmdbClient("fake-api-key", mockFetch);

      await expect(client.getRecommendations({ movieId: -5 })).rejects.toThrow(
        "El ID de la película debe ser un entero positivo"
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("rechaza géneros vacíos sin consultar TMDB", async () => {
      const mockFetch = mockJsonFetch({ results: [] });
      const client = createTmdbClient("fake-api-key", mockFetch);

      await expect(client.getRecommendations({ genre: "   " })).rejects.toThrow(
        "Debe proporcionar movieId o genre"
      );
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("informa cuando el género no existe", async () => {
      const mockFetch = mockJsonFetch({
        genres: [{ id: 878, name: "Ciencia ficción" }]
      });
      const client = createTmdbClient("fake-api-key", mockFetch);

      await expect(
        client.getRecommendations({ genre: "Género desconocido" })
      ).rejects.toThrow("No se encontró el género: Género desconocido");
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("rechaza un catálogo de géneros inválido", async () => {
      const client = createTmdbClient(
        "fake-api-key",
        mockJsonFetch({ genres: [{ id: "878", name: "Ciencia ficción" }] })
      );

      await expect(
        client.getRecommendations({ genre: "Ciencia ficción" })
      ).rejects.toThrow("TMDB devolvió una lista de géneros inválida");
    });

    it("rechaza una respuesta de recomendaciones inválida", async () => {
      const client = createTmdbClient(
        "fake-api-key",
        mockJsonFetch({ results: "no es una lista" })
      );

      await expect(
        client.getRecommendations({ movieId: 157336 })
      ).rejects.toThrow("TMDB devolvió recomendaciones inválidas");
    });
  });

  describe("errores HTTP y de red", () => {
    it("explica el error 401 de autenticación", async () => {
      const client = createTmdbClient("fake-api-key", mockJsonFetch({}, 401));
      await expect(client.searchMovie("Dune")).rejects.toThrow(
        "TMDB: credencial no autorizada"
      );
    });

    it("explica el error 429 de límite de solicitudes", async () => {
      const client = createTmdbClient("fake-api-key", mockJsonFetch({}, 429));
      await expect(client.searchMovie("Dune")).rejects.toThrow(
        "TMDB: límite de solicitudes alcanzado"
      );
    });

    it.each([404, 500, 503])(
      "informa el estado HTTP %s",
      async (status) => {
        const client = createTmdbClient(
          "fake-api-key",
          mockJsonFetch({}, status)
        );
        await expect(client.searchMovie("Dune")).rejects.toThrow(
          `TMDB respondió con HTTP ${status}`
        );
      }
    );

    it("propaga un fallo de red sin ocultarlo", async () => {
      const mockFetch = vi.fn<typeof fetch>(async () => {
        throw new TypeError("Fallo de red simulado");
      });
      const client = createTmdbClient("fake-api-key", mockFetch);

      await expect(client.searchMovie("Dune")).rejects.toThrow(
        "Fallo de red simulado"
      );
    });
  });
});
