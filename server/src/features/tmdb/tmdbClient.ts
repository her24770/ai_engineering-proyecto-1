// Cliente HTTP para TMDB. No depende del SDK MCP ni expone credenciales al frontend.

export interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
}

export interface TmdbSearchResponse {
  results: TmdbMovie[];
}

export interface TmdbMovieDetails extends TmdbMovie {
  vote_average: number;
  vote_count: number;
  imdb_id: string | null;
  genres: Array<{ id: number; name: string }>;
  poster_url: string | null;
  imdb_url: string | null;
}

export type RecommendationFilter =
  | { movieId: number; genre?: never }
  | { genre: string; movieId?: never };

type TmdbMovieDetailsRaw = Omit<TmdbMovieDetails, "poster_url" | "imdb_url">;

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbGenresResponse {
  genres: TmdbGenre[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMovie(value: unknown): value is TmdbMovie {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.id) &&
    typeof value.title === "string" &&
    typeof value.overview === "string" &&
    typeof value.release_date === "string" &&
    (typeof value.poster_path === "string" || value.poster_path === null)
  );
}

function isSearchResponse(value: unknown): value is TmdbSearchResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.results) &&
    value.results.every(isMovie)
  );
}

function isMovieDetailsResponse(value: unknown): value is TmdbMovieDetailsRaw {
  return (
    isRecord(value) &&
    isMovie(value) &&
    typeof value.vote_average === "number" &&
    Number.isFinite(value.vote_average) &&
    Number.isSafeInteger(value.vote_count) &&
    (typeof value.imdb_id === "string" || value.imdb_id === null) &&
    Array.isArray(value.genres) &&
    value.genres.every(
      (genre: unknown) =>
        isRecord(genre) &&
        Number.isSafeInteger(genre.id) &&
        typeof genre.name === "string"
    )
  );
}

function isGenresResponse(value: unknown): value is TmdbGenresResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.genres) &&
    value.genres.every(
      (genre: unknown) =>
        isRecord(genre) &&
        Number.isSafeInteger(genre.id) &&
        typeof genre.name === "string"
    )
  );
}

function normalizeGenre(genre: string): string {
  return genre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getPosterUrl(path: string | null): string | null {
  if (path === null || !/^\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(path)) {
    return null;
  }
  return `https://image.tmdb.org/t/p/w500${path}`;
}

function getImdbUrl(imdbId: string | null): string | null {
  if (imdbId === null || !/^tt\d+$/.test(imdbId)) {
    return null;
  }
  return `https://www.imdb.com/title/${imdbId}/`;
}

export function createTmdbClient(apiKey: string, fetchFn: typeof fetch = fetch) {
  if (!apiKey.trim()) {
    throw new Error("Falta la API key de TMDB");
  }

  async function requestTmdb(
    path: string,
    params: Record<string, string> = {}
  ): Promise<unknown> {
    const url = new URL(path, "https://api.themoviedb.org");
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("language", "es-ES");

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetchFn(url.toString(), {
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("TMDB: límite de solicitudes alcanzado");
      }
      if (response.status === 401) {
        throw new Error("TMDB: credencial no autorizada");
      }
      throw new Error(`TMDB respondió con HTTP ${response.status}`);
    }

    const data: unknown = await response.json();
    return data;
  }

  return {
    async searchMovie(query: string): Promise<TmdbSearchResponse> {
      if (!query.trim()) {
        throw new Error("El título de la película es obligatorio");
      }

      const data = await requestTmdb("/3/search/movie", {
        query: query.trim(),
        include_adult: "false"
      });

      if (!isSearchResponse(data)) {
        throw new Error("TMDB devolvió una respuesta inválida");
      }
      return data;
    },

    async getMovieDetails(movieId: number): Promise<TmdbMovieDetails> {
      if (!Number.isSafeInteger(movieId) || movieId <= 0) {
        throw new Error("El ID de la película debe ser un entero positivo");
      }

      const data = await requestTmdb(`/3/movie/${movieId}`);

      if (!isMovieDetailsResponse(data)) {
        throw new Error("TMDB devolvió detalles inválidos");
      }

      return {
        ...data,
        poster_url: getPosterUrl(data.poster_path),
        imdb_url: getImdbUrl(data.imdb_id)
      };
    },

    async getRecommendations(
      filter: RecommendationFilter
    ): Promise<TmdbSearchResponse> {
      let path: string;
      const params: Record<string, string> = { include_adult: "false" };

      if (typeof filter.movieId === "number") {
        if (!Number.isSafeInteger(filter.movieId) || filter.movieId <= 0) {
          throw new Error("El ID de la película debe ser un entero positivo");
        }
        path = `/3/movie/${filter.movieId}/recommendations`;
      } else if (typeof filter.genre === "string" && filter.genre.trim()) {
        const genresData = await requestTmdb("/3/genre/movie/list");
        if (!isGenresResponse(genresData)) {
          throw new Error("TMDB devolvió una lista de géneros inválida");
        }

        const normalized = normalizeGenre(filter.genre);
        const genre = genresData.genres.find(
          (item) => normalizeGenre(item.name) === normalized
        );
        if (!genre) {
          throw new Error(`No se encontró el género: ${filter.genre}`);
        }

        path = "/3/discover/movie";
        params.with_genres = String(genre.id);
        params.sort_by = "popularity.desc";
      } else {
        throw new Error("Debe proporcionar movieId o genre");
      }

      const data = await requestTmdb(path, params);
      if (!isSearchResponse(data)) {
        throw new Error("TMDB devolvió recomendaciones inválidas");
      }
      return data;
    }
  };
}
