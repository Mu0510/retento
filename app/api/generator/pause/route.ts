import { NextResponse } from "next/server";
import { logSessionMessage, updateSessionStatus } from "@/generator/backend/supabaseClient";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const sessionId = body.sessionId as string | undefined;
  if (!sessionId) {
    return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
  }

  await updateSessionStatus(sessionId, "paused");
  await logSessionMessage(sessionId, "session paused via dashboard", "info");
  return NextResponse.json({ success: true });
}
