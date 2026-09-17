"use client";

import { motion } from "framer-motion";
import type { Participant } from "@/lib/types";

interface LeaderboardProps {
  participants: Participant[];
  limit?: number;
}

/**
 * `layout` on each row lets Framer Motion animate the reorder itself --
 * when a participant's score changes and their sorted position shifts, the
 * row glides to its new spot instead of popping there.
 */
export function Leaderboard({ participants, limit = 5 }: LeaderboardProps) {
  const ranked = [...participants].sort((a, b) => b.score - a.score).slice(0, limit);

  return (
    <div className="flex flex-col gap-2">
      {ranked.map((participant, index) => (
        <motion.div
          key={participant.id}
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="flex items-center gap-3 bg-white/95 border border-white/40 rounded-xl px-4 py-2.5"
        >
          <span className="font-display font-semibold text-brand-deep w-6">{index + 1}</span>
          <span className="text-lg" aria-hidden="true">
            {participant.avatar}
          </span>
          <span className="flex-1 font-semibold text-ink text-sm truncate">{participant.name}</span>
          {participant.streak >= 2 && (
            <span className="text-xs font-semibold bg-amber-100 text-amber-800 rounded-full px-2 py-0.5">
              x{participant.streak} streak
            </span>
          )}
          <span className="font-display font-semibold text-ink tabular-nums">
            {participant.score.toLocaleString()}
          </span>
        </motion.div>
      ))}
    </div>
  );
}
