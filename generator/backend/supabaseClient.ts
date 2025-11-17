import { createClient } from "@supabase/supabase-js";
import type { QuestionPayload } from "./types";
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "./config";

export type GeneratorSessionStatus = "pending" | "running" | "paused" | "completed" | "failed";

export type GeneratorSessionRecord = {
  id: string;
  status: GeneratorSessionStatus;
  parallel_slot: number;
  current_word: string | null;
  progress_count: number;
  session_meta: Record<string, unknown> | null;
  started_at: string;
  finished_at: string | null;
};

export type RegenerationQueueStatus = "pending" | "processing" | "completed" | "failed";

export type RegenerationQueueEntry = {
  id: string;
  word_id: number;
  word: string;
  reason: string | null;
  status: RegenerationQueueStatus;
  session_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  hidden: boolean;
};

type QueueInsertEntry = {
  word_id: number;
  word: string;
  reason: string;
};

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Supabase configuration is missing");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function insertGeneratedQuestion(
  sessionId: string,
  question: QuestionPayload,
  wordId?: number
) {
  const result = await supabase.from("generated_questions").insert({
    session_id: sessionId,
    word_id: wordId,
    word: question.word,
    pattern_number: question.pattern_number,
    sentence_en: question.sentence_en,
    sentence_ja: question.sentence_ja,
    choice_1: question.choice_1,
    choice_2: question.choice_2,
    choice_3: question.choice_3,
    choice_4: question.choice_4,
    correct_choice_index: question.correct_choice_index,
    feedback_1: question.feedback_1,
    feedback_2: question.feedback_2,
    feedback_3: question.feedback_3,
    feedback_4: question.feedback_4,
    tags: question.tags,
    usage_scene: question.usage_scene,
    embedding_text: question.embedding_text,
  });

  if (result.error) {
    console.error("Failed to insert generated question", result.error);
    throw result.error;
  }

  return result.data;
}

export async function createSession(parallelSlot: number, sessionMeta: Record<string, unknown> = {}) {
  const result = await supabase
    .from("generator_sessions")
    .insert({
      parallel_slot: parallelSlot,
      session_meta: { parallelSlot, ...sessionMeta },
    })
    .select()
    .single();

  if (result.error) {
    throw result.error;
  }

  return result.data as GeneratorSessionRecord;
}

export async function logSessionMessage(
  sessionId: string | null,
  message: string,
  level: "info" | "error" = "info",
  payload?: Record<string, unknown>
) {
  const entry: Record<string, unknown> = {
    log_level: level,
    message,
  };
  if (payload) {
    entry.payload = payload;
  }
  if (sessionId) {
    entry.session_id = sessionId;
  }

  await supabase.from("generation_logs").insert(entry);
}

export async function updateSessionStatus(sessionId: string, status: GeneratorSessionStatus) {
  const shouldClose = status === "completed" || status === "failed";
  await supabase
    .from("generator_sessions")
    .update({ status, finished_at: shouldClose ? new Date().toISOString() : null })
    .eq("id", sessionId);
}

export async function fetchGeneratorSession(sessionId: string) {
  const result = await supabase
    .from("generator_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (result.error) {
    throw result.error;
  }

  return result.data as GeneratorSessionRecord | null;
}

export async function updateSessionParallel(sessionId: string, parallel: number) {
  const session = await fetchGeneratorSession(sessionId);
  if (!session) {
    throw new Error("session not found");
  }
  const meta = { ...(session.session_meta ?? {}), parallel };
  const result = await supabase
    .from("generator_sessions")
    .update({
      parallel_slot: parallel,
      session_meta: meta,
    })
    .eq("id", sessionId);

  if (result.error) {
    throw result.error;
  }

  return result.data;
}

export async function fetchSessionErrorCount(sessionId: string) {
  const { data: errorLogs, error: errorFetch } = await supabase
    .from("generation_logs")
    .select("payload")
    .eq("session_id", sessionId)
    .eq("log_level", "error");

  if (errorFetch) {
    throw errorFetch;
  }

  const errorWordIds = new Set<number>();
  errorLogs?.forEach((log) => {
    const wordId = (log as { payload?: { word_id?: number } }).payload?.word_id;
    if (typeof wordId === "number") {
      errorWordIds.add(wordId);
    }
  });

  if (!errorWordIds.size) {
    return 0;
  }

  const { data: successRows, error: successError } = await supabase
    .from("generated_questions")
    .select("word_id")
    .eq("session_id", sessionId)
    .in("word_id", [...errorWordIds]);

  if (successError) {
    throw successError;
  }

  const successWordIds = new Set(successRows?.map((row) => row.word_id));
  let failureCount = 0;
  errorWordIds.forEach((wordId) => {
    if (!successWordIds.has(wordId)) {
      failureCount += 1;
    }
  });
  return failureCount;
}

