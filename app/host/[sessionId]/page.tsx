"use client";

import { useHostSession } from "@/hooks/useHostSession";
import { useCountdown } from "@/hooks/useCountdown";
import { CountdownRing } from "@/components/quiz/CountdownRing";
import { JoinQRCode } from "@/components/quiz/QRCode";
import { ParticipantTag } from "@/components/quiz/ParticipantTag";
import { OptionButton } from "@/components/quiz/OptionButton";
import { AnswerBarChart } from "@/components/quiz/AnswerBarChart";
import { Leaderboard } from "@/components/quiz/Leaderboard";
import { Podium } from "@/components/quiz/Podium";
import { TactileButton } from "@/components/ui/primitives";

export default function HostStagePage({ params }: { params: { sessionId: string } }) {
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

  if (!session || !quiz) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-brand to-brand-deep">
        <p className="font-display text-lg">Connecting to session&hellip;</p>
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
    typeof window !== "undefined" ? `${window.location.origin}/join?pin=${session.pin}` : `/join?pin=${session.pin}`;

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand to-brand-deep flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl flex flex-col gap-4">
        {session.phase !== "podium" && (
          <div className="flex justify-between items-center text-white/70 text-xs">
            <span className="font-semibold">{quiz.title}</span>
            <button onClick={endGame} className="underline underline-offset-2 hover:text-white">
              End session early
            </button>
          </div>
        )}

        {session.phase === "lobby" && (
          <div className="flex flex-col gap-6 text-white">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Live lobby</span>
              <span className="bg-white/15 border border-white/30 rounded-full px-3 py-1">
                {session.participants.length} joined
              </span>
            </div>
            <div className="bg-white text-ink rounded-2xl px-8 py-5 flex flex-col items-center gap-1 mx-auto shadow-sm">
              <span className="text-xs font-semibold text-ink-soft uppercase tracking-wide">Room PIN</span>
              <span className="font-display text-4xl font-semibold tracking-[0.2em] text-brand-deep tabular-nums">
                {session.pin.slice(0, 3)} {session.pin.slice(3)}
              </span>
            </div>
            <div className="flex flex-wrap items-start justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <JoinQRCode url={joinUrl} />
                <span className="text-xs text-white/85 text-center max-w-[10rem]">
                  Scan, or go to townpulse.app/join
                </span>
              </div>
              <div className="flex flex-wrap gap-2 content-start max-h-36 overflow-hidden flex-1 min-w-[200px]">
                {session.participants.map((p) => (
                  <ParticipantTag key={p.id} name={p.name} avatar={p.avatar} />
                ))}
              </div>
            </div>
            <div className="flex justify-center">
              <TactileButton variant="white" onClick={startGame} disabled={session.participants.length === 0}>
                Start game
              </TactileButton>
            </div>
          </div>
        )}

        {session.phase === "question" && currentQuestion && (
          <div className="flex flex-col gap-5 text-white">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>
                Question {session.currentQuestionIndex + 1} of {totalQuestions}
              </span>
              <span className="bg-white/15 border border-white/30 rounded-full px-3 py-1">
                {answeredCount} / {session.participants.length} answered
              </span>
            </div>
            <div className="bg-white text-ink rounded-2xl p-6 flex flex-col gap-5">
              <h2 className="font-display text-xl font-semibold leading-snug">{currentQuestion.title}</h2>
              <div className="flex items-center gap-5 flex-wrap">
                <CountdownRing secondsLeft={secondsLeft} fraction={fraction} />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[240px]">
                  {currentQuestion.options.map((option) => (
                    <OptionButton key={option.id} color={option.color} label={option.text} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <TactileButton variant="white" onClick={showResults}>
                Show results
              </TactileButton>
            </div>
          </div>
        )}

        {session.phase === "results" && currentQuestion && (
          <div className="flex flex-col gap-5 text-white">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Question {session.currentQuestionIndex + 1} &middot; results</span>
              <span className="bg-white/15 border border-white/30 rounded-full px-3 py-1">
                {session.participants.length} responses
              </span>
            </div>
            <div className="bg-white text-ink rounded-2xl p-6 flex flex-col gap-4">
              <h2 className="font-display text-lg font-semibold">{currentQuestion.title}</h2>
              <AnswerBarChart options={currentQuestion.options} votesByOption={votesByOption} />
            </div>
            <div className="flex justify-center">
              <TactileButton variant="white" onClick={showLeaderboard}>
                Show leaderboard
              </TactileButton>
            </div>
          </div>
        )}

        {session.phase === "leaderboard" && (
          <div className="flex flex-col gap-5 text-white">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span>Leaderboard</span>
              <span className="bg-white/15 border border-white/30 rounded-full px-3 py-1">
                after question {session.currentQuestionIndex + 1}
              </span>
            </div>
            <Leaderboard participants={session.participants} />
            <div className="flex justify-center">
              <TactileButton variant="white" onClick={nextQuestion}>
                {session.currentQuestionIndex + 1 >= totalQuestions ? "Show final results" : "Next question"}
              </TactileButton>
            </div>
          </div>
        )}

        {session.phase === "podium" && (
          <div className="flex flex-col gap-5 text-white items-center">
            <div className="text-sm font-semibold">{quiz.title} &middot; final results</div>
            <Podium participants={session.participants} />
          </div>
        )}
      </div>
    </main>
  );
}
