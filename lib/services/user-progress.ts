import { supabaseAdminClient } from "@/lib/supabase-admin";
import { CONFIDENCE_TO_MASTERY, MAX_USER_SCORE, TOTAL_DIFFICULTY_SCORE } from "@/lib/constants";
import { getVocabularyById } from "@/lib/vocabulary-data";

const USER_PROFILES_TABLE = "user_profiles";
const USER_WORD_CONFIDENCE_TABLE = "user_word_confidences";
const PUBLIC_USERS_TABLE = "users";

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
  auto_marked?: boolean | null;
};

export type ConfidenceSnapshot = {
  profile: UserProfileRow;
  rows: UserWordConfidenceRow[];
};

export async function ensureUserProfile(userId: string): Promise<UserProfileRow> {
  const { data, error } = await supabaseAdminClient
    .from(USER_PROFILES_TABLE)
    .select("user_id, word_score, created_at, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`failed to load user profile: ${error.message}`);
  }

  if (data) {
    return data as UserProfileRow;
  }

  await ensurePublicUser(userId);

  const insertPayload: UserProfileRow = {
    user_id: userId,
    word_score: 0,
  };

  const { data: inserted, error: insertError } = await supabaseAdminClient
    .from(USER_PROFILES_TABLE)
    .insert(insertPayload)
    .select("user_id, word_score, created_at, updated_at")
    .single();

  if (insertError || !inserted) {
    throw new Error(insertError?.message ?? "failed to create user profile");
  }

  return inserted as UserProfileRow;
}

export async function ensurePublicUser(userId: string): Promise<void> {
  try {
    const { data, error } = await supabaseAdminClient
      .from(PUBLIC_USERS_TABLE)
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("[ensurePublicUser] failed to read public users row", error.message);
      return;
    }

    if (data) {
      return;
    }

    let fallbackEmail: string | undefined;
    if (typeof supabaseAdminClient.auth.admin?.getUserById === "function") {
      const { data: authUserResponse, error: authError } = await supabaseAdminClient.auth.admin.getUserById(userId);
      if (authError) {
        console.warn("[ensurePublicUser] failed to load auth user", authError.message);
      } else {
        fallbackEmail = authUserResponse?.user?.email ?? undefined;
      }
    }

    const insertPayload: Record<string, unknown> = { id: userId };
    if (fallbackEmail) {
      insertPayload.email = fallbackEmail;
    }

    const { error: insertError } = await supabaseAdminClient
      .from(PUBLIC_USERS_TABLE)
      .insert(insertPayload);

    if (insertError) {
      console.warn("[ensurePublicUser] failed to create public users row", insertError.message);
    }
  } catch (error) {
    console.warn("[ensurePublicUser] unexpected error", error);
  }
}

const AUTH_METHODS_TABLE = "auth_methods";

export type AuthMethodInput = {
  userId: string;
  provider: string;
  providerUserId: string;
  email?: string | null;
  isPrimary?: boolean;
  metadata?: Record<string, unknown>;
};

export async function registerAuthMethod(input: AuthMethodInput): Promise<void> {
  const { userId, provider, providerUserId, email, isPrimary = false, metadata = {} } = input;
  try {
    const { error } = await supabaseAdminClient
      .from(AUTH_METHODS_TABLE)
      .upsert(
        {
          user_id: userId,
          provider,
          provider_user_id: providerUserId ?? userId,
          email: email ?? undefined,
          is_primary: isPrimary,
          metadata,
        },
        { onConflict: "user_id,provider" },
      );
    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn("[registerAuthMethod] skipped", error instanceof Error ? error.message : error);
  }
}

export async function fetchConfidenceSnapshot(userId: string): Promise<ConfidenceSnapshot> {
  const profile = await ensureUserProfile(userId);
  const PAGE_SIZE = 1000;
  const rows: UserWordConfidenceRow[] = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabaseAdminClient
      .from(USER_WORD_CONFIDENCE_TABLE)
      .select("user_id, word_id, confidence, times_answered, next_review_at, last_answered_at, auto_marked")
      .eq("user_id", userId)
      .range(from, to);

    if (error) {
      throw new Error(`failed to load confidence snapshot: ${error.message}`);
    }

    const batch = (data as UserWordConfidenceRow[]) ?? [];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return { profile, rows };
}

export async function fetchConfidenceRowsForWords(
  userId: string,
  wordIds: number[],
): Promise<UserWordConfidenceRow[]> {
  if (!wordIds.length) return [];
  const MAX_WORD_IDS_PER_QUERY = 256;
  const batches = chunkArray(wordIds, MAX_WORD_IDS_PER_QUERY);
  const rows: UserWordConfidenceRow[] = [];

  for (const batch of batches) {
    const { data, error } = await supabaseAdminClient
      .from(USER_WORD_CONFIDENCE_TABLE)
      .select(
        "word_id, confidence, times_answered, next_review_at, last_answered_at, auto_marked",
      )
      .eq("user_id", userId)
      .in("word_id", batch);

    if (error) {
      throw new Error(`failed to load confidence rows: ${error.message}`);
    }

    rows.push(...((data ?? []) as UserWordConfidenceRow[]));
  }

  return rows;
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
  const normalized = rows.map((row) => ({
    user_id: row.user_id,
    word_id: row.word_id,
    confidence: row.confidence,
    times_answered:
      typeof row.times_answered === "number" ? Math.max(0, Math.floor(row.times_answered)) : 0,
    next_review_at: row.next_review_at ?? null,
    last_answered_at: row.last_answered_at ?? new Date().toISOString(),
    auto_marked: row.auto_marked ?? false,
  }));

  const MAX_BATCH_SIZE = 250;
  const batches = chunkArray(normalized, MAX_BATCH_SIZE);

  for (const batch of batches) {
    const { error } = await supabaseAdminClient
      .from(USER_WORD_CONFIDENCE_TABLE)
      .upsert(batch, { onConflict: "user_id,word_id" });

    if (error) {
      throw new Error(`failed to upsert confidence rows: ${error.message}`);
    }
  }
}

export async function deleteAutoMarkedConfidenceRows(userId: string): Promise<void> {
  const { error } = await supabaseAdminClient
    .from(USER_WORD_CONFIDENCE_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("auto_marked", true);

  if (error) {
    throw new Error(`failed to delete auto-marked rows: ${error.message}`);
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    throw new Error("chunk size must be greater than 0");
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
