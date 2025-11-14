import { supabaseAdminClient } from "@/lib/supabase-admin";
import { CONFIDENCE_TO_MASTERY, MAX_USER_SCORE, TOTAL_DIFFICULTY_SCORE } from "@/lib/constants";
import { getVocabularyById } from "@/lib/vocabulary-data";

const USER_PROFILES_TABLE = "user_profiles";
const USER_WORD_CONFIDENCE_TABLE = "user_word_confidences";

export type StoredConfidenceLevel = "none" | "forget" | "iffy" | "perfect";

export type UserProfileRow = {
  user_id: string;
  word_score: number | null;
  created_at?: string;
  updated_at?: string;
};

export type UserWordConfidenceRow = {
  user_id: string;
  word_id: number;
  confidence: StoredConfidenceLevel | null;
  times_answered?: number | null;
  next_review_at?: string | null;
  last_answered_at?: string | null;
};

export type ConfidenceSnapshot = {
  profile: UserProfileRow;
  rows: UserWordConfidenceRow[];
};

export async function ensureUserProfile(userId: string): Promise<UserProfileRow> {
  const { data, error } = await supabaseAdminClient
    .from<UserProfileRow>(USER_PROFILES_TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`failed to load user profile: ${error.message}`);
  }

  if (data) {
    return data;
  }

  const insertPayload: UserProfileRow = {
    user_id: userId,
    word_score: 0,
  };

  const { data: inserted, error: insertError } = await supabaseAdminClient
    .from<UserProfileRow>(USER_PROFILES_TABLE)
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "failed to create user profile");
  }

  return inserted;
}

export async function fetchConfidenceSnapshot(userId: string): Promise<ConfidenceSnapshot> {
  const profile = await ensureUserProfile(userId);
  const { data, error } = await supabaseAdminClient
    .from<UserWordConfidenceRow>(USER_WORD_CONFIDENCE_TABLE)
    .select("user_id, word_id, confidence, times_answered, next_review_at, last_answered_at")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`failed to load confidence snapshot: ${error.message}`);
  }

  return { profile, rows: data ?? [] };
}

export function calculateUserScore(rows: UserWordConfidenceRow[]): number {
  if (!rows.length) {
    return 0;
  }
  const vocabularyById = getVocabularyById();
  let contribution = 0;
  for (const row of rows) {
    const entry = vocabularyById.get(row.word_id);
    if (!entry?.difficulty_score) continue;
    const mastery = CONFIDENCE_TO_MASTERY[row.confidence ?? "none"] ?? 0;
    contribution += entry.difficulty_score * mastery;
  }
  if (contribution === 0) {
    return 0;
  }
  const normalized = (contribution / TOTAL_DIFFICULTY_SCORE) * MAX_USER_SCORE;
  return Number(normalized.toFixed(2));
}

export async function upsertUserScore(userId: string, score: number): Promise<void> {
  const payload: Partial<UserProfileRow> = {
    user_id: userId,
    word_score: score,
  };
  const { error } = await supabaseAdminClient
    .from(USER_PROFILES_TABLE)
    .upsert(payload, { onConflict: "user_id" });
  if (error) {
    throw new Error(`failed to update user score: ${error.message}`);
  }
}

export async function selectReviewWordIds(
  userId: string,
  options: { limit?: number; now?: Date } = {},
): Promise<number[]> {
  const limit = options.limit ?? 3;
  const nowIso = (options.now ?? new Date()).toISOString();

  const { data, error } = await supabaseAdminClient
    .from(USER_WORD_CONFIDENCE_TABLE)
    .select("word_id, next_review_at, confidence")
    .eq("user_id", userId)
    .lte("next_review_at", nowIso)
    .order("next_review_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(`failed to select review words: ${error.message}`);
  }

  if (data && data.length > 0) {
    return data.map((row) => row.word_id);
  }

  // fallback: pick words marked as forget
  const { data: fallback } = await supabaseAdminClient
    .from(USER_WORD_CONFIDENCE_TABLE)
    .select("word_id")
    .eq("user_id", userId)
    .eq("confidence", "forget")
    .order("last_answered_at", { ascending: true })
    .limit(limit);

  return fallback?.map((row) => row.word_id) ?? [];
}

export async function getSeenWordIds(userId: string): Promise<Set<number>> {
  const { data, error } = await supabaseAdminClient
    .from(USER_WORD_CONFIDENCE_TABLE)
    .select("word_id")
    .eq("user_id", userId);

  if (error) {
    throw new Error(`failed to load seen word ids: ${error.message}`);
  }

  return new Set((data ?? []).map((row) => row.word_id));
}

export async function upsertConfidenceRows(rows: UserWordConfidenceRow[]): Promise<void> {
  if (!rows.length) return;
  const payload = rows.map((row) => ({
    user_id: row.user_id,
    word_id: row.word_id,
    confidence: row.confidence,
    times_answered: row.times_answered ?? null,
    next_review_at: row.next_review_at ?? null,
    last_answered_at: row.last_answered_at ?? new Date().toISOString(),
  }));

  const { error } = await supabaseAdminClient
    .from(USER_WORD_CONFIDENCE_TABLE)
    .upsert(payload, { onConflict: "user_id,word_id" });

  if (error) {
    throw new Error(`failed to upsert confidence rows: ${error.message}`);
  }
}
