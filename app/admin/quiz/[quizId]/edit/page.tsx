"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QuestionEditor } from "@/components/builder/QuestionEditor";
import { getQuizById } from "@/lib/services/quizService";
import type { Quiz } from "@/lib/types";

export default function EditQuizPage({ params }: { params: { quizId: string } }) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getQuizById(params.quizId).then((q) => {
      if (!q) {
        router.replace("/admin");
      } else {
        setQuiz(q);
      }
      setLoading(false);
    });
  }, [params.quizId, router]);

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="max-w-3xl mx-auto flex items-center justify-center p-12 text-ink-soft">
          Loading quiz...
        </div>
      </main>
    );
  }

  if (!quiz) return null;

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Edit quiz</h1>
          <p className="text-sm text-ink-soft">Update questions, time limits, and correct answers.</p>
        </div>
        <QuestionEditor initialQuiz={quiz} />
      </div>
    </main>
  );
}
