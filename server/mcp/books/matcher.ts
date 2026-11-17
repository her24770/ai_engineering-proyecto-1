import type { BookSearchResult, SearchBookInput } from "../contracts.ts";

export interface GoogleBooksVolumeInfo {
  title?: string;
  subtitle?: string;
  authors?: string[];
  description?: string;
  averageRating?: number;
  ratingsCount?: number;
  canonicalVolumeLink?: string;
  infoLink?: string;
  printType?: string;
}

export interface GoogleBooksVolumeItem {
  id?: string;
  volumeInfo?: GoogleBooksVolumeInfo;
}

export const MAX_DESCRIPTION_LENGTH = 500;
const MIN_MATCH_SCORE = 0.6;

/**
 * Terminos que suelen indicar material derivado no oficial (guias de estudio,
 * resumenes, libros para colorear, etc.). Si el usuario no los pidio en el
 * titulo buscado, se descartan para evitar falsos positivos de "si tiene libro".
 */
const DERIVATIVE_KEYWORDS = [
  "study guide",
  "guia de estudio",
  "summary",
  "resumen",
  "workbook",
  "coloring book",
  "libro para colorear",
  "trivia",
  "unofficial",
  "no oficial",
  "analysis of",
  "cliffnotes",
  "sparknotes",
];

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "of",
  "and",
  "in",
  "on",
  "to",
  "for",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "de",
  "del",
  "y",
  "en",
]);

export function createNotFoundResult(): BookSearchResult {
  return {
    found: false,
    title: null,
    authors: [],
    description: null,
    rating: null,
    books_url: null,
  };
}

/**
 * Normaliza texto para comparacion: minusculas, sin tildes/diacriticos,
 * sin signos de puntuacion y con espacios colapsados.
 */
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTokens(normalized: string): string[] {
  const allTokens = normalized.split(" ").filter(Boolean);
  const meaningful = allTokens.filter((token) => !STOP_WORDS.has(token));
  return meaningful.length > 0 ? meaningful : allTokens;
}

function isDerivativeWork(candidateText: string, queryText: string): boolean {
  for (const keyword of DERIVATIVE_KEYWORDS) {
    if (candidateText.includes(keyword) && !queryText.includes(keyword)) {
      return true;
    }
  }
  return false;
}

/**
 * Limpia etiquetas HTML, caracteres de control y acota la longitud de la
 * sinopsis para mitigar inyeccion indirecta (OWASP LLM01) y exceso de tokens.
 */
export function sanitizeDescription(raw: string | undefined): string | null {
  if (!raw) return null;

  const withoutHtml = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!withoutHtml) return null;

  if (withoutHtml.length <= MAX_DESCRIPTION_LENGTH) {
    return withoutHtml;
  }

  return `${withoutHtml.slice(0, MAX_DESCRIPTION_LENGTH - 1).trimEnd()}…`;
}

/**
 * Valida que el enlace provenga de un dominio legitimo de Google Books / Play
 * y fuerza HTTPS. Devuelve `null` si la URL es invalida o de otro origen.
 */
export function sanitizeBooksUrl(rawUrl: string | undefined): string | null {
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    const host = parsed.hostname.toLowerCase();
    const isGoogleBooksHost =
      host === "play.google.com" ||
      host === "books.google.com" ||
      /^books\.google\.[a-z.]+$/.test(host);

    if (!isGoogleBooksHost) {
      return null;
    }

    parsed.protocol = "https:";
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Calcula un puntaje entre 0 y 1.15 indicando que tan confiable es que el
 * volumen corresponda al libro de la pelicula buscada.
 */
export function scoreVolumeMatch(
  input: SearchBookInput,
  info: GoogleBooksVolumeInfo,
): number {
  if (!info.title) return 0;
  if (info.printType && info.printType.toUpperCase() !== "BOOK") return 0;

  const queryTitle = normalizeText(input.title);
  const candidateTitle = normalizeText(info.title);
  const candidateFull = normalizeText(
    info.subtitle ? `${info.title} ${info.subtitle}` : info.title,
  );

  if (!queryTitle || !candidateTitle) return 0;
  if (isDerivativeWork(candidateFull, queryTitle)) return 0;

  let score = 0;

  if (candidateTitle === queryTitle || candidateFull === queryTitle) {
    score = 1.0;
  } else {
    // Subtitulo en uno de los dos (ej. "Dune" vs "Dune: Book One")
    const baseCandidate = normalizeText(info.title.split(/[:(-]/)[0] ?? "");
    const baseQuery = normalizeText(input.title.split(/[:(-]/)[0] ?? "");

    if (baseCandidate && baseCandidate === queryTitle) {
      score = 0.9;
    } else if (baseQuery && candidateTitle === baseQuery) {
      score = 0.85;
    } else {
      const queryTokens = extractTokens(queryTitle);
      const candidateTokens = new Set(extractTokens(candidateFull));
      const matched = queryTokens.filter((token) => candidateTokens.has(token)).length;

      const recall = matched / queryTokens.length;
      const precision = matched / candidateTokens.size;

      if (recall === 1 && precision >= 0.5) {
        score = 0.8;
      } else if (recall >= 0.75 && precision >= 0.5) {
        score = 0.65;
      } else {
        score = recall * 0.5;
      }
    }
  }

  if (input.author && input.author.trim() !== "") {
    const queryAuthorTokens = extractTokens(normalizeText(input.author));
    const candidateAuthors = normalizeText((info.authors ?? []).join(" "));

    if (queryAuthorTokens.length > 0) {
      const authorMatches = queryAuthorTokens.every((token) =>
        candidateAuthors.includes(token),
      );
      if (authorMatches) {
        score += 0.15;
      } else if (info.authors && info.authors.length > 0) {
        score -= 0.25;
      }
    }
  }

  return Math.max(0, score);
}

/**
 * Selecciona el mejor libro entre los candidatos de Google Books o devuelve
 * `found: false` si ninguno supera el umbral de coincidencia confiable.
 */
export function pickBestBookMatch(
  input: SearchBookInput,
  items: GoogleBooksVolumeItem[] | undefined,
): BookSearchResult {
  if (!items || items.length === 0) {
    return createNotFoundResult();
  }

  let bestInfo: GoogleBooksVolumeInfo | null = null;
  let bestScore = 0;

  for (const item of items) {
    const info = item.volumeInfo;
    if (!info) continue;

    const score = scoreVolumeMatch(input, info);
    if (score > bestScore) {
      bestScore = score;
      bestInfo = info;
    }
  }

  if (!bestInfo || bestScore < MIN_MATCH_SCORE || !bestInfo.title) {
    return createNotFoundResult();
  }

  const authors = (bestInfo.authors ?? [])
    .map((author) => author.trim())
    .filter((author) => author.length > 0);

  const rating =
    typeof bestInfo.averageRating === "number" &&
    Number.isFinite(bestInfo.averageRating) &&
    bestInfo.averageRating >= 0 &&
    bestInfo.averageRating <= 5
      ? bestInfo.averageRating
      : null;

  const booksUrl = sanitizeBooksUrl(bestInfo.canonicalVolumeLink ?? bestInfo.infoLink);

  return {
    found: true,
    title: bestInfo.title.trim(),
    authors,
    description: sanitizeDescription(bestInfo.description),
    rating,
    books_url: booksUrl,
  };
}
