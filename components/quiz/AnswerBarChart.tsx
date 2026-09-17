"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import type { QuizOption } from "@/lib/types";

const BAR_COLOR: Record<QuizOption["color"], string> = {
  red: "#EF4444",
  blue: "#3B82F6",
  yellow: "#F59E0B",
  green: "#10B981",
};

interface AnswerBarChartProps {
  options: QuizOption[];
  votesByOption: Record<string, number>;
}

export function AnswerBarChart({ options, votesByOption }: AnswerBarChartProps) {
  const total = Object.values(votesByOption).reduce((sum, n) => sum + n, 0) || 1;

  return (
    <div className="flex flex-col gap-2.5">
      {options.map((option) => {
        const count = votesByOption[option.id] ?? 0;
        const pct = Math.round((count / total) * 100);
        return (
          <div key={option.id} className="flex items-center gap-3">
            <div
              className={clsx(
                "w-36 flex-none text-sm font-semibold flex items-center gap-1.5",
                option.correct ? "text-brand-deep" : "text-ink"
              )}
            >
              {option.correct && <Check size={14} className="flex-none" aria-hidden="true" />}
              <span className="truncate">{option.text}</span>
            </div>
            <div className="flex-1 h-7 rounded-lg bg-canvas border border-brand-tint overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={clsx(
                  "h-full flex items-center justify-end pr-2",
                  option.correct && "ring-2 ring-option-green-border ring-inset"
                )}
                style={{ backgroundColor: BAR_COLOR[option.color] }}
              >
                <span className="text-white text-xs font-semibold">{pct}%</span>
              </motion.div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
