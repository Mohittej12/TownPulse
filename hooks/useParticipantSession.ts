"use client";

import { useEffect, useState } from "react";
import { useLiveSession, useQuizGame } from "@/context/QuizGameContext";
import { getQuizById } from "@/lib/services/quizService";
import type { Quiz } from "@/lib/types";

/**
 * Everything the participant (phone) view needs, in one call: current
 * question, whether "my" answer for it has landed yet, and my live rank.
 */
export function useParticipantSession() {
  const { participant, participantSessionId, joinSession, leaveParticipant, submitAnswer } =
    useQuizGame();
  const session = useLiveSession(participantSessionId);
  const [quiz, setQuiz] = useState<Quiz | undefined>(undefined);

  useEffect(() => {
    if (session?.quizId) {
      getQuizById(session.quizId).then((q) => {
        if (q) setQuiz(q);
      });
    }
  }, [session?.quizId]);

  const currentQuestion = quiz?.questions[session?.currentQuestionIndex ?? 0];

  const myAnswer = session?.answers.find(
    (a) => a.participantId === participant?.id && a.questionId === currentQuestion?.id
  );

  const ranked = session
    ? [...session.participants].sort((a, b) => b.score - a.score)
    : [];
  const myRank = participant ? ranked.findIndex((p) => p.id === participant.id) + 1 : 0;

  return {
    participant,
    session,
    quiz,
    currentQuestion,
    myAnswer,
    myRank: myRank || null,
    totalParticipants: ranked.length,
    joinSession,
    leaveParticipant,
    submitAnswer,
  };
}
