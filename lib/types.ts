export type OptionColor = "red" | "blue" | "yellow" | "green";

export interface QuizOption {
  id: string;
  text: string;
  color: OptionColor;
  correct: boolean;
}

export interface QuizQuestion {
  id: string;
  title: string;
  timeLimitSec: 10 | 20 | 30;
  options: QuizOption[];
}

export type QuizStatus = "draft" | "live" | "archived";

export interface Quiz {
  id: string;
  title: string;
  status: QuizStatus;
  questions: QuizQuestion[];
  createdAt: string;
  lastRunAt?: string;
}

export interface Participant {
  id: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  joinedAt: number;
}

export type SessionPhase =
  | "lobby"
  | "question"
  | "results"
  | "leaderboard"
  | "podium";

export interface AnswerRecord {
  participantId: string;
  questionId: string;
  optionId: string;
  responseTimeMs: number;
  correct: boolean;
  pointsAwarded: number;
}

export interface GameSession {
  id: string;
  pin: string;
  quizId: string;
  phase: SessionPhase;
  currentQuestionIndex: number;
  participants: Participant[];
  answers: AnswerRecord[];
  questionStartedAt: number | null;
}

export interface LeaderboardEntry {
  participant: Participant;
  rank: number;
  previousRank: number | null;
}
