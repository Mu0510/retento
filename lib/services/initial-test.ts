import { supabaseAdminClient } from "@/lib/supabase-admin";
import { CONFIDENCE_TO_MASTERY, MAX_USER_SCORE } from "@/lib/constants";
import { getInitialTestQuestionPool } from "@/lib/initial-test/questions";
import {
  StoredConfidenceLevel,
  UserWordConfidenceRow,
  fetchConfidenceRowsForWords,
  ensurePublicUser,
  upsertConfidenceRows,
  upsertUserScore,
} from "@/lib/services/user-progress";

export type InitialTestChoiceConfidence = "perfect" | "iffy" | "forget";

export type InitialTestAnswerPayload = {
  questionId: number;
  wordId: number;
  selectedAnswer: string | null;
  isCorrect: boolean;
  confidence: StoredConfidenceLevel;
  difficultyScore: number;
  estimatedScore: number;
  timestamp?: string;
};

export type InitialTestProgressPayload = {
  answeredQuestionIds: number[];
  answers: InitialTestAnswerPayload[];
  estimatedScore: number;
};

export type InitialTestResultDetails = {
  answers: InitialTestAnswerPayload[];
  autoWordMarks: AutoWordMark[];
  estimatedScore: number;
  calculatedWordScore: number;
  completedAt: string;
};

export type AutoWordMark = {
  wordId: number;
  confidence: "perfect" | "iffy";
};

export type UserInitialTestResultRow = {
  id: number;
  user_id: string;
  initial_score: number;
  completed_at: string;
  test_details: InitialTestResultDetails;
};

export type UserInitialTestProgressRow = {
  user_id: string;
  progress: InitialTestProgressPayload;
  updated_at: string;
};

const PROGRESS_TABLE = "user_initial_test_progress";
const RESULT_TABLE = "user_initial_test_results";

export async function getInitialTestResult(userId: string): Promise<UserInitialTestResultRow | null> {
  const { data, error } = await supabaseAdminClient
    .from(RESULT_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`failed to load initial test result: ${error.message}`);
  }

  return (data as UserInitialTestResultRow) ?? null;
}

export async function getInitialTestProgress(userId: string): Promise<InitialTestProgressPayload | null> {
  try {
    const { data, error } = await supabaseAdminClient
      .from(PROGRESS_TABLE)
      .select("progress")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data?.progress ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    if (
      message.includes("table \"user_initial_test_progress\"") ||
      message.includes("Could not find the table") ||
      message.includes("schema cache")
    ) {
      console.warn("[InitialTestProgress] table missing, returning null", message);
      return null;
    }
    throw new Error(`failed to load initial test progress: ${message}`);
  }
}

export async function upsertInitialTestProgress(userId: string, progress: InitialTestProgressPayload): Promise<void> {
  await ensurePublicUser(userId);
  const { error } = await supabaseAdminClient.from(PROGRESS_TABLE).upsert({
    user_id: userId,
    progress,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`failed to persist initial test progress: ${error.message}`);
  }
}

export async function deleteInitialTestProgress(userId: string): Promise<void> {
  const { error } = await supabaseAdminClient.from(PROGRESS_TABLE).delete().eq("user_id", userId);
  if (error) {
    throw new Error(`failed to delete initial test progress: ${error.message}`);
  }
}

