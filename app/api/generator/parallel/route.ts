import { NextResponse } from "next/server";
import { logSessionMessage, updateSessionParallel } from "@/generator/backend/supabaseClient";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sessionId = body.sessionId as string | undefined;
  if (!sessionId) {
    return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
  }
  const rawParallel = Number(body.parallel ?? body.parallelCount);
  if (!Number.isFinite(rawParallel)) {
    return NextResponse.json({ success: false, error: "parallel value is invalid" }, { status: 400 });
  }
  const normalized = Math.max(1, Math.min(20, Math.floor(rawParallel)));

  try {
    await updateSessionParallel(sessionId, normalized);
    await logSessionMessage(sessionId, `parallel updated to ${normalized}`, "info");
    return NextResponse.json({ success: true, parallel: normalized });
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
