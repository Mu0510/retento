import { NextResponse } from "next/server";
import { fetchLatestGeneratorSession, fetchSessionErrorCount } from "@/generator/backend/supabaseClient";

export async function GET() {
  const session = await fetchLatestGeneratorSession();
  if (!session) {
    return NextResponse.json({
      status: "idle",
      note: "Generator sessions are bridged to Supabase logs; start a session via POST /api/generator/start",
    });
  }

  const meta = session.session_meta ?? {};
  const toNumber = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };
  const processed = toNumber(session.progress_count ?? 0) ?? 0;
  const totalWords = toNumber(meta.limit);
  const failures = await fetchSessionErrorCount(session.id);
  return NextResponse.json({
    status: session.status,
    note: session.current_word || "No word processed yet",
    sessionId: session.id,
    progress: processed,
    totalWords,
    failures,
    startWordId: toNumber(meta.startWordId),
    parallel: toNumber(meta.parallel),
    patternCount: toNumber(meta.patternCount),
    updatedAt: session.finished_at ?? session.started_at,
  });
}
