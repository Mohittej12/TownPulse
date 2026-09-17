"use client";

import { useState } from "react";
import { QuestionEditor } from "@/components/builder/QuestionEditor";
import { createBlankQuiz } from "@/lib/services/quizService";

export default function NewQuizPage() {
  const [quiz] = useState(() => createBlankQuiz());

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">New quiz</h1>
          <p className="text-sm text-ink-soft">Add your title, questions, time limits, and correct answers.</p>
        </div>
        <QuestionEditor initialQuiz={quiz} />
      </div>
    </main>
  );
}
