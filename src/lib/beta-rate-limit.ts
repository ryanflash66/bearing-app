const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 120;

type RateLimitState = {
  count: number;
  windowStart: number;
};

const rateLimits = new Map<string, RateLimitState>();

export function checkBetaRateLimit(
  token: string,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
  windowMs: number = DEFAULT_WINDOW_MS
) {
  const now = Date.now();
  const existing = rateLimits.get(token);

  if (!existing || now - existing.windowStart > windowMs) {
    rateLimits.set(token, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  existing.count += 1;
  rateLimits.set(token, existing);
  return { allowed: true, remaining: maxRequests - existing.count };
}
