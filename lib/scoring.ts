/**
 * Kahoot-style speed scoring: correct answers earn between MIN_POINTS and
 * MAX_POINTS depending on how quickly they were submitted relative to the
 * question's time limit. Wrong answers earn zero.
 */
const MAX_POINTS = 1000;
const MIN_POINTS = 300;

export function computePoints(
  timeLimitSec: number,
  responseTimeMs: number,
  correct: boolean
): number {
  if (!correct) return 0;
  const timeLimitMs = timeLimitSec * 1000;
  const speedFactor = Math.max(0, Math.min(1, 1 - responseTimeMs / timeLimitMs));
  return Math.round(MIN_POINTS + (MAX_POINTS - MIN_POINTS) * speedFactor);
}

export function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
