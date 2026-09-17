import type {
  AnswerRecord,
  GameSession,
  Participant,
  Quiz,
  SessionPhase,
} from "@/lib/types";
import { getQuizById } from "@/lib/mock/mockData";
import { computePoints, generatePin } from "@/lib/scoring";
import type { SessionService, SessionServiceEvents, Unsubscribe } from "./sessionService";

/**
 * Mock implementation of SessionService.
 *
 * There is no backend yet, so this module plays the role of one inside the
 * browser: each session's live state (participants, answers, phase) is kept
 * in an in-memory Map, and BroadcastChannel fans out every change to any
 * other tab on the same origin -- so a host tab (projector) and a
 * participant tab (phone) on the same machine stay in sync, the same way
 * they would through Supabase Realtime once that's wired in.
 *
 * SWAP POINT: replace this file's export with `supabaseSessionService.ts`
 * (same `SessionService` shape). Concretely:
 *  - `createSession`      -> INSERT into `sessions`, `sessions.pin` unique
 *  - `subscribe`          -> supabase.channel(`session:${id}`).on('broadcast', ...).on('presence', ...).subscribe()
 *  - `join`               -> SELECT session by pin, then INSERT into `participants` (RLS: insert-only, own row)
 *  - `submitAnswer`       -> INSERT into `responses` (RLS: own participant_id, current open question only)
 *  - `startGame`/`nextQuestion`/`showResults`/`showLeaderboard`/`endGame`
 *                         -> UPDATE `sessions` (RLS: only session owner), which the
 *                            other clients receive as postgres_changes / broadcast events
 * The BroadcastChannel "directory" and "SYNC_REQUEST" dance below exists only
 * because there is no database to query -- Supabase needs none of it.
 */

type SessionEvent =
  | { type: "PARTICIPANT_JOINED"; sessionId: string; participant: Participant }
  | { type: "ANSWER_SUBMITTED"; sessionId: string; answer: AnswerRecord }
  | { type: "PHASE_CHANGED"; sessionId: string; phase: SessionPhase }
  | { type: "QUESTION_ADVANCED"; sessionId: string; index: number }
  | { type: "GAME_ENDED"; sessionId: string }
  | { type: "SYNC_REQUEST"; sessionId: string }
  | { type: "SYNC"; sessionId: string; session: GameSession };

type DirectoryMessage =
  | { type: "ANNOUNCE"; pin: string; sessionId: string; quizId: string }
  | { type: "QUERY_PIN"; pin: string };

const sessions = new Map<string, GameSession>();
const pinToSession = new Map<string, string>();
const pinToQuiz = new Map<string, string>();
const listeners = new Map<string, Set<SessionServiceEvents>>();
const channels = new Map<string, BroadcastChannel>();
let directoryChannel: BroadcastChannel | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof BroadcastChannel !== "undefined";
}

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function ensureDirectory(): void {
  if (!isBrowser() || directoryChannel) return;
  directoryChannel = new BroadcastChannel("townpulse-directory");
  directoryChannel.onmessage = (event: MessageEvent<DirectoryMessage>) => {
    const msg = event.data;
    if (msg.type === "ANNOUNCE") {
      pinToSession.set(msg.pin, msg.sessionId);
      pinToQuiz.set(msg.pin, msg.quizId);
    } else if (msg.type === "QUERY_PIN") {
      const sessionId = pinToSession.get(msg.pin);
      const quizId = pinToQuiz.get(msg.pin);
      if (sessionId && quizId && directoryChannel) {
        directoryChannel.postMessage({ type: "ANNOUNCE", pin: msg.pin, sessionId, quizId });
      }
    }
  };
}

function announce(pin: string, sessionId: string, quizId: string): void {
  ensureDirectory();
  pinToSession.set(pin, sessionId);
  pinToQuiz.set(pin, quizId);
  directoryChannel?.postMessage({ type: "ANNOUNCE", pin, sessionId, quizId });
}

function queryPin(pin: string, timeoutMs = 900): Promise<string | null> {
  return new Promise((resolve) => {
    ensureDirectory();
    if (pinToSession.has(pin)) {
      resolve(pinToSession.get(pin) ?? null);
      return;
    }
    if (!directoryChannel) {
      resolve(null);
      return;
    }
    const channel = directoryChannel;
    const timer = setTimeout(() => {
      channel.removeEventListener("message", handler);
      resolve(pinToSession.get(pin) ?? null);
    }, timeoutMs);
    function handler(event: MessageEvent<DirectoryMessage>) {
      const msg = event.data;
      if (msg.type === "ANNOUNCE" && msg.pin === pin) {
        clearTimeout(timer);
        channel.removeEventListener("message", handler);
        resolve(msg.sessionId);
      }
    }
    channel.addEventListener("message", handler);
    channel.postMessage({ type: "QUERY_PIN", pin });
  });
}

