
import type { TmdbMovie, TmdbMovieDetails } from "./tmdbClient.ts";
import type { MovieSummary, MovieDetails } from "../contracts.ts";

function getReleaseYear(releaseDate: string): string | null {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(releaseDate);

  if (!match) {
    return null;
  }

  return Number(match[1]) > 0 ? match[1] : null;
}

export function getPosterUrl(path: string | null): string | null {
  if (path === null || !/^\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(path)) {
    return null;
  }

  return `https://image.tmdb.org/t/p/w500${path}`;
}

export function getImdbUrl(imdbId: string | null): string | null {
  if (imdbId === null || !/^tt\d+$/.test(imdbId)) {
    return null;
  }

  return `https://www.imdb.com/title/${imdbId}/`;
}

export function mapMovie(movie: TmdbMovie): MovieSummary {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    year: getReleaseYear(movie.release_date),
    poster_url: getPosterUrl(movie.poster_path)
  };
}

export function mapMovies(movies: readonly TmdbMovie[]): MovieSummary[] {
  return movies.map(mapMovie);
}

export function mapMovieDetails(movie: TmdbMovieDetails): MovieDetails {
  return {
    ...mapMovie(movie),
    rating: movie.vote_average,
    imdb_url: getImdbUrl(movie.imdb_id)
  };
}

export function mapRecommendation(
  movie: Omit<TmdbMovie, "poster_path"> & { poster_url: string | null }
): MovieSummary {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    year: getReleaseYear(movie.release_date),
    poster_url: movie.poster_url
  };
}