import { NextResponse } from "next/server";
import { startGeneration } from "@/generator/backend/controller";
import { logSessionMessage, fetchGeneratorSession, updateSessionStatus } from "@/generator/backend/supabaseClient";
import { sliceVocabulary } from "@/generator/backend/vocabLoader";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sessionId = body.sessionId as string | undefined;
  const parallel = Number(body.parallel ?? 0);

  if (!sessionId) {
    return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
  }

  const session = await fetchGeneratorSession(sessionId);
  if (!session) {
    return NextResponse.json({ success: false, error: "session not found" }, { status: 404 });
  }

  if (session.status === "paused") {
    await updateSessionStatus(sessionId, "running");
    await logSessionMessage(sessionId, "session resumed via dashboard", "info");
    return NextResponse.json({ success: true, resumed: true, sessionId, newSessionStarted: false });
  }

  if (session.status === "running") {
    return NextResponse.json({
      success: true,
      resumed: false,
      newSessionStarted: false,
      message: "session already running",
    });
  }

  const meta = (session.session_meta ?? {}) as {
    startWordId?: number;
    limit?: number;
    parallel?: number;
  };
  const originalStart = typeof meta.startWordId === "number" ? meta.startWordId : 2;
  const originalLimit = typeof meta.limit === "number" ? meta.limit : 50;
  const processed = session.progress_count ?? 0;
  if (processed >= originalLimit) {
    return NextResponse.json({ success: false, error: "all words already processed" });
  }

  const entries = sliceVocabulary(originalStart, originalLimit);
  const remainingEntries = entries.slice(processed);
  if (!remainingEntries.length) {
    return NextResponse.json({ success: false, error: "no remaining words" });
  }

  const remainingStart = remainingEntries[0].id;
  const remainingLimit = remainingEntries.length;
  const resumeParallel = parallel || (typeof meta.parallel === "number" ? meta.parallel : 1);

  await updateSessionStatus(sessionId, "failed");
  await logSessionMessage(sessionId, "session interrupted; resuming from dashboard", "info");

  const { processed: resumedProcessed, sessionId: newSessionId } = await startGeneration({
    parallel: resumeParallel,
    startWordId: remainingStart,
    limit: remainingLimit,
    metadata: {
      startWordId: remainingStart,
      limit: remainingLimit,
      parallel: resumeParallel,
      resumedFromSessionId: sessionId,
    },
  });

  return NextResponse.json({
    success: true,
    resumed: true,
    previousSessionId: sessionId,
    sessionId: newSessionId,
    processed: resumedProcessed,
    newSessionStarted: true,
  });
}
