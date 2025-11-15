import { NextResponse } from "next/server";

import { UnauthorizedError, requireSessionUser } from "@/lib/auth/session";
import { calculateUserScore, fetchConfidenceSnapshot, upsertUserScore } from "@/lib/services/user-progress";
import { getInitialTestResult } from "@/lib/services/initial-test";

export async function POST() {
  try {
    const { userId } = await requireSessionUser();
    const initialResult = await getInitialTestResult(userId);
    const snapshot = await fetchConfidenceSnapshot(userId);
    const beforeScore = snapshot.profile.word_score ?? 0;

    if (initialResult?.test_details?.calculatedWordScore) {
      const scoreAfter = initialResult.test_details.calculatedWordScore;
      await upsertUserScore(userId, scoreAfter);
      return NextResponse.json({
        success: true,
        scoreBefore: beforeScore,
        scoreAfter,
        scoreDiff: scoreAfter - beforeScore,
        source: "initial-test",
      });
    }

    const updatedScore = calculateUserScore(snapshot.rows);
    await upsertUserScore(userId, updatedScore);
    return NextResponse.json({
      success: true,
      scoreBefore: beforeScore,
      scoreAfter: updatedScore,
      scoreDiff: updatedScore - beforeScore,
      source: "recalc",
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[UserRecalcScore]", error);
    return NextResponse.json({ error: "スコア再計算に失敗しました" }, { status: 500 });
  }
}
