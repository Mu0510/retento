import { NextRequest, NextResponse } from "next/server";

import { buildFallbackQuestions, generateQuestionsForWords } from "@/lib/question-generator";
import type { SessionWord } from "@/lib/session-builder";

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "リクエストボディを解析できませんでした" }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null || !("words" in payload)) {
    return NextResponse.json({ error: "words パラメータが必要です" }, { status: 400 });
  }

  const rawWords = Array.isArray((payload as { words: unknown }).words) ? (payload as { words: unknown[] }).words : [];
  const words: SessionWord[] = rawWords
    .map((item) => sanitizeWord(item))
    .filter((item): item is SessionWord => item !== null);

  if (!words.length) {
    return NextResponse.json({ error: "有効な単語データがありません" }, { status: 400 });
  }

  try {
    const { questions, conversation } = await generateQuestionsForWords(words);
    return NextResponse.json({ questions, conversation });
  } catch (error) {
    console.error("failed to generate AI questions, falling back", error);
    const questions = buildFallbackQuestions(words);
    return NextResponse.json({
      questions,
      conversation: null,
      fallback: true,
      error: "AIでの問題生成に失敗したため、スタブ問題を返しました",
    });
  }
}

function sanitizeWord(entry: unknown): SessionWord | null {
  if (typeof entry !== "object" || entry === null) {
    return null;
  }
  const candidate = entry as Partial<SessionWord> & Record<string, unknown>;
  const id = Number(candidate.id);
  if (!Number.isFinite(id) || typeof candidate.word !== "string") {
    return null;
  }
  const meanings = Array.isArray(candidate.meanings)
    ? candidate.meanings.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  const basis = candidate.basis === "review" || candidate.basis === "score" || candidate.basis === "neighbor" ? candidate.basis : "score";
  const partOfSpeech =
    typeof candidate.partOfSpeech === "string"
      ? candidate.partOfSpeech
      : candidate.partOfSpeech === null
        ? null
        : null;

  return {
    id,
    word: candidate.word,
    partOfSpeech,
    difficultyScore: typeof candidate.difficultyScore === "number" ? candidate.difficultyScore : undefined,
    meanings,
    basis,
    neighborScore: typeof candidate.neighborScore === "number" ? candidate.neighborScore : undefined,
  };
}
