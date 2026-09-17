import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import type { Quiz, QuizOption, QuizQuestion, QuizStatus } from "@/lib/types";
import {
  getQuizzes as getMockQuizzes,
  getQuizById as getMockQuizById,
  saveQuiz as saveMockQuiz,
  deleteQuiz as deleteMockQuiz,
} from "@/lib/mock/mockData";
import { generateUuid, ensureValidUuid } from "@/lib/uuid";

interface DbOption {
  id: string;
  question_id: string;
  text: string;
  color: QuizOption["color"];
  is_correct: boolean;
}

interface DbQuestion {
  id: string;
  quiz_id: string;
  position: number;
  title: string;
  time_limit_sec: QuizQuestion["timeLimitSec"];
  options: DbOption[];
}

interface DbQuiz {
  id: string;
  title: string;
  status: QuizStatus;
  created_at: string;
  last_run_at: string | null;
  questions: DbQuestion[];
}

export function createBlankQuiz(): Quiz {
  const quizId = generateUuid();
  const q1Id = generateUuid();
  return {
    id: quizId,
    title: "Untitled townhall quiz",
    status: "draft",
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: q1Id,
        title: "Your first question goes here",
        timeLimitSec: 20,
        options: [
          { id: generateUuid(), text: "Option A", color: "red", correct: true },
          { id: generateUuid(), text: "Option B", color: "blue", correct: false },
          { id: generateUuid(), text: "Option C", color: "yellow", correct: false },
          { id: generateUuid(), text: "Option D", color: "green", correct: false },
        ],
      },
    ],
  };
}

function mapDbQuizToQuiz(db: DbQuiz): Quiz {
  const sortedQuestions = (db.questions || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((q) => ({
      id: q.id,
      title: q.title,
      timeLimitSec: q.time_limit_sec,
      options: (q.options || []).map((opt) => ({
        id: opt.id,
        text: opt.text,
        color: opt.color,
        correct: opt.is_correct,
      })),
    }));

  return {
    id: db.id,
    title: db.title,
    status: db.status,
    createdAt: db.created_at,
    lastRunAt: db.last_run_at || undefined,
    questions: sortedQuestions,
  };
}

/**
 * Fetch all quizzes from Supabase (or fallback to mock data).
 */
export async function getQuizzes(): Promise<Quiz[]> {
  if (!isSupabaseConfigured()) {
    return getMockQuizzes();
  }

  try {
    const { data, error } = await supabase
      .from("quizzes")
      .select(`
        id,
        title,
        status,
        created_at,
        last_run_at,
        questions (
          id,
          quiz_id,
          position,
          title,
          time_limit_sec,
          options (
            id,
            question_id,
            text,
            color,
            is_correct
          )
        )
      `)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.warn("Error fetching quizzes from Supabase, falling back to mock:", error);
      return getMockQuizzes();
    }

    return (data as unknown as DbQuiz[]).map(mapDbQuizToQuiz);
  } catch (err) {
    console.error("Exception fetching quizzes:", err);
    return getMockQuizzes();
  }
}

/**
 * Fetch a single quiz by ID.
 */
export async function getQuizById(id: string): Promise<Quiz | undefined> {
  if (!isSupabaseConfigured()) {
    return getMockQuizById(id);
  }

  try {
    const { data, error } = await supabase
      .from("quizzes")
      .select(`
        id,
        title,
        status,
        created_at,
        last_run_at,
        questions (
          id,
          quiz_id,
          position,
          title,
          time_limit_sec,
          options (
            id,
            question_id,
            text,
            color,
            is_correct
          )
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return getMockQuizById(id);
    }

    return mapDbQuizToQuiz(data as unknown as DbQuiz);
  } catch (err) {
    console.error("Exception fetching quiz by ID:", err);
    return getMockQuizById(id);
  }
}

/**
 * Save / update a full quiz including questions and options.
 */
export async function saveQuiz(quiz: Quiz): Promise<Quiz> {
  // Ensure all IDs are valid UUIDs for PostgreSQL
  const sanitizedQuizId = ensureValidUuid(quiz.id);
  const sanitizedQuiz: Quiz = {
    ...quiz,
    id: sanitizedQuizId,
    questions: (quiz.questions || []).map((q) => {
      const qId = ensureValidUuid(q.id);
      return {
        ...q,
        id: qId,
        options: (q.options || []).map((opt) => ({
          ...opt,
          id: ensureValidUuid(opt.id),
        })),
      };
    }),
  };

  if (!isSupabaseConfigured()) {
    saveMockQuiz(sanitizedQuiz);
    return sanitizedQuiz;
  }

  try {
    // 1. Upsert Quiz
    const { error: quizError } = await supabase.from("quizzes").upsert({
      id: sanitizedQuiz.id,
      title: sanitizedQuiz.title,
      status: sanitizedQuiz.status,
      created_at: sanitizedQuiz.createdAt,
      last_run_at: sanitizedQuiz.lastRunAt || null,
    });

    if (quizError) {
      console.error("Error upserting quiz row in Supabase:", quizError);
      throw quizError;
    }

    // 2. Delete existing questions (cascade will remove old options)
    await supabase.from("questions").delete().eq("quiz_id", sanitizedQuiz.id);

    // 3. Insert questions and options
    for (let i = 0; i < sanitizedQuiz.questions.length; i++) {
      const q = sanitizedQuiz.questions[i];
      const { error: qError } = await supabase.from("questions").insert({
        id: q.id,
        quiz_id: sanitizedQuiz.id,
        position: i + 1,
        title: q.title,
        time_limit_sec: q.timeLimitSec,
      });

      if (qError) {
        console.error("Error inserting question row:", qError);
        throw qError;
      }

      if (q.options && q.options.length > 0) {
        const optionRows = q.options.map((opt) => ({
          id: opt.id,
          question_id: q.id,
          text: opt.text,
          color: opt.color,
          is_correct: opt.correct,
        }));

        const { error: optError } = await supabase.from("options").insert(optionRows);
        if (optError) {
          console.error("Error inserting options:", optError);
          throw optError;
        }
      }
    }

    // Also update mock cache so it's consistent everywhere
    saveMockQuiz(sanitizedQuiz);
    return sanitizedQuiz;
  } catch (err) {
    console.error("Failed to save quiz to Supabase:", err);
    saveMockQuiz(sanitizedQuiz);
    return sanitizedQuiz;
  }
}

/**
 * Delete a quiz by ID from database and mock storage.
 */
export async function deleteQuiz(id: string): Promise<void> {
  deleteMockQuiz(id);
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete quiz from Supabase:", error);
    }
  } catch (err) {
    console.error("Failed to delete quiz:", err);
  }
}
