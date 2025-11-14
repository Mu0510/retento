import { NextRequest, NextResponse } from "next/server";

import { buildFeedbackPrompt, type FeedbackResult } from "@/lib/session-feedback";
import type { QuestionConversation } from "@/types/questions";

const OPENAI_API_BASE = process.env.OPENAI_API_BASE ?? "https://api.openai.com";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const FEEDBACK_SYSTEM_MESSAGE =
  "あなたは大学受験向け英単語学習アプリのAIコーチです。受講者が解いた問題の結果を解析し、語源・コアイメージ・使い分けまで踏み込んだ専門的なフィードバックを与えてください。";

type FeedbackRequestBody = {
  conversation?: QuestionConversation | null;
  results: FeedbackResult[];
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
  }
  let payload: FeedbackRequestBody;
  try {
    payload = (await request.json()) as FeedbackRequestBody;
  } catch {
    return NextResponse.json({ error: "リクエストボディを解析できませんでした" }, { status: 400 });
  }

  if (!Array.isArray(payload.results) || payload.results.length === 0) {
    return NextResponse.json({ error: "results が不足しています" }, { status: 400 });
  }

  const messages = buildMessages(payload.conversation, payload.results);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`${OPENAI_API_BASE.replace(/\/$/, "")}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.6,
        max_tokens: 800,
        messages,
      }),
    });

    if (!response.ok) {
      const detail = await safeReadJson(response);
      throw new Error(detail?.error?.message ?? `OpenAI API request failed (${response.status})`);
    }

    const data = await response.json();
    const feedback = data.choices?.[0]?.message?.content?.trim();
    if (!feedback) {
      throw new Error("OpenAIからフィードバックを取得できませんでした");
    }
    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("[SessionFeedback] failed to generate feedback", error);
    return NextResponse.json({ error: "フィードバック生成に失敗しました" }, { status: 500 });
  } finally {
    clearTimeout(timeout);
  }
}

function buildMessages(conversation: QuestionConversation | null | undefined, results: FeedbackResult[]) {
  const prompt = buildFeedbackPrompt(results);
  const base: { role: "system" | "user" | "assistant"; content: string }[] = [];
  if (conversation?.system && conversation?.user && conversation?.assistant) {
    base.push(
      { role: "system", content: conversation.system },
      { role: "user", content: conversation.user },
      { role: "assistant", content: conversation.assistant },
    );
  } else {
    base.push({ role: "system", content: FEEDBACK_SYSTEM_MESSAGE });
  }
  base.push({ role: "user", content: prompt });
  return base;
}

async function safeReadJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
