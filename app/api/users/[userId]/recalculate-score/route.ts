import { NextRequest, NextResponse } from "next/server";

import { UnauthorizedError, requireSessionUser } from "@/lib/auth/session";
import { supabaseAdminClient } from "@/lib/supabase-admin";
import {
  calculateUserScore,
  fetchConfidenceSnapshot,
  upsertUserScore,
  type UserWordConfidenceRow,
} from "@/lib/services/user-progress";

interface RecalculateParams {
  userId: string;
}

export async function POST(request: NextRequest, context: { params: Promise<RecalculateParams> }) {
  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const { userId: sessionUserId } = await requireSessionUser();
    if (sessionUserId !== userId) {
      return NextResponse.json({ error: "権限がありません" }, { status: 403 });
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "認証に失敗しました" }, { status: 500 });
  }

  const { error: profileError } = await supabaseAdminClient
    .from("user_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  try {
    const snapshot = await fetchConfidenceSnapshot(userId);
    const beforeScore = snapshot.profile.word_score ?? 0;

    const newScore = calculateUserScore(snapshot.rows as UserWordConfidenceRow[]);
    await upsertUserScore(userId, newScore);

    return NextResponse.json({
      scoreBefore: beforeScore,
      scoreAfter: newScore,
      scoreDiff: newScore - beforeScore,
    });
  } catch (error) {
    console.error("[RecalculateScore] ", error);
    return NextResponse.json({ error: "Failed to recalc score" }, { status: 500 });
  }
}
