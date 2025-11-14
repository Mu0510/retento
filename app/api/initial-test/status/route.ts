import { NextResponse } from "next/server";

import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { getInitialTestProgress, getInitialTestResult } from "@/lib/services/initial-test";

export async function GET() {
  try {
    const { userId } = await requireSessionUser();
    const result = await getInitialTestResult(userId);
    const progress = await getInitialTestProgress(userId);
    return NextResponse.json({
      completed: Boolean(result),
      initialScore: result?.initial_score ?? null,
      progress,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[InitialTestStatus]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "ステータス取得に失敗しました" },
      { status: 500 },
    );
  }
}
