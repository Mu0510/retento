import type { SessionPlanResponse } from "@/lib/session-builder";
import type { SessionQuestion } from "@/types/questions";
import { buildFallbackQuestions, generateQuestionsForWords } from "@/lib/question-generator";
import {
  calculateUserScore,
  fetchConfidenceSnapshot,
  upsertUserScore,
  type UserWordConfidenceRow,
} from "@/lib/services/user-progress";
import { selectWordsForUser } from "@/lib/services/word-selection";
import {
  consumePreGeneratedSession,
  savePreGeneratedSession,
  saveSessionRecord,
  type PersistedSession,
} from "@/lib/services/session-repository";

type SessionBuildOptions = {
  sessionSize?: number;
};

export async function generateSessionForUser(userId: string, options: SessionBuildOptions = {}): Promise<PersistedSession> {
  const artifacts = await buildSessionArtifacts(userId, options);
  return saveSessionRecord(userId, artifacts.questions, artifacts.plan);
}

export async function generateAndStorePregeneratedSession(
  userId: string,
  options: SessionBuildOptions = {},
): Promise<void> {
  const artifacts = await buildSessionArtifacts(userId, options);
  await savePreGeneratedSession(userId, artifacts);
}

export async function resolveSessionForUser(
  userId: string,
  options: SessionBuildOptions = {},
): Promise<PersistedSession> {
  const pregenerated = await consumePreGeneratedSession(userId);
  if (pregenerated) {
    // Kick off next pre-generation asynchronously
    void generateAndStorePregeneratedSession(userId, options).catch((error) => {
      console.error("[SessionService] failed to pre-generate next session:", error);
    });
    return saveSessionRecord(userId, pregenerated.questions, pregenerated.plan, "pregenerated");
  }
  const session = await generateSessionForUser(userId, options);
  void generateAndStorePregeneratedSession(userId, options).catch((error) => {
    console.error("[SessionService] failed to pre-generate next session:", error);
  });
  return session;
}

async function buildSessionArtifacts(userId: string, options: SessionBuildOptions) {
  const snapshot = await fetchConfidenceSnapshot(userId);
  let userScore = snapshot.profile.word_score ?? 0;
  if (!userScore) {
    userScore = calculateUserScore(snapshot.rows);
    await upsertUserScore(userId, userScore);
  }
  const seenWordIds = new Set(snapshot.rows.map((row) => row.word_id));
  const reviewWordIds = deriveReviewWordIds(snapshot.rows);
  const selection = selectWordsForUser({
    userScore,
    reviewWordIds,
    seenWordIds,
    sessionSize: options.sessionSize,
  });

  let questions: SessionQuestion[];
  try {
    const { questions: generated } = await generateQuestionsForWords(selection.words);
    questions = generated;
  } catch (error) {
    console.error("[SessionService] AI generation failed, fallback to stub questions:", error);
    questions = buildFallbackQuestions(selection.words);
  }

  const plan: SessionPlanResponse = {
    words: selection.words,
    metadata: selection.metadata,
  };

  return { plan, questions };
}

function deriveReviewWordIds(rows: UserWordConfidenceRow[], limit = 3): number[] {
  const now = Date.now();
  const due = rows
    .filter((row) => row.next_review_at && new Date(row.next_review_at).getTime() <= now)
    .sort((a, b) => {
      const aTime = new Date(a.next_review_at ?? 0).getTime();
      const bTime = new Date(b.next_review_at ?? 0).getTime();
      return aTime - bTime;
    })
    .slice(0, limit)
    .map((row) => row.word_id);

  if (due.length >= limit) {
    return due;
  }

  const needed = limit - due.length;
  const fallback = rows
    .filter((row) => row.confidence === "forget" && !due.includes(row.word_id))
    .sort((a, b) => {
      const aTime = new Date(a.last_answered_at ?? 0).getTime();
      const bTime = new Date(b.last_answered_at ?? 0).getTime();
      return aTime - bTime;
    })
    .slice(0, needed)
    .map((row) => row.word_id);

  return [...due, ...fallback];
}
