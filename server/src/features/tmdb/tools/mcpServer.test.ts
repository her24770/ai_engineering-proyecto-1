
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { createTmdbClient } from "../tmdbClient.ts";
import { createTmdbMcpServer } from "./mcpServer.ts";

const movie = {
    id: 157336,
    title: "Interstellar",
    overview: "Una aventura espacial",
    release_date: "2014-11-05",
    poster_path: "/poster.jpg"
};

const details = {
    ...movie,
    imdb_id: "tt0816692",
    vote_average: 8.5,
    vote_count: 30000,
    genres: [{ id: 878, name: "Ciencia ficción" }]
};

function jsonResponse(data: unknown): Response {
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
}

function readJson(
    content: readonly { type: string; text?: string }[]
): unknown {
    const first = content[0];

    if (first?.type !== "text" || typeof first.text !== "string") {
        throw new Error("La herramienta no devolvió contenido JSON");
    }

    const parsed: unknown = JSON.parse(first.text);
    return parsed;
}

async function createSession() {
    const mockFetch = vi.fn<typeof fetch>(async (input) => {
        const path = new URL(String(input)).pathname;

        switch (path) {
            case "/3/search/movie":
                return jsonResponse({ results: [movie] });

            case "/3/movie/157336":
                return jsonResponse(details);

            case "/3/movie/157336/recommendations":
                return jsonResponse({ results: [movie] });

            case "/3/genre/movie/list":
                return jsonResponse({
                    genres: [{ id: 878, name: "Ciencia ficción" }]
                });

            case "/3/discover/movie":
                return jsonResponse({ results: [movie] });

            default:
                return new Response(null, { status: 404 });
        }
    });

    const tmdbClient = createTmdbClient("fake-api-key", mockFetch);
    const server = createTmdbMcpServer(tmdbClient);
    const client = new Client({
        name: "tmdb-test-client",
        version: "1.0.0"
    });

    const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();

    await server.connect(serverTransport);
    await client.connect(clientTransport);

    return { client, server, mockFetch };
}

describe("Servidor MCP TMDB", () => {
    let session: Awaited<ReturnType<typeof createSession>>;

    beforeEach(async () => {
        session = await createSession();
    });

    afterEach(async () => {
        await session.client.close();
        await session.server.close();
    });

    it("publica las tres herramientas", async () => {
        const result = await session.client.listTools();

        expect(result.tools.map((tool) => tool.name).sort()).toEqual([
            "get_movie_details",
            "get_recommendations",
            "search_movie"
        ]);
    });

    it("ejecuta search_movie", async () => {
        const result = await session.client.callTool({
            name: "search_movie",
            arguments: { query: "Interstellar" }
        });

        expect(result.isError).not.toBe(true);
        expect(readJson(result.content)).toMatchObject({
            results: [{ id: 157336, title: "Interstellar" }]
        });
        expect(session.mockFetch).toHaveBeenCalledTimes(1);
    });

    it("ejecuta get_movie_details", async () => {
        const result = await session.client.callTool({
            name: "get_movie_details",
            arguments: { movie_id: 157336 }
        });

        expect(result.isError).not.toBe(true);
        expect(readJson(result.content)).toMatchObject({
            id: 157336,
            poster_url: "https://image.tmdb.org/t/p/w500/poster.jpg",
            imdb_url: "https://www.imdb.com/title/tt0816692/"
        });
    });

    it("recomienda películas por ID", async () => {
        const result = await session.client.callTool({
            name: "get_recommendations",
            arguments: { movie_id: 157336 }
        });

        expect(result.isError).not.toBe(true);
        expect(readJson(result.content)).toMatchObject({
            movies: [{ id: 157336, title: "Interstellar" }]
        });
    });

    it("recomienda películas por género", async () => {
        const result = await session.client.callTool({
            name: "get_recommendations",
            arguments: { genre: "Ciencia ficción" }
        });

        expect(result.isError).not.toBe(true);
        expect(readJson(result.content)).toMatchObject({
            movies: [{ id: 157336 }]
        });

        expect(session.mockFetch).toHaveBeenCalledTimes(2);
    });

    it("rechaza ambos filtros simultáneamente", async () => {
        const result = await session.client.callTool({
            name: "get_recommendations",
            arguments: {
                movie_id: 157336,
                genre: "Drama"
            }
        });

        expect(result.isError).toBe(true);
        expect(session.mockFetch).not.toHaveBeenCalled();
    });
});
