"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { useParticipantSession } from "@/hooks/useParticipantSession";
import { useCountdown } from "@/hooks/useCountdown";
import { OptionButton } from "@/components/quiz/OptionButton";
import { TactileButton } from "@/components/ui/primitives";

export default function PlayPage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const { participant, session, currentQuestion, myAnswer, myRank, totalParticipants, submitAnswer } =
    useParticipantSession();
  const [locking, setLocking] = useState(false);

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

  useEffect(() => {
    setLocking(false);
  }, [session?.currentQuestionIndex]);

  const { secondsLeft } = useCountdown(session?.questionStartedAt ?? null, currentQuestion?.timeLimitSec ?? 20);

  if (!participant || !session) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <p className="text-ink-soft text-sm">Loading your session&hellip;</p>
      </main>
    );
  }

  function handleAnswer(optionId: string) {
    if (!session?.questionStartedAt || locking || myAnswer) return;
    setLocking(true);
    const responseTimeMs = Date.now() - session.questionStartedAt;
    submitAnswer(optionId, responseTimeMs);
    try {
      navigator.vibrate?.(40);
    } catch {
      // vibration not supported -- fine to ignore
    }
  }

  const answered = Boolean(myAnswer) || locking;
  const myAnswers = session.answers.filter((a) => a.participantId === participant.id);
  const accuracyPct = myAnswers.length
    ? Math.round((myAnswers.filter((a) => a.correct).length / myAnswers.length) * 100)
    : 0;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm bg-white border border-brand-tint rounded-card shadow-sm p-5 min-h-[520px] flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="font-display font-semibold text-sm text-brand-deep">
            {participant.avatar} {participant.name}
          </span>
          {session.phase === "question" && <span className="text-xs font-semibold text-ink-soft">{secondsLeft}s</span>}
        </div>

        {session.phase === "lobby" && (
          <div className="flex-1 rounded-2xl bg-brand-tint flex flex-col items-center justify-center gap-3 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-brand text-white flex items-center justify-center text-2xl animate-pulse-soft">
              👋
            </div>
            <p className="font-semibold text-ink">See your name on the big screen</p>
            <span className="text-xs text-ink-soft">Waiting for the host to start&hellip;</span>
          </div>
        )}

        {session.phase === "question" && currentQuestion && (
          <div className="flex-1 flex flex-col gap-3">
            <p className="text-sm font-semibold text-ink leading-snug">{currentQuestion.title}</p>
            <div className="grid grid-cols-2 gap-2.5 flex-1">
              {currentQuestion.options.map((option) => (
                <OptionButton
                  key={option.id}
                  color={option.color}
                  label={option.text}
                  size="sm"
                  disabled={answered}
                  dimmed={answered && myAnswer?.optionId !== option.id}
                  onClick={() => handleAnswer(option.id)}
                />
              ))}
            </div>
            {answered && <p className="text-xs text-ink-soft text-center">Answer locked in! Waiting for others&hellip;</p>}
          </div>
        )}

        {session.phase === "results" && (
          <div
            className={clsx(
              "flex-1 rounded-2xl flex flex-col items-center justify-center gap-2 text-white",
              myAnswer?.correct ? "bg-option-green" : "bg-option-red"
            )}
          >
            <span className="text-3xl" aria-hidden="true">
              {myAnswer?.correct ? "✓" : myAnswer ? "✕" : "⏱"}
            </span>
            <p className="font-display font-semibold text-lg">
              {myAnswer?.correct ? "Correct!" : myAnswer ? "Not quite" : "Time's up"}
            </p>
            <p className="font-display font-semibold text-3xl tabular-nums">+{myAnswer?.pointsAwarded ?? 0}</p>
            <p className="text-xs">
              Now ranked #{myRank ?? "-"} of {totalParticipants}
            </p>
          </div>
        )}

        {session.phase === "leaderboard" && (
          <div className="flex-1 rounded-2xl bg-brand-tint flex flex-col items-center justify-center gap-3 text-center px-4">
            <div className="w-16 h-16 rounded-full bg-brand text-white flex items-center justify-center text-2xl animate-pulse-soft">
              🏆
            </div>
            <p className="font-semibold text-ink">You're ranked #{myRank ?? "-"}</p>
            <span className="text-xs text-ink-soft">Get ready for the next question&hellip;</span>
          </div>
        )}

        {session.phase === "podium" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <span className="text-xs font-semibold text-ink-soft">Final rank</span>
            <span className="font-display text-5xl font-semibold text-brand-deep">#{myRank ?? "-"}</span>
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className="bg-canvas rounded-xl p-3">
                <div className="font-display text-xl font-semibold text-brand-deep tabular-nums">
                  {participant.score.toLocaleString()}
                </div>
                <div className="text-[11px] text-ink-soft">Total score</div>
              </div>
              <div className="bg-canvas rounded-xl p-3">
                <div className="font-display text-xl font-semibold text-brand-deep tabular-nums">{accuracyPct}%</div>
                <div className="text-[11px] text-ink-soft">Accuracy</div>
              </div>
            </div>
            <TactileButton variant="white" className="w-full" onClick={() => router.push("/join")}>
              Back to lobby
            </TactileButton>
          </div>
        )}
      </div>
    </main>
  );
}
