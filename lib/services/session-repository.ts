import { randomUUID } from "crypto";
import { supabaseAdminClient } from "@/lib/supabase-admin";
import type { SessionPlanResponse } from "@/lib/session-builder";
import type { SessionQuestion } from "@/types/questions";

const STUDY_SESSIONS_TABLE = "study_sessions";
const PREGENERATED_SESSIONS_TABLE = "pre_generated_sessions";

export type PersistedSession = {
  sessionId: string;
  userId: string;
  questions: SessionQuestion[];
  plan: SessionPlanResponse;
  source: "immediate" | "pregenerated";
};

export type PreGeneratedPayload = {
  questions: SessionQuestion[];
  plan: SessionPlanResponse;
};

export async function saveSessionRecord(
  userId: string,
  questions: SessionQuestion[],
  plan: SessionPlanResponse,
  source: PersistedSession["source"] = "immediate",
): Promise<PersistedSession> {
  const sessionId = randomUUID();
  const { error } = await supabaseAdminClient.from(STUDY_SESSIONS_TABLE).insert({
    id: sessionId,
    user_id: userId,
    status: "ready",
    question_count: questions.length,
    plan_metadata: plan,
    questions,
  });

  if (error) {
    throw new Error(`failed to store session: ${error.message}`);
  }

  return { sessionId, userId, questions, plan, source };
}

export async function savePreGeneratedSession(
  userId: string,
  payload: { questions: SessionQuestion[]; plan: SessionPlanResponse },
): Promise<void> {
  const { error } = await supabaseAdminClient.from(PREGENERATED_SESSIONS_TABLE).insert({
    user_id: userId,
    questions: payload.questions,
    plan_metadata: payload.plan,
  });
  if (error) {
    throw new Error(`failed to store pregenerated session: ${error.message}`);
  }
}

export async function consumePreGeneratedSession(userId: string): Promise<PreGeneratedPayload | null> {
  const { data, error } = await supabaseAdminClient
    .from(PREGENERATED_SESSIONS_TABLE)
    .select("id, questions, plan_metadata")
    .eq("user_id", userId)
    .is("used_at", null)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`failed to load pregenerated session: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  await supabaseAdminClient
    .from(PREGENERATED_SESSIONS_TABLE)
    .update({ used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    questions: (data.questions as SessionQuestion[]) ?? [],
    plan: (data.plan_metadata as SessionPlanResponse) ?? buildEmptyPlan(),
  };
}

export async function cleanupOldPreGeneratedSessions(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdminClient
    .from(PREGENERATED_SESSIONS_TABLE)
    .delete()
    .eq("user_id", userId)
    .lt("created_at", cutoff);
}

function buildEmptyPlan(): SessionPlanResponse {
  return {
    words: [],
    metadata: {
      sessionSize: 0,
      baseWordIds: [],
      userScore: 0,
      difficultyRange: [0, 0],
    },
  };
}
