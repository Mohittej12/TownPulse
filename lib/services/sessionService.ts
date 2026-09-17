import type { AnswerRecord, GameSession, Participant, Quiz, SessionPhase } from "@/lib/types";

/**
 * This is the ONLY contract UI code talks to. Today `mockSessionService.ts`
 * implements it with BroadcastChannel + an in-memory store, standing in for
 * a real backend. Later, `supabaseSessionService.ts` implements the exact
 * same interface using Supabase Realtime (Broadcast + Presence) and Postgres
 * tables. No component, hook, or context above this layer needs to change
 * when that swap happens -- see README.md.
 */

export interface SessionServiceEvents {
  onParticipantJoined?: (participant: Participant, session: GameSession) => void;
  onAnswerSubmitted?: (answer: AnswerRecord, session: GameSession) => void;
  onSessionUpdated?: (session: GameSession) => void;
}

export type Unsubscribe = () => void;

export interface SessionService {
  /** Host action: turn a quiz into a live, joinable session with a PIN. */
  createSession(quiz: Quiz): GameSession;

  /** Any client: subscribe to live updates for a session. */
  subscribe(sessionId: string, events: SessionServiceEvents): Unsubscribe;

  /** Participant action: resolve a PIN to a session and join it. */
  join(
    pin: string,
    name: string,
    avatar: string
  ): Promise<{ session: GameSession; participant: Participant } | null>;

  /** Host action: move the lobby into question 1. */
  startGame(sessionId: string): void;

  /** Participant action: lock in an answer for the current question. */
  submitAnswer(
    sessionId: string,
    participantId: string,
    questionId: string,
    optionId: string,
    responseTimeMs: number
  ): void;

  /** Host action: reveal the vote distribution for the current question. */
  showResults(sessionId: string): void;

  /** Host action: show the running leaderboard between questions. */
  showLeaderboard(sessionId: string): void;

  /** Host action: advance to the next question, or end the game if none remain. */
  nextQuestion(sessionId: string): void;

  /** Host action: force-end the session and show the final podium. */
  endGame(sessionId: string): void;

  /** Read the current cached state for a session, if any. */
  getSession(sessionId: string): GameSession | undefined;

  /** Read a session's current phase, a small convenience over getSession. */
  getPhase(sessionId: string): SessionPhase | undefined;
}
