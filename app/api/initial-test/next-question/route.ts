import { NextRequest, NextResponse } from "next/server";

import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import { selectInitialTestQuestion } from "@/lib/initial-test/questions";

export async function POST(request: NextRequest) {
  try {
    await requireSessionUser();
    const body = await request.json().catch(() => ({}));
    const estimatedScore = typeof body?.estimatedScore === "number" ? body.estimatedScore : 0;
    const answeredQuestionIds = Array.isArray(body?.answeredQuestionIds)
      ? (body.answeredQuestionIds as unknown[])
          .map((value) => Number(value))
          .filter(Number.isFinite)
      : [];
    const question = selectInitialTestQuestion(estimatedScore, answeredQuestionIds);
    return NextResponse.json(question);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[InitialTestNextQuestion]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "次の問題を取得できませんでした" },
      { status: 500 },
    );
  }
}
