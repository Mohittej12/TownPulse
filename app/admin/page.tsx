"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, Card, TactileButton } from "@/components/ui/primitives";
import { getQuizzes } from "@/lib/services/quizService";
import { supabaseSessionService } from "@/lib/services/supabaseSessionService";
import { useQuizGame } from "@/context/QuizGameContext";
import type { Quiz, QuizStatus } from "@/lib/types";

const STATUS_LABEL: Record<QuizStatus, string> = { live: "Live", draft: "Draft", archived: "Archived" };

export default function AdminDashboardPage() {
  const router = useRouter();
  const { setHostSession } = useQuizGame();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Your townhalls</h1>
            <p className="text-sm text-ink-soft">Create, edit, and launch quizzes for your room.</p>
          </div>
          <Link href="/admin/quiz/new">
            <TactileButton className="flex items-center gap-1.5">
              <Plus size={16} aria-hidden="true" /> New quiz
            </TactileButton>
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-8 flex items-center justify-center col-span-2 text-ink-soft text-sm">
              Loading your townhalls...
            </Card>
          </div>
        ) : quizzes.length === 0 ? (
          <Card className="p-8 flex flex-col items-center justify-center text-center gap-3">
            <p className="text-ink font-semibold">No quizzes found</p>
            <p className="text-sm text-ink-soft">Create your first quiz to get started.</p>
            <Link href="/admin/quiz/new">
              <TactileButton>Create a quiz</TactileButton>
            </Link>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {quizzes.map((quiz) => (
              <Card key={quiz.id} className="p-5 flex flex-col gap-2.5">
                <Badge tone={quiz.status}>{STATUS_LABEL[quiz.status]}</Badge>
                <h2 className="font-display font-semibold text-ink">{quiz.title}</h2>
                <p className="text-sm text-ink-soft">
                  {quiz.questions.length} questions
                  {quiz.lastRunAt ? ` · last run ${new Date(quiz.lastRunAt).toLocaleDateString()}` : " · never run"}
                </p>
                <div className="flex gap-2 mt-1.5">
                  <Link href={`/admin/quiz/${quiz.id}/edit`} className="flex-1">
                    <TactileButton variant="white" className="w-full">
                      Edit
                    </TactileButton>
                  </Link>
                  <TactileButton className="flex-1" onClick={() => handleLaunch(quiz.id)}>
                    Launch session
                  </TactileButton>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