function getChannel(sessionId: string): BroadcastChannel | null {
  if (!isBrowser()) return null;
  let channel = channels.get(sessionId);
  if (!channel) {
    channel = new BroadcastChannel(`townpulse-session-${sessionId}`);
    channel.onmessage = (event: MessageEvent<SessionEvent>) => handleIncoming(sessionId, event.data);
    channels.set(sessionId, channel);
  }
  return channel;
}

function applyEvent(session: GameSession, event: SessionEvent): GameSession {
  switch (event.type) {
    case "PARTICIPANT_JOINED": {
      if (session.participants.some((p) => p.id === event.participant.id)) return session;
      return { ...session, participants: [...session.participants, event.participant] };
    }
    case "ANSWER_SUBMITTED": {
      const already = session.answers.some(
        (a) => a.participantId === event.answer.participantId && a.questionId === event.answer.questionId
      );
      if (already) return session;
      const participants = session.participants.map((p) => {
        if (p.id !== event.answer.participantId) return p;
        return {
          ...p,
          score: p.score + event.answer.pointsAwarded,
          streak: event.answer.correct ? p.streak + 1 : 0,
        };
      });
      return { ...session, answers: [...session.answers, event.answer], participants };
    }
    case "PHASE_CHANGED":
      return { ...session, phase: event.phase };
    case "QUESTION_ADVANCED":
      return { ...session, currentQuestionIndex: event.index, phase: "question", questionStartedAt: Date.now() };
    case "GAME_ENDED":
      return { ...session, phase: "podium" };
    default:
      return session;
  }
}

function notify(sessionId: string, session: GameSession, event: SessionEvent): void {
  const subs = listeners.get(sessionId);
  if (!subs) return;
  subs.forEach((handlers) => {
    handlers.onSessionUpdated?.(session);
    if (event.type === "PARTICIPANT_JOINED") handlers.onParticipantJoined?.(event.participant, session);
    if (event.type === "ANSWER_SUBMITTED") handlers.onAnswerSubmitted?.(event.answer, session);
  });
}

function handleIncoming(sessionId: string, event: SessionEvent): void {
  if (event.type === "SYNC_REQUEST") {
    const current = sessions.get(sessionId);
    if (current) {
      getChannel(sessionId)?.postMessage({ type: "SYNC", sessionId, session: current });
    }
    return;
  }
  if (event.type === "SYNC") {
    sessions.set(sessionId, event.session);
    notify(sessionId, event.session, event);
    return;
  }
  const current = sessions.get(sessionId);
  if (!current) return;
  const updated = applyEvent(current, event);
  sessions.set(sessionId, updated);
  notify(sessionId, updated, event);
}

function dispatch(sessionId: string, event: SessionEvent): void {
  const current = sessions.get(sessionId);
  if (!current) return;
  const updated = applyEvent(current, event);
  sessions.set(sessionId, updated);
  notify(sessionId, updated, event);
  getChannel(sessionId)?.postMessage(event);
}

const BOT_NAMES = ["Priya Shah", "Marcus Chen", "Aisha Patel", "Sam Okafor", "Lena Kowalski", "Devon Brooks"];
const BOT_AVATARS = ["🦊", "🐼", "🐸", "🦁", "🐨", "🦉"];

/**
 * Spawns a handful of simulated participants so the host stage and
 * leaderboard feel alive during a solo walkthrough. Purely cosmetic --
 * remove this call in `createSession` once real participants (and a real
 * backend) are in place.
 */
function spawnDemoBots(sessionId: string, quiz: Quiz): void {
  if (!isBrowser()) return;

  BOT_NAMES.forEach((name, i) => {
    const delay = 500 + i * 380 + Math.random() * 400;
    setTimeout(() => {
      const participant: Participant = {
        id: `bot-${sessionId}-${i}`,
        name,
        avatar: BOT_AVATARS[i],
        score: 0,
        streak: 0,
        joinedAt: Date.now(),
      };
      dispatch(sessionId, { type: "PARTICIPANT_JOINED", sessionId, participant });
    }, delay);
  });

  let lastQuestionIndex = -1;
  mockSessionService.subscribe(sessionId, {
    onSessionUpdated(session) {
      if (session.phase !== "question") return;
      if (session.currentQuestionIndex === lastQuestionIndex) return;
      lastQuestionIndex = session.currentQuestionIndex;
      const question = quiz.questions[session.currentQuestionIndex];
      if (!question) return;
      BOT_NAMES.forEach((_, i) => {
        const botId = `bot-${sessionId}-${i}`;
        const thinkTimeMs = 1200 + Math.random() * question.timeLimitSec * 1000 * 0.6;
        setTimeout(() => {
          const current = sessions.get(sessionId);
          if (!current || current.phase !== "question" || current.currentQuestionIndex !== session.currentQuestionIndex) {
            return;
          }
          const answersCorrectly = Math.random() < 0.65;
          const option = answersCorrectly
            ? question.options.find((o) => o.correct) ?? question.options[0]
            : question.options[Math.floor(Math.random() * question.options.length)];
          mockSessionService.submitAnswer(sessionId, botId, question.id, option.id, thinkTimeMs);
        }, thinkTimeMs);
      });
    },
  });
}

