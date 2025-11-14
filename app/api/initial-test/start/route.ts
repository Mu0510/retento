import { NextResponse } from "next/server";

import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import {
  getInitialTestProgress,
  getInitialTestResult,
  InitialTestProgressPayload,
  upsertInitialTestProgress,
} from "@/lib/services/initial-test";

const DEFAULT_ESTIMATED_SCORE = 150;

export async function POST() {
  try {
    const { userId } = await requireSessionUser();
    const existing = await getInitialTestResult(userId);
    if (existing) {
      return NextResponse.json({ completed: true, initialScore: existing.initial_score, testDetails: existing.test_details });
    }
    const progress = await getInitialTestProgress(userId);
    if (progress) {
      return NextResponse.json({ progress });
    }
    const initialProgress: InitialTestProgressPayload = {
      answeredQuestionIds: [],
      answers: [],
      estimatedScore: DEFAULT_ESTIMATED_SCORE,
    };
    await upsertInitialTestProgress(userId, initialProgress);
    return NextResponse.json({ progress: initialProgress });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[InitialTestStart]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "初回テストを開始できませんでした" }, { status: 500 });
  }
}
