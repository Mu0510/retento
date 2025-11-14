import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { resolveSessionForUser } from "@/lib/services/session-service";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  let payload: { sessionSize?: number } = {};
  try {
    payload = await request.json();
  } catch {
    // ignore missing body
  }

  try {
    const result = await resolveSessionForUser(userId, { sessionSize: payload.sessionSize });
    return NextResponse.json({
      sessionId: result.sessionId,
      questions: result.questions,
      plan: result.plan,
      source: result.source,
    });
  } catch (error) {
    console.error("[SessionStart] failed to start session:", error);
    return NextResponse.json({ error: "セッションを開始できませんでした" }, { status: 500 });
  }
}
