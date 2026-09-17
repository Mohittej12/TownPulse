"use client";

import { useEffect, useState } from "react";
import { useLiveSession, useQuizGame } from "@/context/QuizGameContext";
import { getQuizById } from "@/lib/services/quizService";
import type { Quiz } from "@/lib/types";

/**
 * Everything the projector (host stage) view needs for one session id, in
 * one call. Presentation components never touch services directly.
 */
export function useHostSession(sessionId: string) {
  const { setHostSession, startGame, showResults, showLeaderboard, nextQuestion, endGame } =
    useQuizGame();
  const session = useLiveSession(sessionId);
  const [quiz, setQuiz] = useState<Quiz | undefined>(undefined);

  useEffect(() => {
    setHostSession(sessionId);
  }, [sessionId, setHostSession]);

  useEffect(() => {
    if (session?.quizId) {
      getQuizById(session.quizId).then((q) => {
        if (q) setQuiz(q);
      });
    }
  }, [session?.quizId]);

  const currentQuestion = quiz?.questions[session?.currentQuestionIndex ?? 0];
  const totalQuestions = quiz?.questions.length ?? 0;
  const answeredCount = session
    ? session.answers.filter((a) => a.questionId === currentQuestion?.id).length
    : 0;

  return {
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
  };
}
