
// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  getImdbUrl,
  getPosterUrl,
  mapMovie,
  mapMovieDetails,
  mapMovies
} from "../../../../../server/mcp/tmdb/tmdbMapper.ts";
import type {
  TmdbMovie,
  TmdbMovieDetails
} from "../../../../../server/mcp/tmdb/tmdbClient.ts";

const movie: TmdbMovie = {
  id: 157336,
  title: "Interstellar",
  overview: "Una aventura espacial",
  release_date: "2014-11-05",
  poster_path: "/poster.jpg"
};

describe("movieMapper", () => {
  it("convierte una película al contrato del agente", () => {
    expect(mapMovie(movie)).toEqual({
      id: 157336,
      title: "Interstellar",
      overview: "Una aventura espacial",
      year: "2014",
      poster_url: "https://image.tmdb.org/t/p/w500/poster.jpg"
    });
  });

  it("transforma una lista de películas y conserva el orden", () => {
    const anotherMovie: TmdbMovie = {
      id: 438631,
      title: "Dune",
      overview: "Una aventura en Arrakis",
      release_date: "2021-09-15",
      poster_path: null
    };

    const results = mapMovies([movie, anotherMovie]);

    expect(results).toHaveLength(2);
    expect(results.map((result) => result.id)).toEqual([157336, 438631]);
    expect(results[1]?.year).toBe("2021");
    expect(results[1]?.poster_url).toBeNull();
  });

  it("maneja una lista de resultados vacía", () => {
    expect(mapMovies([])).toEqual([]);
  });

  it("devuelve un año nulo cuando no hay fecha de estreno", () => {
    expect(mapMovie({ ...movie, release_date: "" }).year).toBeNull();
  });

  it("devuelve un año nulo cuando la fecha tiene un formato incorrecto", () => {
    expect(mapMovie({ ...movie, release_date: "sin fecha" }).year).toBeNull();
    expect(mapMovie({ ...movie, release_date: "0000-01-01" }).year).toBeNull();
  });

  it("construye la URL del póster con tamaño w500", () => {
    expect(getPosterUrl("/ejemplo.webp")).toBe(
      "https://image.tmdb.org/t/p/w500/ejemplo.webp"
    );
  });

  it("maneja pósteres ausentes o rutas no válidas", () => {
    expect(getPosterUrl(null)).toBeNull();
    expect(getPosterUrl("https://otro-sitio.com/imagen.jpg")).toBeNull();
    expect(getPosterUrl("/../imagen.jpg")).toBeNull();
    expect(getPosterUrl("/poster.svg")).toBeNull();
  });

  it("construye URLs de IMDb únicamente con IDs válidos", () => {
    expect(getImdbUrl("tt0816692")).toBe(
      "https://www.imdb.com/title/tt0816692/"
    );

    expect(getImdbUrl(null)).toBeNull();
    expect(getImdbUrl("https://ejemplo.com")).toBeNull();
    expect(getImdbUrl("tt123/otra-ruta")).toBeNull();
  });

  it("mapea los detalles según el contrato compartido", () => {
    const details: TmdbMovieDetails = {
      ...movie,
      vote_average: 8.4,
      vote_count: 30000,
      genres: [{ id: 878, name: "Ciencia ficción" }],
      imdb_id: "tt0816692",
      poster_url: "https://image.tmdb.org/t/p/w500/poster.jpg",
      imdb_url: "https://www.imdb.com/title/tt0816692/"
    };

    expect(mapMovieDetails(details)).toEqual({
      id: 157336,
      title: "Interstellar",
      overview: "Una aventura espacial",
      year: "2014",
      poster_url: "https://image.tmdb.org/t/p/w500/poster.jpg",
      rating: 8.4,
      imdb_url: "https://www.imdb.com/title/tt0816692/"
    });
  });

  it("mapea detalles aunque falten el póster y el identificador de IMDb", () => {
    const details: TmdbMovieDetails = {
      ...movie,
      poster_path: null,
      imdb_id: null,
      poster_url: null,
      imdb_url: null,
      vote_average: 0,
      vote_count: 0,
      genres: []
    };

    const result = mapMovieDetails(details);

    expect(result.poster_url).toBeNull();
    expect(result.imdb_url).toBeNull();
    expect(result.rating).toBe(0);
  });

  it("no modifica el objeto original", () => {
    const snapshot = structuredClone(movie);
    mapMovie(movie);
    expect(movie).toEqual(snapshot);
  });
});