export const mockSessionService: SessionService = {
  createSession(quiz: Quiz): GameSession {
    const id = newId("session");
    const pin = generatePin();
    const session: GameSession = {
      id,
      pin,
      quizId: quiz.id,
      phase: "lobby",
      currentQuestionIndex: 0,
      participants: [],
      answers: [],
      questionStartedAt: null,
    };
    sessions.set(id, session);
    getChannel(id);
    announce(pin, id, quiz.id);
    spawnDemoBots(id, quiz);
    return session;
  },

  subscribe(sessionId: string, events: SessionServiceEvents): Unsubscribe {
    ensureDirectory();
    getChannel(sessionId);
    let subs = listeners.get(sessionId);
    if (!subs) {
      subs = new Set();
      listeners.set(sessionId, subs);
    }
    subs.add(events);
    if (!sessions.has(sessionId)) {
      getChannel(sessionId)?.postMessage({ type: "SYNC_REQUEST", sessionId });
    }
    return () => {
      listeners.get(sessionId)?.delete(events);
    };
  },

  async join(pin, name, avatar) {
    ensureDirectory();
    let sessionId = pinToSession.get(pin) ?? null;
    if (!sessionId) sessionId = await queryPin(pin);
    if (!sessionId) return null;

    const quizId = pinToQuiz.get(pin);
    if (!sessions.has(sessionId) && quizId) {
      sessions.set(sessionId, {
        id: sessionId,
        pin,
        quizId,
        phase: "lobby",
        currentQuestionIndex: 0,
        participants: [],
        answers: [],
        questionStartedAt: null,
      });
    }
    const participant: Participant = {
      id: newId("participant"),
      name,
      avatar,
      score: 0,
      streak: 0,
      joinedAt: Date.now(),
    };
    // Broadcast the join first so an authoritative host tab records it
    // before it (maybe) answers our follow-up SYNC_REQUEST below -- this
    // keeps a latecomer's own membership out of the race with the sync.
    dispatch(sessionId, { type: "PARTICIPANT_JOINED", sessionId, participant });
    getChannel(sessionId)?.postMessage({ type: "SYNC_REQUEST", sessionId });

    const session = sessions.get(sessionId);
    if (!session) return null;
    return { session, participant };
  },

  startGame(sessionId) {
    dispatch(sessionId, { type: "QUESTION_ADVANCED", sessionId, index: 0 });
  },

  submitAnswer(sessionId, participantId, questionId, optionId, responseTimeMs) {
    const session = sessions.get(sessionId);
    if (!session) return;
    const quiz = getQuizById(session.quizId);
    const question = quiz?.questions.find((q) => q.id === questionId);
    const option = question?.options.find((o) => o.id === optionId);
    const correct = option?.correct ?? false;
    const pointsAwarded = question ? computePoints(question.timeLimitSec, responseTimeMs, correct) : 0;
    const answer: AnswerRecord = { participantId, questionId, optionId, responseTimeMs, correct, pointsAwarded };
    dispatch(sessionId, { type: "ANSWER_SUBMITTED", sessionId, answer });
  },

  showResults(sessionId) {
    dispatch(sessionId, { type: "PHASE_CHANGED", sessionId, phase: "results" });
  },

  showLeaderboard(sessionId) {
    dispatch(sessionId, { type: "PHASE_CHANGED", sessionId, phase: "leaderboard" });
  },

  nextQuestion(sessionId) {
    const session = sessions.get(sessionId);
    if (!session) return;
    const quiz = getQuizById(session.quizId);
    const nextIndex = session.currentQuestionIndex + 1;
    if (quiz && nextIndex < quiz.questions.length) {
      dispatch(sessionId, { type: "QUESTION_ADVANCED", sessionId, index: nextIndex });
    } else {
      dispatch(sessionId, { type: "GAME_ENDED", sessionId });
    }
  },

  endGame(sessionId) {
    dispatch(sessionId, { type: "GAME_ENDED", sessionId });
  },

  getSession(sessionId) {
    return sessions.get(sessionId);
  },

  getPhase(sessionId) {
    return sessions.get(sessionId)?.phase;
  },
};
