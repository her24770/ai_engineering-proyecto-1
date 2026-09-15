import { responseGroups, ResponseGroup } from "./ResponseBank";

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
        return "No tengo una respuesta específica para eso todavía.";
    }

    return getRandomResponse(group.responses);
}