export async function persistInitialTestResult(
  userId: string,
  finalScore: number,
  answers: InitialTestAnswerPayload[],
): Promise<{
  initialScore: number;
  calculatedWordScore: number;
  autoWordMarks: AutoWordMark[];
}> {
  const sanitizedScore = clampScore(finalScore);
  const now = new Date().toISOString();

  await ensurePublicUser(userId);

  const latestAnswers = dedupeAnswersByWord(answers);
  const answeredWordIds = new Set(latestAnswers.map((item) => item.wordId));
  const answeredScore = latestAnswers.reduce((sum, item) => {
    const mastery = CONFIDENCE_TO_MASTERY[item.confidence] ?? 0;
    return sum + (item.difficultyScore ?? 0) * mastery;
  }, 0);

  const { autoWordMarks, finalScore: calculatedWordScore } = buildAutoWordMarks(
    sanitizedScore,
    answeredWordIds,
    answeredScore,
  );

  const confidenceRows: UserWordConfidenceRow[] = [];
  const answeredTimestamp = now;
  latestAnswers.forEach((item) => {
    confidenceRows.push({
      user_id: userId,
      word_id: item.wordId,
      confidence: item.confidence,
      last_answered_at: item.timestamp ?? answeredTimestamp,
      auto_marked: false,
    });
  });

  const autoWordIds = autoWordMarks.map((mark) => mark.wordId);
  const existingAutoRows = await fetchConfidenceRowsForWords(userId, autoWordIds);
  const existingAutoMap = new Map(existingAutoRows.map((row) => [row.word_id, row]));

  autoWordMarks.forEach((mark) => {
    const existing = existingAutoMap.get(mark.wordId);
    if (existing && existing.auto_marked === false) {
      return;
    }
    confidenceRows.push({
      user_id: userId,
      word_id: mark.wordId,
      confidence: mark.confidence,
      last_answered_at: now,
      auto_marked: true,
    });
  });

  if (confidenceRows.length) {
    await upsertConfidenceRows(confidenceRows);
  }

  const resultDetails: InitialTestResultDetails = {
    answers,
    autoWordMarks,
    estimatedScore: sanitizedScore,
    calculatedWordScore,
    completedAt: now,
  };

  const { error } = await supabaseAdminClient.from(RESULT_TABLE).upsert(
    {
      user_id: userId,
      initial_score: sanitizedScore,
      test_details: resultDetails,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`failed to store initial test result: ${error.message}`);
  }

  await deleteInitialTestProgress(userId);
  await upsertUserScore(userId, sanitizedScore);

  return {
    initialScore: sanitizedScore,
    calculatedWordScore,
    autoWordMarks,
  };
}

function clampScore(value: number): number {
  if (Number.isFinite(value)) {
    return Math.min(Math.max(Math.round(value), 0), MAX_USER_SCORE);
  }
  return 0;
}

function dedupeAnswersByWord(answers: InitialTestAnswerPayload[]): InitialTestAnswerPayload[] {
  const map = new Map<number, InitialTestAnswerPayload>();
  answers.forEach((item) => {
    map.set(item.wordId, item);
  });
  return Array.from(map.values());
}

function buildAutoWordMarks(
  targetScore: number,
  answeredWordIds: Set<number>,
  baseScore: number,
): { autoWordMarks: AutoWordMark[]; finalScore: number } {
  const normalizedScore = clampScore(targetScore);
  const pool = getInitialTestQuestionPool().filter((entry) => !answeredWordIds.has(entry.word_id));
  const perfectThreshold = normalizedScore * 0.8;

  const perfectWords = pool.filter((entry) => entry.difficulty_score <= perfectThreshold);
  const remaining = pool
    .filter((entry) => entry.difficulty_score > perfectThreshold)
    .sort((a, b) => a.difficulty_score - b.difficulty_score);

  let runningScore = baseScore + perfectWords.reduce((sum, entry) => sum + entry.difficulty_score, 0);
  let bestScore = runningScore;
  let bestDiff = Math.abs(normalizedScore - runningScore);
  let bestMicroCount = 0;
  let microCount = 0;
  const microContributions: number[] = [];

  for (const entry of remaining) {
    const increment = entry.difficulty_score * (CONFIDENCE_TO_MASTERY.iffy ?? 0);
    runningScore += increment;
    microCount += 1;
    microContributions.push(increment);
    const diff = Math.abs(normalizedScore - runningScore);

    if (diff < bestDiff || (diff === bestDiff && runningScore < bestScore)) {
      bestDiff = diff;
      bestScore = runningScore;
      bestMicroCount = microCount;
    }

    if (runningScore > normalizedScore && diff > bestDiff) {
      break;
    }
  }

  const microWords = remaining.slice(0, bestMicroCount);
  const autoWordMarks: AutoWordMark[] = [
    ...perfectWords.map((entry) => ({ wordId: entry.word_id, confidence: "perfect" as const })),
    ...microWords.map((entry) => ({ wordId: entry.word_id, confidence: "iffy" as const })),
  ];

  return {
    autoWordMarks,
    finalScore: bestScore,
  };
}
