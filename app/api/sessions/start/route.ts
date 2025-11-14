import { NextRequest, NextResponse } from "next/server";

import { UnauthorizedError, requireSessionUser } from "@/lib/auth/session";
import { resolveSessionForUser } from "@/lib/services/session-service";

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    ({ userId } = await requireSessionUser());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[SessionStart] failed to resolve session user", error);
    return NextResponse.json({ error: "認証情報を確認できませんでした" }, { status: 500 });
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
