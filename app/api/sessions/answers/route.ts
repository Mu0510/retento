import { NextRequest, NextResponse } from "next/server";

import { UnauthorizedError, requireSessionUser } from "@/lib/auth/session";
import {
  calculateUserScore,
  fetchConfidenceSnapshot,
  upsertConfidenceRows,
  upsertUserScore,
} from "@/lib/services/user-progress";

type SubmitResult = {
  wordId: number;
  confidence: "none" | "forget" | "iffy" | "perfect";
  isCorrect: boolean;
};

type SubmitBody = {
  results: SubmitResult[];
};

export async function POST(request: NextRequest) {
  let userId: string;
  try {
    ({ userId } = await requireSessionUser());
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[SessionAnswers] failed to resolve session user", error);
    return NextResponse.json({ error: "認証情報を確認できませんでした" }, { status: 500 });
  }

  let payload: SubmitBody;
  try {
    payload = (await request.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "リクエストが正しくありません" }, { status: 400 });
  }

  if (!Array.isArray(payload.results) || payload.results.length === 0) {
    return NextResponse.json({ error: "results が必要です" }, { status: 400 });
  }

  try {
    const beforeSnapshot = await fetchConfidenceSnapshot(userId);
    const beforeScore = beforeSnapshot.profile.word_score ?? 0;

    const rows = payload.results.map((result) => ({
      user_id: userId,
      word_id: result.wordId,
      confidence: result.confidence,
      last_answered_at: new Date().toISOString(),
      times_answered: 1,
    }));

    await upsertConfidenceRows(rows);

    const afterSnapshot = await fetchConfidenceSnapshot(userId);
    const afterScore = calculateUserScore(afterSnapshot.rows);
    await upsertUserScore(userId, afterScore);

    return NextResponse.json({
      scoreBefore: beforeScore,
      scoreAfter: afterScore,
      scoreDiff: afterScore - beforeScore,
    });
  } catch (error) {
    console.error("[SessionAnswers] failed to process answers", error);
    return NextResponse.json({ error: "回答結果の処理に失敗しました" }, { status: 500 });
  }
}
