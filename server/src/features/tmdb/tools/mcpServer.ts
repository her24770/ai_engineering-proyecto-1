
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { createTmdbClient } from "../tmdbClient.ts";

type TmdbClient = ReturnType<typeof createTmdbClient>;

export function createTmdbMcpServer(client: TmdbClient): McpServer {
    const server = new McpServer({
        name: "tmdb-mcp",
        version: "1.0.0"
    });

    server.registerTool(
        "search_movie",
        {
            description: "Busca películas en TMDB por su título.",
            inputSchema: z.object({
                query: z.string().trim().min(1)
            })
        },
        async ({ query }) => {
            const result = await client.searchMovie(query);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result)
                    }
                ]
            };
        }
    );


    server.registerTool(
        "get_movie_details",
        {
            description: "Obtiene información detallada de una película de TMDB, incluyendo puntuación, géneros, póster y enlace de IMDb.",
            inputSchema: z.object({
                movie_id: z.number().int().positive()
            })
        },
        async ({ movie_id }) => {
            const result = await client.getMovieDetails(movie_id);

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result)
                    }
                ]
            };
        }
    );


    server.registerTool(
        "get_recommendations",
        {
            description:
                "Recomienda películas en TMDB a partir del ID de una película o de un género. Debe proporcionar únicamente uno de los dos.",
            inputSchema: z.object({
                movie_id: z.number().int().positive().optional(),
                genre: z.string().trim().min(1).optional()
            }).refine(
                ({ movie_id, genre }) =>
                    (movie_id !== undefined) !== (genre !== undefined),
                {
                    message: "Debe proporcionar movie_id o genre, pero no ambos"
                }
            )
        },
        async ({ movie_id, genre }) => {
            let result;

            if (movie_id !== undefined) {
                result = await client.getRecommendations({
                    movieId: movie_id
                });
            } else if (genre !== undefined) {
                result = await client.getRecommendations({
                    genre
                });
            } else {
                throw new Error("Debe proporcionar movie_id o genre");
            }

            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result)
                    }
                ]
            };
        }
    );

    return server;
}
