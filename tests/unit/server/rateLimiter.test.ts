import { RateLimiter } from "../../../server/src/rateLimiter.ts";

describe("RateLimiter", () => {
  it("bloquea al superar el maximo y se reinicia al terminar la ventana", () => {
    let time = 0;
    const limiter = new RateLimiter(2, 1000, () => time);
    expect(limiter.allow("ip")).toBe(true);
    expect(limiter.allow("ip")).toBe(true);
    expect(limiter.allow("ip")).toBe(false);
    expect(limiter.allow("otra")).toBe(true);
    time = 1001;
    expect(limiter.allow("ip")).toBe(true);
  });
});
