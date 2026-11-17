import type { TmdbMovie, TmdbMovieDetails } from "./tmdbClient.ts";

export interface MovieSummary {
  id: number;
  title: string;
  overview: string;
  year: number | null;
  poster_url: string | null;
}

export interface MovieDetails extends MovieSummary {
  vote_average: number;
  vote_count: number;
  genres: Array<{ id: number; name: string }>;
  imdb_url: string | null;
}

function getReleaseYear(releaseDate: string): number | null {
  const match = /^(\d{4})-\d{2}-\d{2}$/.exec(releaseDate);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  return year > 0 ? year : null;
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
    vote_average: movie.vote_average,
    vote_count: movie.vote_count,
    genres: movie.genres.map((genre) => ({ id: genre.id, name: genre.name })),
    imdb_url: getImdbUrl(movie.imdb_id)
  };
}
