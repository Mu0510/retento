import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
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
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
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
}