export async function fetchLatestGeneratorSession() {
  const result = await supabase
    .from("generator_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (result.error) {
    if (result.error.code === "PGRST116") {
      return null;
    }
    throw result.error;
  }
  return result.data as GeneratorSessionRecord | null;
}

export async function updateSessionProgress(
  sessionId: string,
  progressCount: number,
  currentWord?: string
) {
  const updates: Record<string, unknown> = { progress_count: progressCount };
  if (currentWord) {
    updates.current_word = currentWord;
  }

  const result = await supabase.from("generator_sessions").update(updates).eq("id", sessionId);
  if (result.error) {
    console.error("Failed to update session progress", result.error);
    throw result.error;
  }
}

export async function resetGeneratorData() {
  const deleteQuestions = await deleteAllRows("generated_questions");
  if (deleteQuestions.error) {
    throw deleteQuestions.error;
  }

  const deleteLogs = await deleteAllRows("generation_logs");
  if (deleteLogs.error) {
    throw deleteLogs.error;
  }

  const deleteSessions = await deleteAllRows("generator_sessions");
  if (deleteSessions.error) {
    throw deleteSessions.error;
  }

  return {
    deletedQuestions: deleteQuestions.count ?? null,
    deletedLogs: deleteLogs.count ?? null,
    deletedSessions: deleteSessions.count ?? null,
  };
}

async function deleteAllRows(table: string) {
  const ids: string[] = [];
  let from = 0;
  const batchSize = 500;
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("id")
      .range(from, from + batchSize - 1);
    if (error) {
      await logSessionMessage(null, "delete chunk failed", "error", {
        table,
        from,
        batchSize,
        error: error.message,
        details: (error as { details?: unknown }).details,
      });
      return { error };
    }
    if (!data || !data.length) {
      break;
    }
    ids.push(...(data.map((row: { id: string }) => row.id).filter(Boolean) as string[]));
    from += batchSize;
  }

  if (!ids.length) {
    return { error: null, count: 0, data: [] };
  }

  const result = await supabase.from(table).delete().in("id", ids);
  return result;
}

export async function deleteQuestionsForWordIds(wordIds: number[]) {
  if (!wordIds.length) {
    return { count: 0 };
  }
  const result = await supabase.from("generated_questions").delete().in("word_id", wordIds);
  if (result.error) {
    throw result.error;
  }
  return result;
}

export async function insertRegenerationQueueEntries(entries: QueueInsertEntry[]) {
  if (!entries.length) {
    return [];
  }
  const uniqueWordIds = [...new Set(entries.map((entry) => entry.word_id))];
  const { data: existing } = await supabase
    .from("regeneration_queue")
    .select("word_id, status")
    .in("word_id", uniqueWordIds);
  const blockedWordIds = new Set(
    (existing ?? [])
      .filter((row) => row.status === "pending" || row.status === "processing")
      .map((row) => row.word_id)
  );
  const filtered = entries.filter((entry) => !blockedWordIds.has(entry.word_id));
  if (!filtered.length) {
    return [];
  }
  const payload = filtered.map((entry) => ({
    word_id: entry.word_id,
    word: entry.word,
    reason: entry.reason,
    status: "pending" as RegenerationQueueStatus,
    hidden: false,
  }));
  const result = await supabase.from("regeneration_queue").insert(payload).select("*");
  if (result.error) {
    throw result.error;
  }
  return (result.data ?? []) as RegenerationQueueEntry[];
}

export async function fetchRegenerationQueueEntries(
  statuses?: RegenerationQueueStatus[],
  limit = 100,
  includeHidden = false
) {
  let query = supabase
    .from("regeneration_queue")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (statuses && statuses.length) {
    query = query.in("status", statuses);
  }
  if (!includeHidden) {
    query = query.eq("hidden", false);
  }
  const result = await query;
  if (result.error) {
    throw result.error;
  }
  return (result.data ?? []) as RegenerationQueueEntry[];
}

export async function updateRegenerationQueueEntriesStatus(
  ids: string[],
  updates: Partial<{
    status: RegenerationQueueStatus;
    session_id: string | null;
    last_error: string | null;
  }>
) {
  if (!ids.length) {
    return;
  }
  const payload = {
    ...updates,
    updated_at: new Date().toISOString(),
  };
  const result = await supabase.from("regeneration_queue").update(payload).in("id", ids);
  if (result.error) {
    throw result.error;
  }
}

export async function hideRegenerationQueueEntries(ids: string[]) {
  if (!ids.length) {
    return;
  }
  const payload = {
    hidden: true,
    updated_at: new Date().toISOString(),
  };
  const result = await supabase.from("regeneration_queue").update(payload).in("id", ids);
  if (result.error) {
    throw result.error;
  }
}
