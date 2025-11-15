import { NextResponse } from "next/server";

import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import {
  deleteInitialTestProgress,
  deleteInitialTestResult,
} from "@/lib/services/initial-test";
import { deleteAutoMarkedConfidenceRows } from "@/lib/services/user-progress";

export async function POST() {
  try {
    const { userId } = await requireSessionUser();
    await deleteInitialTestResult(userId);
    await deleteInitialTestProgress(userId);
    await deleteAutoMarkedConfidenceRows(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[InitialTestReset]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "初回テストをリセットできませんでした" },
      { status: 500 },
    );
  }
}
