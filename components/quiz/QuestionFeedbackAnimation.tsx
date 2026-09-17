"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Flame, Zap, ArrowRight, Clock } from "lucide-react";
import type { QuizOption } from "@/lib/types";

interface QuestionFeedbackAnimationProps {
  isCorrect: boolean;
  pointsAwarded: number;
  streak: number;
  selectedOption?: QuizOption;
  correctOption?: QuizOption;
  timedOut?: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
  onAdvance: () => void;
  autoAdvanceSeconds?: number;
}

export function QuestionFeedbackAnimation({
  isCorrect,
  pointsAwarded,
  streak,
  selectedOption,
  correctOption,
  timedOut = false,
  currentQuestionIndex,
  totalQuestions,
  onAdvance,
  autoAdvanceSeconds = 3,
}: QuestionFeedbackAnimationProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(autoAdvanceSeconds);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onAdvance();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onAdvance, autoAdvanceSeconds]);

  const progressPercent = ((autoAdvanceSeconds - secondsRemaining) / autoAdvanceSeconds) * 100;
  const isLastQuestion = currentQuestionIndex + 1 >= totalQuestions;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="flex-1 flex flex-col justify-between rounded-2xl overflow-hidden shadow-lg p-6 relative text-white"
      style={{
        background: isCorrect
          ? "linear-gradient(135deg, #10B981 0%, #047857 100%)"
          : timedOut
          ? "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
          : "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)",
      }}
    >
      {/* Background glowing particles animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isCorrect && (
          <>
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.5 }}
              className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-white/30 rounded-full blur-xl"
            />
          </>
        )}
      </div>

      {/* Top Header Badge */}
      <div className="flex items-center justify-between z-10">
        <span className="text-xs font-semibold uppercase tracking-wider bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </span>
        {streak >= 2 && isCorrect && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="flex items-center gap-1 text-xs font-bold bg-amber-400 text-amber-950 px-2.5 py-1 rounded-full shadow-md"
          >
            <Flame size={14} className="fill-amber-950 text-amber-950 animate-bounce" />
            <span>{streak} Streak!</span>
          </motion.div>
        )}
      </div>

      {/* Center Animated Icon & Result Status */}
      <div className="flex flex-col items-center justify-center my-auto text-center gap-3 z-10">
        {/* Animated Icon Circle */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 20 }}
          className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-xl"
        >
          {isCorrect ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring" }}
            >
              <Check size={44} strokeWidth={3.5} className="text-white drop-shadow-md" />
            </motion.div>
          ) : timedOut ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.15, type: "spring" }}
            >
              <Clock size={40} strokeWidth={3} className="text-white drop-shadow-md" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: [0, -10, 10, -5, 5, 0] }}
              transition={{ delay: 0.15, duration: 0.5 }}
            >
              <X size={44} strokeWidth={3.5} className="text-white drop-shadow-md" />
            </motion.div>
          )}
        </motion.div>

        {/* Text Title */}
        <motion.h2
          initial={{ y: 15, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-display text-2xl font-extrabold tracking-tight drop-shadow-sm"
        >
          {isCorrect ? "Correct!" : timedOut ? "Time's Up!" : "Incorrect"}
        </motion.h2>

        {/* Animated Points Counter */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 300 }}
          className="flex items-center gap-1.5 font-display text-4xl font-extrabold tabular-nums bg-white/20 border border-white/30 px-5 py-2 rounded-2xl backdrop-blur-md shadow-md"
        >
          <Zap size={24} className="fill-white text-white" />
          <span>+{pointsAwarded} pts</span>
        </motion.div>

        {/* Correct Answer Reveal (If Incorrect) */}
        {!isCorrect && correctOption && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-2 bg-black/25 backdrop-blur-md rounded-xl p-3 text-left w-full max-w-xs border border-white/20"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80 mb-1">
              Correct Answer:
            </p>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block flex-none" />
              <span className="truncate">{correctOption.text}</span>
            </p>
          </motion.div>
        )}
      </div>

      {/* Bottom Progress & Auto-Advance */}
      <div className="flex flex-col gap-3 z-10 mt-auto">
        <div className="flex items-center justify-between text-xs text-white/90 font-medium">
          <span>{isLastQuestion ? "Finishing quiz in..." : "Next question in..."}</span>
          <span className="font-bold tabular-nums">{secondsRemaining}s</span>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full bg-white/25 h-2 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: autoAdvanceSeconds, ease: "linear" }}
            className="bg-white h-full rounded-full shadow"
          />
        </div>

        {/* Fast Advance Button */}
        <button
          type="button"
          onClick={onAdvance}
          className="w-full mt-1 bg-white text-ink font-bold text-sm py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
        >
          <span>{isLastQuestion ? "View Final Results" : "Next Question"}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );
}
