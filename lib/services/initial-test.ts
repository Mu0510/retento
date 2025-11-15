import { supabaseAdminClient } from "@/lib/supabase-admin";
import { CONFIDENCE_TO_MASTERY, MAX_USER_SCORE, TOTAL_DIFFICULTY_SCORE } from "@/lib/constants";
import { getVocabularyList } from "@/lib/vocabulary-data";
import {
  StoredConfidenceLevel,
  UserWordConfidenceRow,
  fetchConfidenceRowsForWords,
  fetchConfidenceSnapshot,
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

export async function deleteInitialTestResult(userId: string): Promise<void> {
  const { error } = await supabaseAdminClient.from(RESULT_TABLE).delete().eq("user_id", userId);
  if (error) {
    throw new Error(`failed to delete initial test result: ${error.message}`);
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
  const existingAnswerRows = await fetchConfidenceRowsForWords(userId, Array.from(answeredWordIds));
  const answeredRowMap = new Map(existingAnswerRows.map((row) => [row.word_id, row]));
  const vocabularyEntries = getVocabularyList().filter(
    (entry): entry is { id: number; difficulty_score: number } =>
      typeof entry.id === "number" && typeof entry.difficulty_score === "number",
  );
  const vocabularyById = new Map(vocabularyEntries.map((entry) => [entry.id, entry.difficulty_score]));
  const answerRows: UserWordConfidenceRow[] = [];
  const answeredTimestamp = now;
  latestAnswers.forEach((item) => {
    const existingAnswerRow = answeredRowMap.get(item.wordId);
    const priorTimes = typeof existingAnswerRow?.times_answered === "number" ? existingAnswerRow.times_answered : 0;
    answerRows.push({
      user_id: userId,
      word_id: item.wordId,
      confidence: item.confidence,
      last_answered_at: item.timestamp ?? answeredTimestamp,
      auto_marked: false,
      times_answered: priorTimes + 1,
    });
  });

  if (answerRows.length) {
    await upsertConfidenceRows(answerRows);
  }

  const snapshot = await fetchConfidenceSnapshot(userId);
  const rowsMap = new Map(snapshot.rows.map((row) => [row.word_id, row]));

  const masteryFor = (confidence: StoredConfidenceLevel | null | undefined) =>
    CONFIDENCE_TO_MASTERY[confidence ?? "none"] ?? 0;

  let contribution = snapshot.rows.reduce((sum, row) => {
    const difficulty = vocabularyById.get(row.word_id) ?? 0;
    return sum + difficulty * masteryFor(row.confidence);
  }, 0);
  const convertContributionToScore = (value: number) => {
    if (TOTAL_DIFFICULTY_SCORE <= 0) return 0;
    const normalized = (value / TOTAL_DIFFICULTY_SCORE) * MAX_USER_SCORE;
    return clampScore(Number(normalized.toFixed(2)));
  };

  let currentScore = convertContributionToScore(contribution);
  const targetScore = sanitizedScore;
  const perfectThreshold = targetScore * 0.9;
  const autoWordMarks: AutoWordMark[] = [];
  const autoRows: UserWordConfidenceRow[] = [];
  const seenWordIds = new Set<number>(rowsMap.keys());

  const perfectCandidates = vocabularyEntries
    .filter((entry) => entry.difficulty_score <= perfectThreshold && !seenWordIds.has(entry.id))
    .sort((a, b) => a.difficulty_score - b.difficulty_score);

  for (const entry of perfectCandidates) {
    const row: UserWordConfidenceRow = {
      user_id: userId,
      word_id: entry.id,
      confidence: "perfect",
      last_answered_at: now,
      auto_marked: true,
      times_answered: 0,
    };
    rowsMap.set(entry.id, row);
    autoRows.push(row);
    autoWordMarks.push({ wordId: entry.id, confidence: "perfect" });
    seenWordIds.add(entry.id);
    contribution += entry.difficulty_score * (CONFIDENCE_TO_MASTERY.perfect ?? 1);
    currentScore = convertContributionToScore(contribution);
  }

  const remainingCandidates = vocabularyEntries
    .filter((entry) => entry.difficulty_score > perfectThreshold && !seenWordIds.has(entry.id))
    .sort((a, b) => a.difficulty_score - b.difficulty_score);

  for (const entry of remainingCandidates) {
    const mastery = CONFIDENCE_TO_MASTERY.iffy ?? 0.55;
    const addition = entry.difficulty_score * mastery;
    const tentativeContribution = contribution + addition;
    const tentativeScore = convertContributionToScore(tentativeContribution);
    const diffBefore = Math.abs(currentScore - targetScore);
    const diffAfter = Math.abs(tentativeScore - targetScore);
    if (diffAfter > diffBefore || (diffAfter === diffBefore && tentativeScore > targetScore)) {
      break;
    }
    const row: UserWordConfidenceRow = {
      user_id: userId,
      word_id: entry.id,
      confidence: "iffy",
      last_answered_at: now,
      auto_marked: true,
      times_answered: 0,
    };
    rowsMap.set(entry.id, row);
    autoRows.push(row);
    autoWordMarks.push({ wordId: entry.id, confidence: "iffy" });
    seenWordIds.add(entry.id);
    contribution = tentativeContribution;
    currentScore = tentativeScore;
  }

  if (autoRows.length) {
    await upsertConfidenceRows(autoRows);
  }

  const calculatedWordScore = currentScore;

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
