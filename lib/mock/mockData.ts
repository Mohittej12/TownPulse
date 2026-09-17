import type { Quiz, QuizOption, QuizQuestion } from "@/lib/types";
import { generateUuid } from "@/lib/uuid";

/**
 * In-memory quiz catalog. This stands in for a `quizzes` / `questions` table
 * in Supabase. Every function below is written so that swapping the body
 * for a Supabase query (see README) does not change any call site.
 */

function opt(
  id: string,
  text: string,
  color: QuizOption["color"],
  correct: boolean
): QuizOption {
  return { id, text, color, correct };
}

function question(
  id: string,
  title: string,
  timeLimitSec: QuizQuestion["timeLimitSec"],
  options: QuizOption[]
): QuizQuestion {
  return { id, title, timeLimitSec, options };
}

const pulseCheckQuestions: QuizQuestion[] = [
  question("pc-1", "What should be our top engineering priority next quarter?", 20, [
    opt("pc-1-a", "Performance", "red", false),
    opt("pc-1-b", "Reliability", "blue", false),
    opt("pc-1-c", "New features", "yellow", false),
    opt("pc-1-d", "Developer experience", "green", true),
  ]),
  question("pc-2", "Which team ritual delivered the most value last quarter?", 20, [
    opt("pc-2-a", "Daily standup", "red", false),
    opt("pc-2-b", "Sprint retro", "blue", true),
    opt("pc-2-c", "Pair programming", "yellow", false),
    opt("pc-2-d", "Async design review", "green", false),
  ]),
  question("pc-3", "How many new engineers joined the org this quarter?", 10, [
    opt("pc-3-a", "6", "red", false),
    opt("pc-3-b", "12", "blue", false),
    opt("pc-3-c", "18", "yellow", true),
    opt("pc-3-d", "24", "green", false),
  ]),
  question("pc-4", "Which city will host our next engineering offsite?", 10, [
    opt("pc-4-a", "Austin", "red", false),
    opt("pc-4-b", "Lisbon", "blue", true),
    opt("pc-4-c", "Bengaluru", "yellow", false),
    opt("pc-4-d", "Toronto", "green", false),
  ]),
  question("pc-5", "What's our current customer NPS score?", 20, [
    opt("pc-5-a", "32", "red", false),
    opt("pc-5-b", "41", "blue", false),
    opt("pc-5-c", "58", "yellow", true),
    opt("pc-5-d", "67", "green", false),
  ]),
  question("pc-6", "Which product area is getting the biggest headcount increase?", 20, [
    opt("pc-6-a", "Platform", "red", false),
    opt("pc-6-b", "Mobile", "blue", false),
    opt("pc-6-c", "Data & AI", "yellow", true),
    opt("pc-6-d", "Security", "green", false),
  ]),
  question("pc-7", "How clear are our current OKRs, on average?", 20, [
    opt("pc-7-a", "Not clear", "red", false),
    opt("pc-7-b", "Mostly clear", "blue", true),
    opt("pc-7-c", "Somewhat unclear", "yellow", false),
    opt("pc-7-d", "Very clear", "green", false),
  ]),
  question("pc-8", "What's the theme of next quarter's hack week?", 30, [
    opt("pc-8-a", "Developer tooling", "red", false),
    opt("pc-8-b", "Customer delight", "blue", false),
    opt("pc-8-c", "Sustainability", "yellow", false),
    opt("pc-8-d", "Open innovation", "green", true),
  ]),
];

const onboardingQuestions: QuizQuestion[] = [
  question("ob-1", "Which day is week-one IT setup scheduled?", 10, [
    opt("ob-1-a", "Monday", "red", false),
    opt("ob-1-b", "Tuesday", "blue", true),
    opt("ob-1-c", "Wednesday", "yellow", false),
    opt("ob-1-d", "Thursday", "green", false),
  ]),
  question("ob-2", "Who assigns your onboarding buddy?", 10, [
    opt("ob-2-a", "Your manager", "red", false),
    opt("ob-2-b", "HR business partner", "blue", false),
    opt("ob-2-c", "Team lead", "yellow", true),
    opt("ob-2-d", "Random draw", "green", false),
  ]),
  question("ob-3", "Where do you submit expense reports?", 10, [
    opt("ob-3-a", "Email", "red", false),
    opt("ob-3-b", "Slack", "blue", false),
    opt("ob-3-c", "Expensify", "yellow", true),
    opt("ob-3-d", "Notion", "green", false),
  ]),
  question("ob-4", "How many paid volunteer days do employees get per year?", 20, [
    opt("ob-4-a", "1", "red", false),
    opt("ob-4-b", "2", "blue", false),
    opt("ob-4-c", "3", "yellow", true),
    opt("ob-4-d", "5", "green", false),
  ]),
  question("ob-5", "Which channel posts company-wide announcements?", 10, [
    opt("ob-5-a", "#general", "red", false),
    opt("ob-5-b", "#announcements", "blue", true),
    opt("ob-5-c", "#random", "yellow", false),
    opt("ob-5-d", "#town-hall", "green", false),
  ]),
];

