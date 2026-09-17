"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { TactileButton, Card } from "@/components/ui/primitives";
import { saveQuiz } from "@/lib/services/quizService";
import type { OptionColor, Quiz, QuizOption, QuizQuestion } from "@/lib/types";

import { generateUuid } from "@/lib/uuid";

const COLOR_ORDER: OptionColor[] = ["red", "blue", "yellow", "green"];
const COLOR_DOT: Record<OptionColor, string> = {
  red: "bg-option-red",
  blue: "bg-option-blue",
  yellow: "bg-option-yellow",
  green: "bg-option-green",
};

interface QuestionEditorProps {
  initialQuiz: Quiz;
}

export function QuestionEditor({ initialQuiz }: QuestionEditorProps) {
  const router = useRouter();
  const [quiz, setQuiz] = useState<Quiz>(initialQuiz);
  const [activeIndex, setActiveIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const activeQuestion = quiz.questions[activeIndex];

  function updateQuestion(updated: QuizQuestion) {
    setQuiz((prev) => ({
      ...prev,
      questions: prev.questions.map((q, i) => (i === activeIndex ? updated : q)),
    }));
  }

  function updateOptionText(optionId: string, text: string) {
    updateQuestion({
      ...activeQuestion,
      options: activeQuestion.options.map((o) => (o.id === optionId ? { ...o, text } : o)),
    });
  }

  function setCorrect(optionId: string) {
    updateQuestion({
      ...activeQuestion,
      options: activeQuestion.options.map((o) => ({ ...o, correct: o.id === optionId })),
    });
  }

  function addQuestion() {
    const qId = generateUuid();
    const newQuestion: QuizQuestion = {
      id: qId,
      title: "New question",
      timeLimitSec: 20,
      options: COLOR_ORDER.map((color, i) => ({
        id: generateUuid(),
        text: `Option ${String.fromCharCode(65 + i)}`,
        color,
        correct: i === 0,
      })) as QuizOption[],
    };
    setQuiz((prev) => ({ ...prev, questions: [...prev.questions, newQuestion] }));
    setActiveIndex(quiz.questions.length);
  }

  function removeQuestion(index: number) {
    if (quiz.questions.length <= 1) return;
    setQuiz((prev) => ({ ...prev, questions: prev.questions.filter((_, i) => i !== index) }));
    setActiveIndex((prev) => {
      if (prev === index) return Math.max(0, index - 1);
      return prev > index ? prev - 1 : prev;
    });
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= quiz.questions.length) return;
    setQuiz((prev) => {
      const next = [...prev.questions];
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return { ...prev, questions: next };
    });
    setActiveIndex(target);
  }

  async function handleSave() {
    setSaving(true);
    await saveQuiz(quiz);
    router.push("/admin");
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-ink-soft">Quiz title</span>
          <input
            value={quiz.title}
            onChange={(e) => setQuiz((prev) => ({ ...prev, title: e.target.value }))}
            className="rounded-xl border border-brand-tint bg-canvas px-3 py-2.5 text-sm font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </label>

        {activeQuestion && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-soft">Question {activeIndex + 1}</span>
              <input
                value={activeQuestion.title}
                onChange={(e) => updateQuestion({ ...activeQuestion, title: e.target.value })}
                className="rounded-xl border border-brand-tint bg-canvas px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-soft">Time limit for this question</span>
              <div className="flex gap-2">
                {([10, 20, 30] as const).map((seconds) => (
                  <button
                    key={seconds}
                    type="button"
                    onClick={() => updateQuestion({ ...activeQuestion, timeLimitSec: seconds })}
                    className={clsx(
                      "flex-1 rounded-xl border px-3 py-2 text-sm font-semibold",
                      activeQuestion.timeLimitSec === seconds
                        ? "bg-brand-tint border-brand text-brand-deep"
                        : "bg-canvas border-brand-tint text-ink-soft"
                    )}
                  >
                    {seconds}s
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-soft">Answer options (tap the circle to mark correct)</span>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {activeQuestion.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center gap-2 border border-brand-tint rounded-xl bg-canvas px-3 py-2"
                  >
                    <span className={clsx("w-3.5 h-3.5 rounded-[4px] flex-none", COLOR_DOT[option.color])} />
                    <input
                      value={option.text}
                      onChange={(e) => updateOptionText(option.id, e.target.value)}
                      className="flex-1 bg-transparent text-sm text-ink focus:outline-none min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => setCorrect(option.id)}
                      aria-label={option.correct ? `${option.text} is marked correct` : `Mark ${option.text} as correct`}
                      className={clsx(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-none",
                        option.correct ? "bg-brand border-brand-dark text-white" : "border-ink-faint text-transparent"
                      )}
                    >
                      <Check size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-ink-soft px-1">Questions in this quiz</span>
        {quiz.questions.map((q, index) => (
          <div
            key={q.id}
            className={clsx(
              "flex items-center gap-2 border rounded-xl px-3 py-2.5 bg-white",
              index === activeIndex ? "border-brand" : "border-brand-tint"
            )}
          >
            <button type="button" onClick={() => setActiveIndex(index)} className="flex-1 flex items-center gap-2 text-left min-w-0">
              <span className="font-display font-semibold text-brand-deep w-5 text-sm flex-none">{index + 1}</span>
              <span className="text-sm text-ink truncate">{q.title}</span>
            </button>
            <span className="text-xs text-ink-soft flex-none">{q.timeLimitSec}s</span>
            <button
              type="button"
              onClick={() => moveQuestion(index, -1)}
              disabled={index === 0}
              className="p-1 text-ink-soft disabled:opacity-30"
              aria-label="Move question up"
            >
              <ChevronUp size={16} />
            </button>
            <button
              type="button"
              onClick={() => moveQuestion(index, 1)}
              disabled={index === quiz.questions.length - 1}
              className="p-1 text-ink-soft disabled:opacity-30"
              aria-label="Move question down"
            >
              <ChevronDown size={16} />
            </button>
            <button
              type="button"
              onClick={() => removeQuestion(index)}
              disabled={quiz.questions.length <= 1}
              className="p-1 text-option-red-border disabled:opacity-30"
              aria-label="Delete question"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addQuestion}
          className="flex items-center justify-center gap-1.5 border border-dashed border-brand-dark/40 text-brand-deep rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-brand-tint/40"
        >
          <Plus size={16} /> Add question
        </button>
      </div>

      <div className="flex justify-end gap-2">
        <TactileButton variant="ghost" type="button" onClick={() => router.push("/admin")} disabled={saving}>
          Cancel
        </TactileButton>
        <TactileButton type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save quiz"}
        </TactileButton>
      </div>
    </div>
  );
}
