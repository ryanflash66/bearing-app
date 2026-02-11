export const COVER_POLL_MIN_SECONDS = 2;
export const COVER_POLL_MAX_SECONDS = 10;
export const COVER_POLL_MAX_ATTEMPTS = 60;

export function getCoverPollDelaySeconds(attempt: number): number {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  const rawDelay = COVER_POLL_MIN_SECONDS * Math.pow(2, safeAttempt - 1);
  return Math.min(COVER_POLL_MAX_SECONDS, rawDelay);
}

