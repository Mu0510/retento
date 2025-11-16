import { sliceVocabulary } from "./vocabLoader";
import { SessionManager } from "./sessionManager";
import { fetchLatestGeneratorSession } from "./supabaseClient";
import { QUESTIONS_PER_WORD } from "./config";

export type StartGenerationParams = {
  parallel: number;
  startWordId: number;
  limit: number;
  patternCount?: number;
  resumeExisting?: boolean;
  metadata?: Record<string, unknown>;
};

export type StartGenerationResult = {
  processed: number;
  sessionId: string;
  startWordId: number;
  limit: number;
  patternCount: number;
  resumed: boolean;
};

export async function startGeneration({
  parallel,
  startWordId,
  limit,
  patternCount,
  resumeExisting = false,
  metadata = {},
}: StartGenerationParams): Promise<StartGenerationResult> {
  let actualStart = startWordId;
  let actualLimit = limit;
  let resumed = false;
  const requestedPatternCount =
    typeof patternCount === "number" && Number.isFinite(patternCount)
      ? Math.max(1, Math.min(20, Math.floor(patternCount)))
      : QUESTIONS_PER_WORD;
  let actualPatternCount = requestedPatternCount;
  metadata = { ...metadata, patternCount: actualPatternCount };

  if (resumeExisting) {
    const latest = await fetchLatestGeneratorSession();
    if (latest) {
      const prevMeta = latest.session_meta ?? {};
      const prevStartRaw = Number(prevMeta.startWordId ?? startWordId);
      const prevLimitRaw = Number(prevMeta.limit ?? limit);
      const prevStart = Number.isFinite(prevStartRaw) ? prevStartRaw : startWordId;
      const prevLimit = Number.isFinite(prevLimitRaw) && prevLimitRaw > 0 ? prevLimitRaw : limit;
      const matchesStart = prevStart === actualStart;
      const progress = Number(latest.progress_count ?? 0);
      const remaining = Math.max(prevLimit - progress, 0);

      if (matchesStart && latest.status !== "completed" && remaining > 0) {
        actualStart = prevStart + progress;
        actualLimit = remaining;
        resumed = true;
        const prevPatternCount = Number(prevMeta.patternCount ?? requestedPatternCount);
        if (Number.isFinite(prevPatternCount)) {
          actualPatternCount = Math.max(1, Math.min(20, Math.floor(prevPatternCount))) || actualPatternCount;
        }
        metadata = {
          ...metadata,
          resumedFromSessionId: latest.id,
          resumeStartWordId: actualStart,
          resumeSourceStartWordId: prevStart,
          resumeSourceLimit: prevLimit,
          patternCount: actualPatternCount,
        };
      } else if (matchesStart && latest.status === "completed") {
        actualStart = prevStart + prevLimit;
        actualLimit = limit;
        resumed = true;
        metadata = {
          ...metadata,
          resumedFromSessionId: latest.id,
          resumeStartWordId: actualStart,
          resumeSourceStartWordId: prevStart,
          resumeSourceLimit: prevLimit,
          patternCount: actualPatternCount,
        };
      }
    }
  }

  const entries = sliceVocabulary(actualStart, actualLimit);
  if (!entries.length) {
    throw new Error("no vocabulary entries found for the requested range");
  }

  const manager = new SessionManager(entries, { ...metadata, startWordId: actualStart, limit: actualLimit });
  manager.setParallelLimit(parallel);
  await manager.start();
  const sessionId = manager.getSessionId();
  if (!sessionId) {
    throw new Error("failed to obtain session id");
  }
  return {
    processed: entries.length,
    sessionId,
    startWordId: actualStart,
    limit: actualLimit,
    patternCount: actualPatternCount,
    resumed,
  };
}
