"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useParticipantSession } from "@/hooks/useParticipantSession";
import { useCountdown } from "@/hooks/useCountdown";
import { OptionButton } from "@/components/quiz/OptionButton";
import { QuestionFeedbackAnimation } from "@/components/quiz/QuestionFeedbackAnimation";
import { Podium } from "@/components/quiz/Podium";
import { Leaderboard } from "@/components/quiz/Leaderboard";
import { TactileButton, Card } from "@/components/ui/primitives";
import { Trophy, CheckCircle2, XCircle, Flame, Users, Sparkles, RotateCcw } from "lucide-react";

export default function PlayPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const {
    participant,
    session,
    quiz,
    currentQuestion,
    myAnswer,
    myRank,
    totalParticipants,
    submitAnswer,
    leaveParticipant,
  } = useParticipantSession();

  const [locking, setLocking] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Redirect to join if not connected
  useEffect(() => {
    if (!participant) {
      router.replace("/join");
    }
  }, [participant, router]);

  useEffect(() => {
    if (session && params.sessionId !== session.id) {
      router.replace(`/play/${session.id}`);
    }
  }, [session, params.sessionId, router]);

  // Reset local state on question change
  useEffect(() => {
    setLocking(false);
    setSelectedOptionId(null);
  }, [session?.currentQuestionIndex, session?.phase]);

  const timeLimit = currentQuestion?.timeLimitSec ?? 20;
  const { secondsLeft } = useCountdown(session?.questionStartedAt ?? null, timeLimit);

  if (!participant || !session) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
        <p className="text-ink-soft text-sm font-medium animate-pulse">Connecting to live room&hellip;</p>
      </main>
    );
  }

  function handleOptionSelect(optionId: string) {
    if (!session?.questionStartedAt || locking || myAnswer || session.phase !== "question") return;
    setLocking(true);
    setSelectedOptionId(optionId);

    const responseTimeMs = Math.max(100, Date.now() - session.questionStartedAt);
    if (currentQuestion) {
      submitAnswer(optionId, responseTimeMs, currentQuestion.id);
    }

    try {
      navigator.vibrate?.(40);
    } catch {
      // vibration optional
    }
  }

  const answered = Boolean(myAnswer) || locking;
  const myAnswers = session.answers.filter((a) => a.participantId === participant.id);
  const totalScore = myAnswers.reduce((sum, a) => sum + a.pointsAwarded, 0);
  const correctCount = myAnswers.filter((a) => a.correct).length;
  const accuracyPct = myAnswers.length
    ? Math.round((correctCount / myAnswers.length) * 100)
    : 0;

  const totalQuestions = quiz?.questions.length ?? 1;
  const correctOption = currentQuestion?.options.find((o) => o.correct);
  const selectedOption = currentQuestion?.options.find(
    (o) => o.id === (myAnswer?.optionId || selectedOptionId)
  );
  const isCorrect = myAnswer?.correct ?? false;
  const pointsAwarded = myAnswer?.pointsAwarded ?? 0;
  const timedOut = !myAnswer && session.phase === "results";

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md bg-white border border-brand-tint rounded-3xl shadow-xl p-5 min-h-[560px] flex flex-col justify-between overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-brand-tint/60">
          <div className="flex items-center gap-2">
            <span className="text-2xl" aria-hidden="true">
              {participant.avatar}
            </span>
            <div className="flex flex-col">
              <span className="font-display font-bold text-sm text-ink">{participant.name}</span>
              <span className="text-[11px] font-semibold text-brand-deep tabular-nums">
                {totalScore.toLocaleString()} pts &middot; Rank #{myRank ?? 1}
              </span>
            </div>
          </div>

          {session.phase === "question" && (
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

        {/* Dynamic Synchronized Screen Content */}
        <div className="flex-1 flex flex-col my-4">
          <AnimatePresence mode="wait">
            {/* 1. LOBBY SCREEN (WAITING FOR ADMIN TO START) */}
            {session.phase === "lobby" && (
              <motion.div
                key="participant-lobby"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex-1 rounded-2xl bg-gradient-to-br from-brand-tint to-emerald-50 border border-brand-tint flex flex-col items-center justify-center gap-4 text-center p-6 shadow-sm"
              >
                <div className="w-20 h-20 rounded-full bg-brand text-white flex items-center justify-center text-3xl shadow-lg animate-bounce">
                  {participant.avatar}
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="font-display font-bold text-xl text-ink">You're in the room!</h2>
                  <p className="text-xs text-ink-soft">
                    Room PIN: <strong className="text-brand-deep">{session.pin}</strong>
                  </p>
                </div>
                <div className="bg-white/80 backdrop-blur-sm border border-brand-tint/80 rounded-xl px-4 py-2.5 text-xs text-ink font-semibold flex items-center gap-2 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Waiting for host to start the game...</span>
                </div>
                <span className="text-[11px] text-ink-soft">
                  {totalParticipants} player{totalParticipants > 1 ? "s" : ""} connected
                </span>
              </motion.div>
            )}

            {/* 2. QUESTION SCREEN */}
            {session.phase === "question" && currentQuestion && (
              <motion.div
                key={`participant-question-${session.currentQuestionIndex}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col justify-between gap-4"
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-ink-soft">
                    <span>
                      Question {session.currentQuestionIndex + 1} of {totalQuestions}
                    </span>
                    <span className="capitalize">{quiz?.title}</span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-ink leading-snug">
                    {currentQuestion.title}
                  </h2>
                </div>

                {/* 4 Options Grid */}
                <div className="grid grid-cols-2 gap-3 flex-1 my-auto">
                  {currentQuestion.options.map((option) => (
                    <OptionButton
                      key={option.id}
                      color={option.color}
                      label={option.text}
                      size="sm"
                      disabled={answered}
                      dimmed={answered && (myAnswer?.optionId || selectedOptionId) !== option.id}
                      onClick={() => handleOptionSelect(option.id)}
                    />
                  ))}
                </div>

                {/* Answer Lock-in Notification */}
                {answered ? (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-center text-xs font-bold text-emerald-800 flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Answer locked in! Revealing results when timer ends...</span>
                  </motion.div>
                ) : (
                  <p className="text-xs text-ink-soft text-center font-medium">
                    Tap an option to lock in your answer!
                  </p>
                )}
              </motion.div>
            )}

            {/* 3. RESULTS SCREEN (SAME MOMENT GRAPHICAL ANIMATION) */}
            {session.phase === "results" && currentQuestion && (
              <QuestionFeedbackAnimation
                key={`participant-results-${session.currentQuestionIndex}`}
                isCorrect={isCorrect}
                pointsAwarded={pointsAwarded}
                streak={participant.streak}
                selectedOption={selectedOption}
                correctOption={correctOption}
                timedOut={timedOut}
                currentQuestionIndex={session.currentQuestionIndex}
                totalQuestions={totalQuestions}
                onAdvance={() => {}}
                autoAdvanceSeconds={5}
              />
            )}

            {/* 4. LEADERBOARD SCREEN */}
            {session.phase === "leaderboard" && (
              <motion.div
                key={`participant-leaderboard-${session.currentQuestionIndex}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex-1 flex flex-col gap-4 py-2"
              >
                <div className="bg-gradient-to-br from-brand to-brand-deep rounded-2xl p-4 text-white text-center shadow-md flex flex-col items-center gap-1">
                  <Trophy size={28} className="text-amber-300 animate-bounce mb-1" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/80">
                    Your Current Standings
                  </span>
                  <div className="font-display text-3xl font-extrabold text-white">
                    Rank #{myRank ?? 1}
                  </div>
                  <span className="text-xs text-emerald-200 font-bold tabular-nums">
                    {totalScore.toLocaleString()} pts &middot; {participant.streak} in a row 🔥
                  </span>
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink px-1">
                    Live Leaderboard
                  </span>
                  <div className="max-h-56 overflow-y-auto pr-1 flex flex-col gap-1.5">
                    <Leaderboard participants={session.participants} limit={10} />
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. PODIUM / FINAL RESULTS (SAME MOMENT) */}
            {session.phase === "podium" && (
              <motion.div
                key="participant-podium"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex flex-col gap-4 py-2"
              >
                {/* Celebratory Podium */}
                <div className="bg-gradient-to-br from-brand to-brand-deep rounded-2xl p-4 text-white shadow-md relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-white/80 flex items-center gap-1">
                      <Sparkles size={13} className="text-amber-300" /> Final Standings
                    </span>
                    <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-bold">
                      {totalParticipants} Players
                    </span>
                  </div>
                  <Podium participants={session.participants} />
                </div>

                {/* Scorecard */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5">
                    <div className="text-[11px] text-emerald-800 font-semibold mb-0.5">Your Place</div>
                    <div className="font-display text-2xl font-extrabold text-emerald-700">
                      #{myRank ?? 1}
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-2.5">
                    <div className="text-[11px] text-blue-800 font-semibold mb-0.5">Total Score</div>
                    <div className="font-display text-xl font-extrabold text-blue-700 tabular-nums">
                      {totalScore.toLocaleString()}
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5">
                    <div className="text-[11px] text-amber-800 font-semibold mb-0.5">Accuracy</div>
                    <div className="font-display text-xl font-extrabold text-amber-700">
                      {accuracyPct}%
                    </div>
                  </div>
                </div>

                {/* Full Live Leaderboard */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-ink uppercase tracking-wide px-1">
                    Room Leaderboard
                  </span>
                  <div className="max-h-40 overflow-y-auto pr-1 flex flex-col gap-1.5">
                    <Leaderboard participants={session.participants} limit={10} />
                  </div>
                </div>

                <div className="pt-2 mt-auto">
                  <TactileButton
                    variant="white"
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-bold"
                    onClick={() => {
                      leaveParticipant();
                      router.push("/join");
                    }}
                  >
                    <RotateCcw size={14} /> Back to Join Lobby
                  </TactileButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
