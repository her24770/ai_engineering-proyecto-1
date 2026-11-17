/* global AbortController, clearTimeout, fetch, setTimeout */

const EVENT_TYPES = new Set(["delta", "poster", "open-url", "done", "error"]);

export function parseSse(body) {
  const events = [];
  for (const block of body.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data) continue;

    let event;
    try {
      event = JSON.parse(data);
    } catch {
      throw new Error(`Evento SSE con JSON inválido: ${data.slice(0, 120)}`);
    }
    if (!event || typeof event !== "object" || !EVENT_TYPES.has(event.type)) {
      throw new Error(`Evento SSE desconocido: ${data.slice(0, 120)}`);
    }
    events.push(event);
  }
  return events;
}

export async function requestAgent(endpoint, messages, options = {}) {
  const timeoutMs = options.timeoutMs ?? 60_000;
  const doFetch = options.fetch ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await doFetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });
    const body = await response.text();
    if (!response.ok) {
      return {
        status: response.status,
        text: "",
        events: [],
        error: `HTTP ${response.status}: ${body.slice(0, 300)}`,
      };
    }

    const events = parseSse(body);
    const text = events
      .filter((event) => event.type === "delta" && typeof event.text === "string")
      .map((event) => event.text)
      .join("");
    const agentError = events.find(
      (event) => event.type === "error" && typeof event.error === "string",
    );
    const hasDone = events.some((event) => event.type === "done");

    return {
      status: response.status,
      text,
      events,
      error:
        agentError?.error ?? (hasDone ? undefined : "La respuesta SSE no incluyó done"),
    };
  } catch (error) {
    return {
      status: 0,
      text: "",
      events: [],
      error:
        error instanceof Error && error.name === "AbortError"
          ? `Tiempo de espera agotado (${timeoutMs} ms)`
          : error instanceof Error
            ? error.message
            : "Error de red desconocido",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function isRateLimitResponse(response) {
  return (
    typeof response.error === "string" &&
    /muchas solicitudes|rate.?limit|429/i.test(response.error)
  );
}

export async function requestAgentWithRetry(endpoint, messages, options = {}) {
  const retries = options.retries ?? 1;
  const retryDelayMs = options.retryDelayMs ?? 60_000;
  const request = options.request ?? requestAgent;
  const sleep =
    options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));

  let response;
  let attempts = 0;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    attempts = attempt + 1;
    response = await request(endpoint, messages, options);
    if (!isRateLimitResponse(response) || attempt === retries) break;
    await sleep(retryDelayMs);
  }

  return { ...response, attempts };
}
