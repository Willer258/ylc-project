const attempts = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple in-memory rate limiter.
 * Returns true if the request should be BLOCKED.
 */
export function isRateLimited(
  key: string,
  maxAttempts: number = 20,
  windowMs: number = 60_000
): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  if (entry.count > maxAttempts) {
    return true;
  }

  return false;
}