const guildRetroQuestions: QuizQuestion[] = [
  question("gr-1", "Which guild met most often last quarter?", 10, [
    opt("gr-1-a", "Frontend", "red", false),
    opt("gr-1-b", "Backend", "blue", false),
    opt("gr-1-c", "Data", "yellow", false),
    opt("gr-1-d", "SRE", "green", true),
  ]),
  question("gr-2", "What was the top blocker raised in retros?", 20, [
    opt("gr-2-a", "Flaky tests", "red", false),
    opt("gr-2-b", "Slow CI", "blue", true),
    opt("gr-2-c", "Unclear specs", "yellow", false),
    opt("gr-2-d", "On-call load", "green", false),
  ]),
  question("gr-3", "Which tool did the guild pilot for code review?", 10, [
    opt("gr-3-a", "Graphite", "red", true),
    opt("gr-3-b", "CodeRabbit", "blue", false),
    opt("gr-3-c", "Greptile", "yellow", false),
    opt("gr-3-d", "Sourcegraph", "green", false),
  ]),
  question("gr-4", "How many RFCs shipped this quarter?", 20, [
    opt("gr-4-a", "4", "red", false),
    opt("gr-4-b", "7", "blue", false),
    opt("gr-4-c", "11", "yellow", true),
    opt("gr-4-d", "15", "green", false),
  ]),
  question("gr-5", "Which delivery metric improved the most?", 20, [
    opt("gr-5-a", "Deploy frequency", "red", false),
    opt("gr-5-b", "Lead time", "blue", true),
    opt("gr-5-c", "MTTR", "yellow", false),
    opt("gr-5-d", "Change fail rate", "green", false),
  ]),
  question("gr-6", "What's the guild's focus for next quarter?", 30, [
    opt("gr-6-a", "Test coverage", "red", false),
    opt("gr-6-b", "Docs", "blue", false),
    opt("gr-6-c", "Incident response", "yellow", false),
    opt("gr-6-d", "Dev environments", "green", true),
  ]),
];

let quizzes: Quiz[] = [
  {
    id: "quiz-pulse-check",
    title: "Q3 all-hands pulse check",
    status: "live",
    questions: pulseCheckQuestions,
    createdAt: "2026-07-02T09:00:00.000Z",
    lastRunAt: "2026-09-17T09:00:00.000Z",
  },
  {
    id: "quiz-onboarding",
    title: "New hire onboarding check-in",
    status: "draft",
    questions: onboardingQuestions,
    createdAt: "2026-08-20T09:00:00.000Z",
  },
  {
    id: "quiz-guild-retro",
    title: "Eng guild retro",
    status: "archived",
    questions: guildRetroQuestions,
    createdAt: "2026-05-10T09:00:00.000Z",
    lastRunAt: "2026-08-12T09:00:00.000Z",
  },
];

export function getQuizzes(): Quiz[] {
  return quizzes;
}

export function getQuizById(id: string): Quiz | undefined {
  return quizzes.find((q) => q.id === id);
}

export function saveQuiz(quiz: Quiz): void {
  const index = quizzes.findIndex((q) => q.id === quiz.id);
  if (index === -1) {
    quizzes = [...quizzes, quiz];
  } else {
    quizzes = quizzes.map((q, i) => (i === index ? quiz : q));
  }
}

export function createBlankQuiz(): Quiz {
  const id = generateUuid();
  const q1Id = generateUuid();
  return {
    id,
    title: "Untitled townhall quiz",
    status: "draft",
    createdAt: new Date().toISOString(),
    questions: [
      question(q1Id, "Your first question goes here", 20, [
        opt(generateUuid(), "Option A", "red", true),
        opt(generateUuid(), "Option B", "blue", false),
        opt(generateUuid(), "Option C", "yellow", false),
        opt(generateUuid(), "Option D", "green", false),
      ]),
    ],
  };
}

export function deleteQuiz(id: string): void {
  quizzes = quizzes.filter((q) => q.id !== id);
}
