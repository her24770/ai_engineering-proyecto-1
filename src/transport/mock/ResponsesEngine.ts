import {
  fallbackResponses,
  responseGroups,
  type ResponseGroup,
} from "./ResponseBank";

export function findResponseGroup(message: string): ResponseGroup | undefined {
  const normalizedMessage = message.toLowerCase();
  return responseGroups.find((group) =>
    group.keywords.some((keyword) => normalizedMessage.includes(keyword)),
  );
}

export function generateResponse(message: string): string {
  const group = findResponseGroup(message);
  const responses = group?.responses ?? fallbackResponses;
  return responses[Math.floor(Math.random() * responses.length)];
}

export function getRandomChunkSize(): number {
  return randomBetween(2, 6);
}

export function getRandomTypingDelay(): number {
  return randomBetween(15, 40);
}

export function getRandomDelay(): number {
  return randomBetween(400, 1200);
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}