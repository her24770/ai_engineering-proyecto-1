import {
    responseGroups,
    fallbackResponses,
} from "./ResponseBank";

import type { ResponseGroup } from "./ResponseBank";

export function findResponseGroup(message: string) {
    const normalizedMessage = message.toLowerCase();

    return responseGroups.find((group: ResponseGroup) =>
        group.keywords.some((keyword: string) =>
            normalizedMessage.includes(keyword.toLowerCase())
        )
    );
}

function getRandomResponse(responses: string[]): string {
    const randomIndex = Math.floor(Math.random() * responses.length);

    return responses[randomIndex];
}

export function generateResponse(message: string): string {
    const group = findResponseGroup(message);

    if (!group) {
        return getRandomResponse(fallbackResponses);
    }

    return getRandomResponse(group.responses);
}

export function getRandomChunkSize(): number {
    const minChunkSize = 2;
    const maxChunkSize = 6;

    return Math.floor(
        Math.random() * (maxChunkSize - minChunkSize + 1)
    ) + minChunkSize;
}

export function getRandomTypingDelay(): number {
    const minTypingDelay = 15;
    const maxTypingDelay = 40;

    return Math.floor(
        Math.random() * (maxTypingDelay - minTypingDelay + 1)
    ) + minTypingDelay;
}

export function getRandomDelay(): number {
    const minDelay = 400;
    const maxDelay = 1200;

    return Math.floor(
        Math.random() * (maxDelay - minDelay + 1)
    ) + minDelay;
}