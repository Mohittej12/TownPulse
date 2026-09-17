import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type {
  AnswerRecord,
  GameSession,
  Participant,
  Quiz,
  SessionPhase,
} from "@/lib/types";
import { getQuizById, saveQuiz } from "@/lib/services/quizService";
import { computePoints, generatePin } from "@/lib/scoring";
import type {
  SessionService,
  SessionServiceEvents,
  Unsubscribe,
} from "./sessionService";
import { mockSessionService } from "./mockSessionService";

const sessionCache = new Map<string, GameSession>();
const quizCache = new Map<string, Quiz>();
const listeners = new Map<string, Set<SessionServiceEvents>>();

function newUuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `tp-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function notifySessionUpdated(sessionId: string, session: GameSession) {
  sessionCache.set(sessionId, session);
  const subs = listeners.get(sessionId);
  if (!subs) return;
  for (const s of subs) {
    try {
      s.onSessionUpdated?.(session);
    } catch (e) {
      console.error("Error in onSessionUpdated listener:", e);
    }
  }
}

function notifyParticipantJoined(
  sessionId: string,
  participant: Participant,
  session: GameSession
) {
  const subs = listeners.get(sessionId);
  if (!subs) return;
  for (const s of subs) {
    try {
      s.onParticipantJoined?.(participant, session);
    } catch (e) {
      console.error("Error in onParticipantJoined listener:", e);
    }
  }
}

function notifyAnswerSubmitted(
  sessionId: string,
  answer: AnswerRecord,
  session: GameSession
) {
  const subs = listeners.get(sessionId);
  if (!subs) return;
  for (const s of subs) {
    try {
      s.onAnswerSubmitted?.(answer, session);
    } catch (e) {
      console.error("Error in onAnswerSubmitted listener:", e);
    }
  }
}

/**
 * Fetch full session snapshot from Supabase and cache it.
 */
async function fetchFullSession(sessionId: string): Promise<GameSession | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data: sessionRow, error: sessionErr } = await supabase
      .from("sessions")
      .select("*")
      .eq("id", sessionId)
      .single();

    if (sessionErr || !sessionRow) return null;

    const [participantsRes, answersRes] = await Promise.all([
      supabase
        .from("participants")
        .select("*")
        .eq("session_id", sessionId)
        .order("joined_at", { ascending: true }),
      supabase
        .from("responses")
        .select("*")
        .eq("session_id", sessionId),
    ]);

    const participants: Participant[] = (participantsRes.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score ?? 0,
      streak: p.streak ?? 0,
      joinedAt: new Date(p.joined_at).getTime(),
    }));

    const answers: AnswerRecord[] = (answersRes.data || []).map((a: any) => ({
      participantId: a.participant_id,
      questionId: a.question_id,
      optionId: a.option_id,
      responseTimeMs: a.response_time_ms,
      correct: a.correct,
      pointsAwarded: a.points_awarded,
    }));

    const session: GameSession = {
      id: sessionRow.id,
      pin: sessionRow.pin,
      quizId: sessionRow.quiz_id,
      phase: sessionRow.phase as SessionPhase,
      currentQuestionIndex: sessionRow.current_question_index ?? 0,
      participants,
      answers,
      questionStartedAt: sessionRow.question_started_at
        ? new Date(sessionRow.question_started_at).getTime()
        : null,
    };

    sessionCache.set(sessionId, session);
    return session;
  } catch (err) {
    console.error("Error fetching session from Supabase:", err);
    return null;
  }
}

export const supabaseSessionService: SessionService = {
  createSession(quiz: Quiz): GameSession {
    if (!isSupabaseConfigured()) {
      return mockSessionService.createSession(quiz);
    }

    const sessionId = newUuid();
    const pin = generatePin();

    const session: GameSession = {
      id: sessionId,
      pin,
      quizId: quiz.id,
      phase: "lobby",
      currentQuestionIndex: 0,
      participants: [],
      answers: [],
      questionStartedAt: null,
    };

    // Cache locally immediately so UI can route synchronously
    sessionCache.set(sessionId, session);
    quizCache.set(quiz.id, quiz);

    // Persist quiz and session in background
    (async () => {
      try {
        await saveQuiz(quiz);
        await supabase.from("sessions").insert({
          id: sessionId,
          quiz_id: quiz.id,
          pin,
          phase: "lobby",
          current_question_index: 0,
          question_started_at: null,
        });
      } catch (err) {
        console.error("Failed to insert session into Supabase:", err);
      }
    })();

    return session;
  },

  subscribe(sessionId: string, events: SessionServiceEvents): Unsubscribe {
    if (!isSupabaseConfigured()) {
      return mockSessionService.subscribe(sessionId, events);
    }

    let set = listeners.get(sessionId);
    if (!set) {
      set = new Set();
      listeners.set(sessionId, set);
    }
    set.add(events);

    // Initial fetch to populate state
    fetchFullSession(sessionId).then((s) => {
      if (s) notifySessionUpdated(sessionId, s);
    });

    // Subscribe to Supabase Realtime channel
    const channelName = `session_channel_${sessionId}`;
    const channel = supabase
      .channel(channelName)
      // 1. Listen for sessions table changes (phase, question index, start time)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${sessionId}`,
        },
        async () => {
          const fresh = await fetchFullSession(sessionId);
          if (fresh) notifySessionUpdated(sessionId, fresh);
        }
      )
      // 2. Listen for participant joins or score updates
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          const fresh = await fetchFullSession(sessionId);
          if (fresh) {
            if (payload.eventType === "INSERT") {
              const p = payload.new as any;
              const participant: Participant = {
                id: p.id,
                name: p.name,
                avatar: p.avatar,
                score: p.score ?? 0,
                streak: p.streak ?? 0,
                joinedAt: new Date(p.joined_at).getTime(),
              };
              notifyParticipantJoined(sessionId, participant, fresh);
            }
            notifySessionUpdated(sessionId, fresh);
          }
        }
      )
      // 3. Listen for responses submitted
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "responses",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          const fresh = await fetchFullSession(sessionId);
          if (fresh) {
            const a = payload.new as any;
            const answer: AnswerRecord = {
              participantId: a.participant_id,
              questionId: a.question_id,
              optionId: a.option_id,
              responseTimeMs: a.response_time_ms,
              correct: a.correct,
              pointsAwarded: a.points_awarded,
            };
            notifyAnswerSubmitted(sessionId, answer, fresh);
            notifySessionUpdated(sessionId, fresh);
          }
        }
      )
      .subscribe();

    return () => {
      const currentSet = listeners.get(sessionId);
      if (currentSet) {
        currentSet.delete(events);
        if (currentSet.size === 0) {
          listeners.delete(sessionId);
        }
      }
      supabase.removeChannel(channel);
    };
  },

  async join(
    pin: string,
    name: string,
    avatar: string
  ): Promise<{ session: GameSession; participant: Participant } | null> {
    if (!isSupabaseConfigured()) {
      return mockSessionService.join(pin, name, avatar);
    }

    const cleanPin = pin.trim().toUpperCase();

    try {
      const { data: sessionRow, error: sessionErr } = await supabase
        .from("sessions")
        .select("*")
        .eq("pin", cleanPin)
        .single();

      if (sessionErr || !sessionRow) {
        return null;
      }

      const participantId = newUuid();
      const nowIso = new Date().toISOString();

      const { error: partErr } = await supabase.from("participants").insert({
        id: participantId,
        session_id: sessionRow.id,
        name,
        avatar,
        score: 0,
        streak: 0,
        joined_at: nowIso,
      });

      if (partErr) {
        console.error("Error inserting participant:", partErr);
        return null;
      }

      const participant: Participant = {
        id: participantId,
        name,
        avatar,
        score: 0,
        streak: 0,
        joinedAt: new Date(nowIso).getTime(),
      };

      const freshSession = (await fetchFullSession(sessionRow.id)) || {
        id: sessionRow.id,
        pin: sessionRow.pin,
        quizId: sessionRow.quiz_id,
        phase: sessionRow.phase as SessionPhase,
        currentQuestionIndex: sessionRow.current_question_index ?? 0,
        participants: [participant],
        answers: [],
        questionStartedAt: sessionRow.question_started_at
          ? new Date(sessionRow.question_started_at).getTime()
          : null,
      };

      return { session: freshSession, participant };
    } catch (err) {
      console.error("Join error:", err);
      return null;
    }
  },

  async startGame(sessionId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      mockSessionService.startGame(sessionId);
      return;
    }

    const nowIso = new Date().toISOString();
    const existing = sessionCache.get(sessionId);
    if (existing) {
      existing.phase = "question";
      existing.currentQuestionIndex = 0;
      existing.questionStartedAt = new Date(nowIso).getTime();
      notifySessionUpdated(sessionId, { ...existing });
    }

    await supabase
      .from("sessions")
      .update({
        phase: "question",
        current_question_index: 0,
        question_started_at: nowIso,
      })
      .eq("id", sessionId);
  },

  async submitAnswer(
    sessionId: string,
    participantId: string,
    questionId: string,
    optionId: string,
    responseTimeMs: number
  ): Promise<void> {
    if (!isSupabaseConfigured()) {
      mockSessionService.submitAnswer(
        sessionId,
        participantId,
        questionId,
        optionId,
        responseTimeMs
      );
      return;
    }

    try {
      const session = sessionCache.get(sessionId) || (await fetchFullSession(sessionId));
      if (!session) return;

      let quiz = quizCache.get(session.quizId);
      if (!quiz) {
        quiz = await getQuizById(session.quizId);
        if (quiz) quizCache.set(session.quizId, quiz);
      }

      const currentQ =
        quiz?.questions.find((q) => q.id === questionId) ||
        quiz?.questions[session.currentQuestionIndex];
      const selectedOption = currentQ?.options.find((o) => o.id === optionId);
      const isCorrect = selectedOption?.correct ?? false;
      const timeLimit = currentQ?.timeLimitSec ?? 20;
      const points = computePoints(timeLimit, responseTimeMs, isCorrect);

      const answerRecord: AnswerRecord = {
        participantId,
        questionId,
        optionId,
        responseTimeMs,
        correct: isCorrect,
        pointsAwarded: points,
      };

      // Optimistic update
      if (session) {
        session.answers.push(answerRecord);
        const p = session.participants.find((pt) => pt.id === participantId);
        if (p) {
          p.score += points;
          p.streak = isCorrect ? p.streak + 1 : 0;
        }
        notifyAnswerSubmitted(sessionId, answerRecord, session);
        notifySessionUpdated(sessionId, { ...session });
      }

      // Persist to responses table
      await supabase.from("responses").insert({
        session_id: sessionId,
        participant_id: participantId,
        question_id: questionId,
        option_id: optionId,
        response_time_ms: responseTimeMs,
        correct: isCorrect,
        points_awarded: points,
      });

      // Update participant score in Supabase
      const participant = session?.participants.find((pt) => pt.id === participantId);
      if (participant) {
        await supabase
          .from("participants")
          .update({
            score: participant.score,
            streak: participant.streak,
          })
          .eq("id", participantId);
      }
    } catch (err) {
      console.error("Failed to submit answer:", err);
    }
  },

  async showResults(sessionId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      mockSessionService.showResults(sessionId);
      return;
    }

    const existing = sessionCache.get(sessionId);
    if (existing) {
      existing.phase = "results";
      notifySessionUpdated(sessionId, { ...existing });
    }

    await supabase
      .from("sessions")
      .update({ phase: "results" })
      .eq("id", sessionId);
  },

  async showLeaderboard(sessionId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      mockSessionService.showLeaderboard(sessionId);
      return;
    }

    const existing = sessionCache.get(sessionId);
    if (existing) {
      existing.phase = "leaderboard";
      notifySessionUpdated(sessionId, { ...existing });
    }

    await supabase
      .from("sessions")
      .update({ phase: "leaderboard" })
      .eq("id", sessionId);
  },

  async nextQuestion(sessionId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      mockSessionService.nextQuestion(sessionId);
      return;
    }

    const session = sessionCache.get(sessionId) || (await fetchFullSession(sessionId));
    if (!session) return;

    let quiz = quizCache.get(session.quizId);
    if (!quiz) {
      quiz = await getQuizById(session.quizId);
      if (quiz) quizCache.set(session.quizId, quiz);
    }

    const nextIndex = session.currentQuestionIndex + 1;
    const totalQuestions = quiz?.questions.length ?? 0;

    if (nextIndex >= totalQuestions) {
      this.endGame(sessionId);
      return;
    }

    const nowIso = new Date().toISOString();
    session.currentQuestionIndex = nextIndex;
    session.phase = "question";
    session.questionStartedAt = new Date(nowIso).getTime();
    notifySessionUpdated(sessionId, { ...session });

    await supabase
      .from("sessions")
      .update({
        phase: "question",
        current_question_index: nextIndex,
        question_started_at: nowIso,
      })
      .eq("id", sessionId);
  },

  async endGame(sessionId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      mockSessionService.endGame(sessionId);
      return;
    }

    const existing = sessionCache.get(sessionId);
    if (existing) {
      existing.phase = "podium";
      notifySessionUpdated(sessionId, { ...existing });
    }

    await supabase
      .from("sessions")
      .update({ phase: "podium" })
      .eq("id", sessionId);
  },

  getSession(sessionId: string): GameSession | undefined {
    if (!isSupabaseConfigured()) {
      return mockSessionService.getSession(sessionId);
    }
    return sessionCache.get(sessionId);
  },

  getPhase(sessionId: string): SessionPhase | undefined {
    return this.getSession(sessionId)?.phase;
  },
};
