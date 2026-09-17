"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useParticipantSession } from "@/hooks/useParticipantSession";
import { OptionButton } from "@/components/quiz/OptionButton";
import { QuestionFeedbackAnimation } from "@/components/quiz/QuestionFeedbackAnimation";
import { Podium } from "@/components/quiz/Podium";
import { Leaderboard } from "@/components/quiz/Leaderboard";
import { TactileButton, Card } from "@/components/ui/primitives";
import { computePoints } from "@/lib/scoring";
import { Trophy, CheckCircle2, XCircle, Flame, Award, ArrowRight, RotateCcw } from "lucide-react";
import type { QuizOption } from "@/lib/types";

interface QuestionResult {
  questionId: string;
  questionTitle: string;
  selectedOption?: QuizOption;
  correctOption?: QuizOption;
  isCorrect: boolean;
  pointsAwarded: number;
  responseTimeMs: number;
  timedOut: boolean;
}

export default function PlayPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const {
    participant,
    session,
    quiz,
    myRank,
    totalParticipants,
    submitAnswer,
    leaveParticipant,
  } = useParticipantSession();

  // Self-paced question state
  const [localQuestionIndex, setLocalQuestionIndex] = useState(0);
  const [questionStartedAt, setQuestionStartedAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(20);
  const [locking, setLocking] = useState(false);
  const [feedback, setFeedback] = useState<QuestionResult | null>(null);
  const [resultsHistory, setResultsHistory] = useState<QuestionResult[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Redirect if not joined
  useEffect(() => {
    if (!participant) {
      router.replace("/join");
    }
  }, [participant, router]);

  const questions = quiz?.questions || [];
  const currentQuestion = questions[localQuestionIndex];
  const timeLimit = currentQuestion?.timeLimitSec ?? 20;

  // Initialize timer whenever advancing to a new question
  useEffect(() => {
    if (!isCompleted && currentQuestion) {
      setSecondsLeft(timeLimit);
      setQuestionStartedAt(Date.now());
      setLocking(false);
      setFeedback(null);
    }
  }, [localQuestionIndex, isCompleted, currentQuestion, timeLimit]);

  // Handle timeout submission
  const handleTimeout = useCallback(() => {
    if (locking || feedback || isCompleted || !currentQuestion) return;
    setLocking(true);

    const correctOpt = currentQuestion.options.find((o) => o.correct);
    const result: QuestionResult = {
      questionId: currentQuestion.id,
      questionTitle: currentQuestion.title,
      correctOption: correctOpt,
      isCorrect: false,
      pointsAwarded: 0,
      responseTimeMs: timeLimit * 1000,
      timedOut: true,
    };

    setCurrentStreak(0);
    setResultsHistory((prev) => [...prev, result]);
    setFeedback(result);
  }, [locking, feedback, isCompleted, currentQuestion, timeLimit]);

  // Question countdown tick
  useEffect(() => {
    if (feedback || isCompleted || !questionStartedAt || locking) return;

    const interval = setInterval(() => {
      const elapsedSec = Math.floor((Date.now() - questionStartedAt) / 1000);
      const remaining = Math.max(0, timeLimit - elapsedSec);
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        handleTimeout();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [questionStartedAt, timeLimit, feedback, isCompleted, locking, handleTimeout]);

  // Handle participant option selection
  function handleOptionSelect(option: QuizOption) {
    if (locking || feedback || isCompleted || !currentQuestion) return;
    setLocking(true);

    const responseTimeMs = questionStartedAt ? Date.now() - questionStartedAt : 1500;
    const isCorrect = option.correct;
    const points = isCorrect ? computePoints(timeLimit, responseTimeMs, true) : 0;
    const nextStreak = isCorrect ? currentStreak + 1 : 0;
    setCurrentStreak(nextStreak);

    // Save answer to Supabase backend
    submitAnswer(option.id, responseTimeMs, currentQuestion.id);

    try {
      if (isCorrect) {
        navigator.vibrate?.([40, 60, 40]);
      } else {
        navigator.vibrate?.(100);
      }
    } catch {
      // vibration optional
    }

    const correctOpt = currentQuestion.options.find((o) => o.correct);
    const result: QuestionResult = {
      questionId: currentQuestion.id,
      questionTitle: currentQuestion.title,
      selectedOption: option,
      correctOption: correctOpt,
      isCorrect,
      pointsAwarded: points,
      responseTimeMs,
      timedOut: false,
    };

    setResultsHistory((prev) => [...prev, result]);
    setFeedback(result);
  }

  // Advance to next question or final results
  function handleAdvance() {
    if (localQuestionIndex + 1 < questions.length) {
      setLocalQuestionIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  }

  if (!participant || !session) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-canvas">
        <p className="text-ink-soft text-sm font-medium">Connecting to your room&hellip;</p>
      </main>
    );
  }

  // Total points and accuracy
  const totalScore = resultsHistory.reduce((sum, r) => sum + r.pointsAwarded, 0);
  const correctCount = resultsHistory.filter((r) => r.isCorrect).length;
  const accuracyPct = resultsHistory.length
    ? Math.round((correctCount / resultsHistory.length) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md bg-white border border-brand-tint rounded-3xl shadow-xl p-5 min-h-[580px] flex flex-col justify-between overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-brand-tint/60">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              {participant.avatar}
            </span>
            <div className="flex flex-col">
              <span className="font-display font-bold text-sm text-ink">{participant.name}</span>
              <span className="text-[11px] font-semibold text-brand-deep tabular-nums">
                {totalScore.toLocaleString()} pts
              </span>
            </div>
          </div>

          {!isCompleted && !feedback && (
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  "font-display font-extrabold text-sm px-3 py-1 rounded-full border tabular-nums transition-colors",
                  secondsLeft <= 5
                    ? "bg-rose-100 text-rose-700 border-rose-300 animate-pulse"
                    : "bg-brand-tint text-brand-deep border-brand-dark/20"
                )}
              >
                ⏱ {secondsLeft}s
              </span>
            </div>
          )}
        </div>

        {/* Dynamic Screen Content */}
        <div className="flex-1 flex flex-col my-4">
          <AnimatePresence mode="wait">
            {/* 1. QUESTION FEEDBACK ANIMATION SCREEN */}
            {feedback ? (
              <QuestionFeedbackAnimation
                key={`feedback-${localQuestionIndex}`}
                isCorrect={feedback.isCorrect}
                pointsAwarded={feedback.pointsAwarded}
                streak={currentStreak}
                selectedOption={feedback.selectedOption}
                correctOption={feedback.correctOption}
                timedOut={feedback.timedOut}
                currentQuestionIndex={localQuestionIndex}
                totalQuestions={questions.length}
                onAdvance={handleAdvance}
                autoAdvanceSeconds={3}
              />
            ) : !isCompleted && currentQuestion ? (
              /* 2. ACTIVE QUESTION SCREEN */
              <motion.div
                key={`question-${localQuestionIndex}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col justify-between gap-4"
              >
                {/* Question Info Header */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-ink-soft">
                    <span>
                      Question {localQuestionIndex + 1} of {questions.length}
                    </span>
                    <span className="capitalize">{quiz?.title}</span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-ink leading-snug">
                    {currentQuestion.title}
                  </h2>
                </div>

                {/* 4 Option Buttons Grid */}
                <div className="grid grid-cols-2 gap-3 flex-1 my-auto">
                  {currentQuestion.options.map((option) => (
                    <OptionButton
                      key={option.id}
                      color={option.color}
                      label={option.text}
                      size="sm"
                      disabled={locking}
                      onClick={() => handleOptionSelect(option)}
                    />
                  ))}
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${((localQuestionIndex + 1) / questions.length) * 100}%`,
                    }}
                  />
                </div>
              </motion.div>
            ) : isCompleted ? (
              /* 3. FINAL RESULTS & LEADERBOARD SCREEN */
              <motion.div
                key="final-results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="flex-1 flex flex-col gap-5 py-2"
              >
                {/* Podium Celebratory View */}
                <div className="bg-gradient-to-br from-brand to-brand-deep rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                      🏆 Final Standings
                    </span>
                    <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
                      {totalParticipants} Players
                    </span>
                  </div>
                  <Podium participants={session.participants} />
                </div>

                {/* Participant's Personal Score Card */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3">
                    <div className="text-xs text-emerald-800 font-semibold mb-0.5">Your Rank</div>
                    <div className="font-display text-2xl font-extrabold text-emerald-700">
                      #{myRank ?? 1}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3">
                    <div className="text-xs text-blue-800 font-semibold mb-0.5">Total Points</div>
                    <div className="font-display text-2xl font-extrabold text-blue-700 tabular-nums">
                      {totalScore.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
                    <div className="text-xs text-amber-800 font-semibold mb-0.5">Accuracy</div>
                    <div className="font-display text-2xl font-extrabold text-amber-700">
                      {accuracyPct}%
                    </div>
                  </div>
                </div>

                {/* Full Live Leaderboard */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-ink uppercase tracking-wide">
                      Live Room Leaderboard
                    </span>
                  </div>
                  <div className="max-h-52 overflow-y-auto pr-1 flex flex-col gap-1.5">
                    <Leaderboard participants={session.participants} limit={10} />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 mt-auto">
                  <TactileButton
                    variant="white"
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold"
                    onClick={() => {
                      leaveParticipant();
                      router.push("/join");
                    }}
                  >
                    <RotateCcw size={14} /> Play Again
                  </TactileButton>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
