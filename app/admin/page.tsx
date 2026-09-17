"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Edit3, Play, AlertCircle } from "lucide-react";
import { Badge, Card, TactileButton } from "@/components/ui/primitives";
import { getQuizzes, deleteQuiz } from "@/lib/services/quizService";
import { supabaseSessionService } from "@/lib/services/supabaseSessionService";
import { useQuizGame } from "@/context/QuizGameContext";
import type { Quiz, QuizStatus } from "@/lib/types";

const STATUS_LABEL: Record<QuizStatus, string> = { live: "Live", draft: "Draft", archived: "Archived" };

export default function AdminDashboardPage() {
  const router = useRouter();
  const { setHostSession } = useQuizGame();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteQuiz, setConfirmDeleteQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    let mounted = true;
    getQuizzes().then((list) => {
      if (mounted) {
        setQuizzes(list);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  function handleLaunch(quizId: string) {
    const quiz = quizzes.find((q) => q.id === quizId);
    if (!quiz) return;
    const session = supabaseSessionService.createSession(quiz);
    setHostSession(session.id);
    router.push(`/host/${session.id}`);
  }

  async function handleDeleteConfirm() {
    if (!confirmDeleteQuiz) return;
    const quizId = confirmDeleteQuiz.id;
    setDeletingId(quizId);
    setConfirmDeleteQuiz(null);

    // Optimistically remove from state
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));

    try {
      await deleteQuiz(quizId);
    } catch (err) {
      console.error("Failed to delete quiz:", err);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen px-4 py-10 bg-slate-50">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Your townhalls</h1>
            <p className="text-sm text-ink-soft">Create, manage, and launch quizzes for your live room.</p>
          </div>
          <Link href="/admin/quiz/new">
            <TactileButton className="flex items-center gap-1.5 shadow-md">
              <Plus size={16} aria-hidden="true" /> New quiz
            </TactileButton>
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-12 flex items-center justify-center col-span-2 text-ink-soft text-sm font-medium">
              Loading your townhalls...
            </Card>
          </div>
        ) : quizzes.length === 0 ? (
          <Card className="p-12 flex flex-col items-center justify-center text-center gap-3 bg-white shadow-sm border border-brand-tint">
            <div className="w-12 h-12 rounded-full bg-brand-tint flex items-center justify-center text-xl">
              ✨
            </div>
            <p className="text-ink font-bold text-base">No quizzes found</p>
            <p className="text-sm text-ink-soft max-w-sm">
              Create your first interactive quiz with questions, time limits, and correct answers.
            </p>
            <Link href="/admin/quiz/new" className="mt-2">
              <TactileButton className="shadow-md">Create a quiz</TactileButton>
            </Link>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {quizzes.map((quiz) => (
              <Card
                key={quiz.id}
                className="p-5 flex flex-col justify-between gap-3 bg-white shadow-sm border border-brand-tint hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <Badge tone={quiz.status}>{STATUS_LABEL[quiz.status]}</Badge>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteQuiz(quiz)}
                      disabled={deletingId === quiz.id}
                      className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Delete quiz"
                      aria-label={`Delete ${quiz.title}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h2 className="font-display font-bold text-ink text-base line-clamp-2 leading-snug">
                    {quiz.title}
                  </h2>
                  <p className="text-xs text-ink-soft">
                    {quiz.questions.length} question{quiz.questions.length > 1 ? "s" : ""}
                    {quiz.lastRunAt
                      ? ` · last run ${new Date(quiz.lastRunAt).toLocaleDateString()}`
                      : " · never run"}
                  </p>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 mt-1">
                  <Link href={`/admin/quiz/${quiz.id}/edit`} className="flex-1">
                    <TactileButton variant="white" className="w-full text-xs font-bold flex items-center justify-center gap-1.5">
                      <Edit3 size={14} /> Edit
                    </TactileButton>
                  </Link>
                  <TactileButton
                    className="flex-1 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
                    onClick={() => handleLaunch(quiz.id)}
                  >
                    <Play size={14} className="fill-current" /> Launch session
                  </TactileButton>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {confirmDeleteQuiz && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="font-display font-bold text-lg text-ink">Delete Quiz?</h3>
              <p className="text-xs text-ink-soft leading-relaxed">
                Are you sure you want to delete <strong className="text-ink">"{confirmDeleteQuiz.title}"</strong>? This will permanently remove the quiz and its questions.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <TactileButton
                variant="white"
                type="button"
                className="text-xs font-bold flex-1"
                onClick={() => setConfirmDeleteQuiz(null)}
              >
                Cancel
              </TactileButton>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Delete Quiz
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
