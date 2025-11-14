import { NextRequest, NextResponse } from "next/server";

import { requireSessionUser, UnauthorizedError } from "@/lib/auth/session";
import {
  InitialTestAnswerPayload,
  persistInitialTestResult,
} from "@/lib/services/initial-test";
import { StoredConfidenceLevel } from "@/lib/services/user-progress";

const APPROVED_CONFIDENCES: StoredConfidenceLevel[] = ["forget", "iffy", "perfect"];

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSessionUser();
    const body = await request.json().catch(() => ({}));
    const finalScore = typeof body?.finalScore === "number" ? body.finalScore : 0;
    const incomingAnswers = Array.isArray(body?.answers) ? (body.answers as unknown[]) : [];
    const answers = incomingAnswers
      .map((value) => sanitizeAnswer(value))
      .filter((answer): answer is InitialTestAnswerPayload => answer !== null);

    if (!answers.length) {
      return NextResponse.json({ error: "回答がありません" }, { status: 400 });
    }

    const result = await persistInitialTestResult(userId, finalScore, answers);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[InitialTestSubmit]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "テスト結果を保存できませんでした" },
      { status: 500 },
    );
  }
}

function sanitizeAnswer(value: unknown): InitialTestAnswerPayload | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const candidate = value as Partial<InitialTestAnswerPayload>;
  const questionId = Number(candidate.questionId);
  const wordId = Number(candidate.wordId);
  const difficultyScore = Number(candidate.difficultyScore);
  const estimatedScore = Number(candidate.estimatedScore);
  const confidence = typeof candidate.confidence === "string" ? candidate.confidence : null;

  if (!Number.isFinite(questionId) || !Number.isFinite(wordId) || !Number.isFinite(difficultyScore)) {
    return null;
  }
  if (!confidence || !APPROVED_CONFIDENCES.includes(confidence as StoredConfidenceLevel)) {
    return null;
  }

  return {
    questionId,
    wordId,
    selectedAnswer: typeof candidate.selectedAnswer === "string" ? candidate.selectedAnswer : null,
    isCorrect: Boolean(candidate.isCorrect),
    confidence: confidence as StoredConfidenceLevel,
    difficultyScore,
    estimatedScore: Number.isFinite(estimatedScore) ? estimatedScore : 0,
    timestamp: typeof candidate.timestamp === "string" ? candidate.timestamp : new Date().toISOString(),
  };
}
