"use client";

import { useEffect, useState } from "react";

/**
 * Derives seconds-remaining from a shared `questionStartedAt` timestamp
 * rather than running an independent per-tab timer. Because every client
 * (host + all participants) reads the same timestamp off the session, the
 * countdown stays in sync across devices with zero coordination -- and this
 * keeps working unchanged once `questionStartedAt` comes from a Supabase row.
 */
export function useCountdown(questionStartedAt: number | null, timeLimitSec: number) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, []);

  if (!questionStartedAt) {
    return { secondsLeft: timeLimitSec, fraction: 1 };
  }

  const totalMs = timeLimitSec * 1000;
  const elapsedMs = now - questionStartedAt;
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const secondsLeft = Math.ceil(remainingMs / 1000);
  const fraction = Math.max(0, Math.min(1, remainingMs / totalMs));

  return { secondsLeft, fraction };
}
