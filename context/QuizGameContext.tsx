"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { supabaseSessionService } from "@/lib/services/supabaseSessionService";
import type { SessionService } from "@/lib/services/sessionService";
import { getQuizById } from "@/lib/services/quizService";
import type { GameSession, Participant } from "@/lib/types";

const PARTICIPANT_STORAGE_KEY = "townpulse-participant";

interface StoredParticipant {
  participant: Participant;
  sessionId: string;
}

interface QuizGameContextValue {
  service: SessionService;
  participant: Participant | null;
  participantSessionId: string | null;
  hostSessionId: string | null;

  joinSession: (
    pin: string,
    name: string,
    avatar: string
  ) => Promise<{ ok: true; sessionId: string } | { ok: false; error: string }>;
  leaveParticipant: () => void;
  submitAnswer: (optionId: string, responseTimeMs: number) => void;

  setHostSession: (sessionId: string) => void;
  startGame: () => void;
  showResults: () => void;
  showLeaderboard: () => void;
  nextQuestion: () => void;
  endGame: () => void;
}

const QuizGameContext = createContext<QuizGameContextValue | null>(null);

export function QuizGameProvider({ children }: { children: ReactNode }) {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [participantSessionId, setParticipantSessionId] = useState<string | null>(null);
  const [hostSessionId, setHostSessionIdState] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(PARTICIPANT_STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as StoredParticipant;
        setParticipant(stored.participant);
        setParticipantSessionId(stored.sessionId);
      }
    } catch {
      // sessionStorage unavailable (private mode, etc.) -- fine, just start fresh.
    }
  }, []);

  const joinSession = useCallback(async (pin: string, name: string, avatar: string) => {
    const cleanPin = pin.replace(/\s+/g, "");
    const result = await supabaseSessionService.join(cleanPin, name, avatar);
    if (!result) {
      return {
        ok: false as const,
        error: "We couldn't find a room with that PIN. Double-check it and try again.",
      };
    }
    setParticipant(result.participant);
    setParticipantSessionId(result.session.id);
    try {
      window.sessionStorage.setItem(
        PARTICIPANT_STORAGE_KEY,
        JSON.stringify({ participant: result.participant, sessionId: result.session.id })
      );
    } catch {
      // ignore
    }
    return { ok: true as const, sessionId: result.session.id };
  }, []);

  const leaveParticipant = useCallback(() => {
    setParticipant(null);
    setParticipantSessionId(null);
    try {
      window.sessionStorage.removeItem(PARTICIPANT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const submitAnswer = useCallback(
    async (optionId: string, responseTimeMs: number) => {
      if (!participant || !participantSessionId) return;
      const session = supabaseSessionService.getSession(participantSessionId);
      if (!session) return;
      const quiz = await getQuizById(session.quizId);
      const question = quiz?.questions[session.currentQuestionIndex];
      if (!question) return;
      supabaseSessionService.submitAnswer(
        participantSessionId,
        participant.id,
        question.id,
        optionId,
        responseTimeMs
      );
    },
    [participant, participantSessionId]
  );

  const setHostSession = useCallback((sessionId: string) => {
    setHostSessionIdState(sessionId);
  }, []);

  const startGame = useCallback(() => {
    if (hostSessionId) supabaseSessionService.startGame(hostSessionId);
  }, [hostSessionId]);

  const showResults = useCallback(() => {
    if (hostSessionId) supabaseSessionService.showResults(hostSessionId);
  }, [hostSessionId]);

  const showLeaderboard = useCallback(() => {
    if (hostSessionId) supabaseSessionService.showLeaderboard(hostSessionId);
  }, [hostSessionId]);

  const nextQuestion = useCallback(() => {
    if (hostSessionId) supabaseSessionService.nextQuestion(hostSessionId);
  }, [hostSessionId]);

  const endGame = useCallback(() => {
    if (hostSessionId) supabaseSessionService.endGame(hostSessionId);
  }, [hostSessionId]);

  const value = useMemo<QuizGameContextValue>(
    () => ({
      service: supabaseSessionService,
      participant,
      participantSessionId,
      hostSessionId,
      joinSession,
      leaveParticipant,
      submitAnswer,
      setHostSession,
      startGame,
      showResults,
      showLeaderboard,
      nextQuestion,
      endGame,
    }),
    [
      participant,
      participantSessionId,
      hostSessionId,
      joinSession,
      leaveParticipant,
      submitAnswer,
      setHostSession,
      startGame,
      showResults,
      showLeaderboard,
      nextQuestion,
      endGame,
    ]
  );

  return <QuizGameContext.Provider value={value}>{children}</QuizGameContext.Provider>;
}

export function useQuizGame(): QuizGameContextValue {
  const ctx = useContext(QuizGameContext);
  if (!ctx) throw new Error("useQuizGame must be used inside <QuizGameProvider>");
  return ctx;
}

/**
 * Subscribes any component to a session's live state. Works identically for
 * the host stage and the participant screen -- both just want "the current
 * GameSession, re-rendered whenever it changes."
 */
export function useLiveSession(sessionId: string | null): GameSession | null {
  const [session, setSession] = useState<GameSession | null>(() =>
    sessionId ? supabaseSessionService.getSession(sessionId) ?? null : null
  );

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      return;
    }
    setSession(supabaseSessionService.getSession(sessionId) ?? null);
    const unsubscribe = supabaseSessionService.subscribe(sessionId, {
      onSessionUpdated: (updated) => setSession({ ...updated }),
    });
    return unsubscribe;
  }, [sessionId]);

  return session;
}
