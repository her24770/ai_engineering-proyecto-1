/**
 * Contratos compartidos para las herramientas MCP del Proyecto 2.
**/
// ==========================================
// Herramientas MCP TMDB (The Movie Database)
// ==========================================

export interface SearchMovieInput {
  query: string;
}

export interface MovieSummary {
  id: number;
  title: string;
  year: string | null;
  overview: string;
  poster_url: string | null;
}

export interface GetRecommendationsInput {
  movie_id?: number;
  genre?: string;
}

export interface GetMovieDetailsInput {
  movie_id: number;
}

export interface MovieDetails {
  id: number;
  title: string;
  year: string | null;
  overview: string;
  rating: number;
  poster_url: string | null;
  imdb_url: string | null;
}

// ==========================================
// Herramientas MCP Libros (Google Books)
// ==========================================

export interface SearchBookInput {
  title: string;
  author?: string;
}

export interface BookSearchResult {
  found: boolean;
  title: string | null;
  authors: string[];
  description: string | null;
  rating: number | null;
  books_url: string | null;
}

