"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useHostSession } from "@/hooks/useHostSession";
import { useCountdown } from "@/hooks/useCountdown";
import { CountdownRing } from "@/components/quiz/CountdownRing";
import { JoinQRCode } from "@/components/quiz/QRCode";
import { ParticipantTag } from "@/components/quiz/ParticipantTag";
import { OptionButton } from "@/components/quiz/OptionButton";
import { AnswerBarChart } from "@/components/quiz/AnswerBarChart";
import { Leaderboard } from "@/components/quiz/Leaderboard";
import { Podium } from "@/components/quiz/Podium";
import { TactileButton, Card } from "@/components/ui/primitives";
import { Users, CheckCircle2, ArrowRight, Play, Trophy, Sparkles } from "lucide-react";

export default function HostStagePage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const {
    session,
    quiz,
    currentQuestion,
    totalQuestions,
    answeredCount,
    startGame,
    showResults,
    showLeaderboard,
    nextQuestion,
    endGame,
  } = useHostSession(params.sessionId);

  const { secondsLeft, fraction } = useCountdown(
    session?.questionStartedAt ?? null,
    currentQuestion?.timeLimitSec ?? 20
  );

  // Auto-advance from question to results when timer runs out or all participants have answered
  useEffect(() => {
    if (session?.phase === "question" && session.participants.length > 0) {
      if (answeredCount >= session.participants.length && answeredCount > 0) {
        const timer = setTimeout(() => {
          showResults();
        }, 600);
        return () => clearTimeout(timer);
      }
      if (secondsLeft <= 0) {
        showResults();
      }
    }
  }, [session?.phase, answeredCount, session?.participants.length, secondsLeft, showResults]);

  if (!session || !quiz) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-brand to-brand-deep">
        <p className="font-display text-lg font-semibold animate-pulse">Connecting to live room&hellip;</p>
      </main>
    );
  }

  const votesByOption = currentQuestion
    ? currentQuestion.options.reduce<Record<string, number>>((acc, option) => {
        acc[option.id] = session.answers.filter(
          (a) => a.questionId === currentQuestion.id && a.optionId === option.id
        ).length;
        return acc;
      }, {})
    : {};

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?pin=${session.pin}`
      : `/join?pin=${session.pin}`;

  const isLastQuestion = (session.currentQuestionIndex ?? 0) + 1 >= totalQuestions;

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand via-brand-dark to-brand-deep flex items-center justify-center px-4 py-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-light/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl flex flex-col gap-5 relative z-10">
        {/* Top Host Bar */}
        {session.phase !== "podium" && (
          <div className="flex justify-between items-center text-white/80 text-xs font-semibold px-1">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{quiz.title}</span>
            </span>
            <div className="flex items-center gap-4">
              <span className="bg-white/15 px-3 py-1 rounded-full border border-white/20">
                PIN: <strong className="text-white tracking-wider">{session.pin}</strong>
              </span>
              <button
                type="button"
                onClick={endGame}
                className="text-white/70 hover:text-white underline underline-offset-2 transition-colors cursor-pointer"
              >
                End session
              </button>
            </div>
          </div>
        )}

        {/* 1. LOBBY SCREEN */}
        {session.phase === "lobby" && (
          <motion.div
            key="host-lobby"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-6 text-white"
          >
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2">
                <Users size={18} /> Live Lobby
              </span>
              <span className="bg-white/20 border border-white/30 rounded-full px-3.5 py-1 shadow-sm">
                {session.participants.length} joined
              </span>
            </div>

            {/* Room PIN Hero Card */}
            <div className="bg-white text-ink rounded-3xl p-6 flex flex-col items-center gap-2 mx-auto shadow-2xl border-4 border-white/20 max-w-sm w-full text-center">
              <span className="text-xs font-bold text-ink-soft uppercase tracking-wider">
                Join with Room PIN
              </span>
              <span className="font-display text-5xl font-black tracking-[0.25em] text-brand-deep tabular-nums">
                {session.pin.slice(0, 3)} {session.pin.slice(3)}
              </span>
            </div>

            {/* QR Code & Connected Participants list */}
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 flex flex-wrap items-center justify-center gap-8 shadow-xl">
              <div className="flex flex-col items-center gap-2.5">
                <div className="p-2.5 bg-white rounded-2xl shadow-lg">
                  <JoinQRCode url={joinUrl} size={150} />
                </div>
                <span className="text-xs text-white/90 text-center font-medium max-w-[12rem]">
                  Scan with your phone camera to join
                </span>
              </div>

              <div className="flex-1 min-w-[260px] flex flex-col gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                  Joined Players ({session.participants.length})
                </span>
                {session.participants.length === 0 ? (
                  <div className="bg-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-2 border border-dashed border-white/30">
                    <span className="text-3xl animate-bounce">📱</span>
                    <p className="text-sm font-semibold text-white/90">Waiting for players to join...</p>
                    <p className="text-xs text-white/60">Scan the QR code or enter PIN at /join</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2.5 content-start max-h-48 overflow-y-auto pr-1">
                    {session.participants.map((p) => (
                      <ParticipantTag key={p.id} name={p.name} avatar={p.avatar} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Start Button */}
            <div className="flex justify-center pt-2">
              <TactileButton
                variant="white"
                className="px-8 py-3.5 text-base font-bold flex items-center gap-2 shadow-2xl hover:scale-105 transition-transform"
                onClick={startGame}
                disabled={session.participants.length === 0}
              >
                <Play size={18} className="fill-current" /> Start Game ({session.participants.length} Players)
              </TactileButton>
            </div>
          </motion.div>
        )}

        {/* 2. QUESTION SCREEN */}
        {session.phase === "question" && currentQuestion && (
          <motion.div
            key={`host-question-${session.currentQuestionIndex}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-5 text-white"
          >
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="bg-white/15 px-3 py-1 rounded-full border border-white/20">
                Question {session.currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span className="bg-white/20 border border-white/30 rounded-full px-3.5 py-1 shadow-sm flex items-center gap-1.5 font-bold">
                <Users size={15} /> {answeredCount} / {session.participants.length} Answered
              </span>
            </div>

            <div className="bg-white text-ink rounded-3xl p-8 flex flex-col gap-6 shadow-2xl">
              <h2 className="font-display text-2xl font-bold leading-snug text-ink text-center">
                {currentQuestion.title}
              </h2>

              <div className="flex items-center justify-center gap-8 flex-wrap">
                <div className="flex-none shadow-md rounded-full">
                  <CountdownRing secondsLeft={secondsLeft} fraction={fraction} />
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5 min-w-[280px]">
                  {currentQuestion.options.map((option) => (
                    <OptionButton key={option.id} color={option.color} label={option.text} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-3">
              <TactileButton
                variant="white"
                className="flex items-center gap-1.5 font-bold shadow-lg"
                onClick={showResults}
              >
                Show results early <ArrowRight size={16} />
              </TactileButton>
            </div>
          </motion.div>
        )}

        {/* 3. RESULTS SCREEN */}
        {session.phase === "results" && currentQuestion && (
          <motion.div
            key={`host-results-${session.currentQuestionIndex}`}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-5 text-white"
          >
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="bg-white/15 px-3 py-1 rounded-full border border-white/20">
                Question {session.currentQuestionIndex + 1} &middot; Results Breakdown
              </span>
              <span className="bg-white/20 border border-white/30 rounded-full px-3 py-1 font-bold">
                {session.answers.filter((a) => a.questionId === currentQuestion.id).length} Total Responses
              </span>
            </div>

            <div className="bg-white text-ink rounded-3xl p-8 flex flex-col gap-5 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-display text-xl font-bold text-ink leading-snug">
                  {currentQuestion.title}
                </h2>
                <div className="flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full flex-none">
                  <CheckCircle2 size={15} /> Correct Answer Revealed
                </div>
              </div>

              <AnswerBarChart options={currentQuestion.options} votesByOption={votesByOption} />
            </div>

            <div className="flex justify-center">
              <TactileButton
                variant="white"
                className="px-6 py-3 font-bold text-sm flex items-center gap-2 shadow-xl"
                onClick={showLeaderboard}
              >
                <span>Show Leaderboard</span> <ArrowRight size={16} />
              </TactileButton>
            </div>
          </motion.div>
        )}

        {/* 4. LEADERBOARD SCREEN */}
        {session.phase === "leaderboard" && (
          <motion.div
            key={`host-leaderboard-${session.currentQuestionIndex}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-5 text-white"
          >
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-1.5 font-display text-base">
                <Trophy size={18} className="text-amber-300" /> Running Leaderboard
              </span>
              <span className="bg-white/15 border border-white/30 rounded-full px-3 py-1">
                After Question {session.currentQuestionIndex + 1} of {totalQuestions}
              </span>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl">
              <Leaderboard participants={session.participants} limit={8} />
            </div>

            <div className="flex justify-center">
              <TactileButton
                variant="white"
                className="px-8 py-3.5 text-base font-bold flex items-center gap-2 shadow-2xl"
                onClick={nextQuestion}
              >
                <span>{isLastQuestion ? "Show Final Podium 🏆" : "Next Question"}</span>
                <ArrowRight size={18} />
              </TactileButton>
            </div>
          </motion.div>
        )}

        {/* 5. PODIUM / FINAL CELEBRATION */}
        {session.phase === "podium" && (
          <motion.div
            key="host-podium"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col gap-6 text-white items-center w-full"
          >
            <div className="flex flex-col items-center gap-1 text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-amber-300 flex items-center gap-1">
                <Sparkles size={14} /> Congratulations! <Sparkles size={14} />
              </span>
              <h1 className="font-display text-3xl font-extrabold">{quiz.title} &middot; Final Podium</h1>
            </div>

            {/* Animated Podium */}
            <div className="w-full bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl relative overflow-hidden">
              <Podium participants={session.participants} />
            </div>

            {/* Complete Final Standings Leaderboard */}
            <div className="w-full bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 shadow-2xl flex flex-col gap-3">
              <span className="text-xs font-bold uppercase tracking-wider text-white/80 px-1">
                Complete Final Standings
              </span>
              <Leaderboard participants={session.participants} limit={15} />
            </div>

            <div className="flex justify-center pt-2">
              <TactileButton
                variant="white"
                className="font-bold px-6 py-2.5"
                onClick={() => router.push("/admin")}
              >
                Back to Dashboard
              </TactileButton>
            </div>
          </motion.div>
        )}
      </div>
    </main>
  );
}
