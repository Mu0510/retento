"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCcw, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

const ACCENT = "#c2255d";

type SessionWord = {
  id: number;
  word: string;
  partOfSpeech?: string | null;
  difficultyScore?: number;
  meanings: string[];
  basis: "review" | "score" | "neighbor";
  neighborScore?: number | null;
};

type SessionPlanResponse = {
  words: SessionWord[];
  metadata: {
    sessionSize: number;
    baseWordIds: number[];
    userScore: number;
    difficultyRange: [number, number];
  };
};

type Choice = {
  id: string;
  label: string;
  correct: boolean;
};

type Question = {
  word: SessionWord;
  sentence: string;
  translation: string;
  choices: Choice[];
};

type Answer = {
  state: "idle" | "correct" | "incorrect";
  choiceId: string | null;
};

type AnswerSheet = Record<number, Answer>;

export default function SessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [plan, setPlan] = useState<SessionPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerSheet>({});

  useEffect(() => {
    const existing = searchParams.get("session");
    if (existing) {
      setSessionId(existing);
      return;
    }
    const generated = crypto.randomUUID();
    setSessionId(generated);
    const query = new URLSearchParams(searchParams.toString());
    query.set("session", generated);
    router.replace(`/app/session?${query.toString()}`);
  }, [router, searchParams]);

  const userScore = useMemo(() => {
    const score = Number(searchParams.get("score"));
    return Number.isFinite(score) ? score : 4200;
  }, [searchParams]);

  const reviewIds = useMemo(() => {
    const param = searchParams.get("review");
    if (!param) return undefined;
    return param
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isFinite(value));
  }, [searchParams]);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentIndex(0);
    setAnswers({});
    try {
      const res = await fetch("/api/sessions/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userScore, reviewIds, sessionSize: 5 }),
      });
      if (!res.ok) throw new Error("セッションを生成できませんでした");
      const data = (await res.json()) as SessionPlanResponse;
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期せぬエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [reviewIds, userScore]);

  useEffect(() => {
    if (!sessionId) return;
    void fetchPlan();
  }, [sessionId, fetchPlan]);

  const questions = useMemo(() => {
    if (!plan) return [];
    return plan.words.map<Question>((word, index) => {
      const sentence = index % 2 === 0
        ? `She accepted the award with great ${word.word}.`
        : `Researchers discussed ${word.word} in detail.`;
      const translation = index % 2 === 0
        ? `彼女は大きな ${word.meanings[0] ?? "意味"} をもって賞を受け取った。`
        : `${word.meanings[0] ?? "語"} について研究者たちが議論した。`;
      const distractors = pickDistractors(word, plan.words, 3);
      const choices = shuffle([
        { id: `${word.id}-correct`, label: word.meanings[0] ?? `${word.word} の定義`, correct: true },
        ...distractors,
      ]);
      return { word, sentence, translation, choices };
    });
  }, [plan]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length ? (currentIndex + 1) / questions.length : 0;

  const handleChoice = (choice: Choice) => {
    if (!currentQuestion) return;
    const sheet = answers[currentQuestion.word.id];
    if (sheet && sheet.state !== "idle") {
      return;
    }
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.word.id]: {
        state: choice.correct ? "correct" : "incorrect",
        choiceId: choice.id,
      },
    }));
  };

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-gray-900">
      <main className="mx-auto w-[92vw] max-w-5xl px-4 py-12 space-y-8">
        <header className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-gray-600 transition hover:text-gray-900"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="h-4 w-4" /> ホーム
            </button>
            <div className="flex items-center gap-3 text-xs">
              <span>session {sessionId ?? "---"}</span>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-gray-500 transition hover:text-gray-800"
                onClick={() => fetchPlan()}
              >
                <RefreshCcw className="h-3.5 w-3.5" /> 再生成
              </button>
            </div>
          </div>
          <div className="h-[6px] rounded-full bg-gray-200">
            <div
              className="h-[6px] rounded-full"
              style={{ width: `${Math.max(progress * 100, 4)}%`, backgroundColor: ACCENT }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {currentIndex + 1} / {questions.length || 0} 問
            </span>
            <span className="text-gray-400">
              {plan ? `band ${plan.metadata.difficultyRange[0]} – ${plan.metadata.difficultyRange[1]}` : "band ---"}
            </span>
          </div>
        </header>

        {loading ? (
          <StateCard icon={<Loader2 className="h-6 w-6 animate-spin" />} message="セッションを準備中です" />
        ) : error ? (
          <StateCard icon={<RefreshCcw className="h-6 w-6 text-gray-500" />} message={error} actionLabel="再試行" onAction={fetchPlan} />
        ) : (
          <section className="grid gap-8 md:grid-cols-2">
            <div>
              {currentQuestion ? (
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-xl">
                  <p className="text-gray-700 mb-3 leading-relaxed">
                    {renderSentence(currentQuestion.sentence, currentQuestion.word.word)}
                  </p>
                  <p
                    className={cn(
                      "mb-4 min-h-[1.75rem] text-sm leading-snug italic transition-colors",
                      answers[currentQuestion.word.id]?.state &&
                        answers[currentQuestion.word.id]?.state !== "idle"
                        ? "text-gray-500"
                        : "text-gray-300",
                    )}
                  >
                    {answers[currentQuestion.word.id]?.state &&
                    answers[currentQuestion.word.id]?.state !== "idle"
                      ? currentQuestion.translation
                      : "　"}
                  </p>
                      <div className="space-y-3">
                        {currentQuestion.choices.map((choice) => {
                          const visual = choiceVisual(choice, answers[currentQuestion.word.id]);
                          const sheet = answers[currentQuestion.word.id];
                          const answered = sheet?.state !== "idle";
                          return (
                            <button
                              key={choice.id}
                              type="button"
                              onClick={() => handleChoice(choice)}
                              className={cn(
                                "w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors text-gray-700 flex items-center justify-between",
                                visual,
                              )}
                            >
                              <span>{choice.label}</span>
                            {answered && sheet?.state === "correct" && sheet.choiceId === choice.id && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            )}
                            </button>
                          );
                        })}
                      </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">問題を読み込めませんでした。</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-xl">
              {currentQuestion ? (
                <FeedbackPanel
                  question={currentQuestion}
                  sheet={answers[currentQuestion.word.id]}
                  pool={plan?.words ?? []}
                />
              ) : (
                <p className="text-sm text-gray-500">フィードバックを準備しています…</p>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function pickDistractors(source: SessionWord, pool: SessionWord[], max: number): Choice[] {
  const candidates = pool.filter((item) => item.id !== source.id && item.meanings.length);
  return shuffle(candidates)
    .slice(0, max)
    .map((item) => ({ id: `${source.id}-d-${item.id}`, label: item.meanings[0], correct: false }));
}

function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function choiceVisual(choice: Choice, sheet?: Answer) {
  if (!sheet || sheet.state === "idle") {
    return "";
  }
  if (choice.correct) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (sheet.choiceId === choice.id) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "opacity-60";
}

function FeedbackPanel({ question, sheet, pool }: { question: Question; sheet?: Answer; pool: SessionWord[] }) {
  if (!sheet || sheet.state === "idle") {
    return (
      <div className="space-y-3 text-sm text-gray-600">
        <p className="font-semibold text-gray-900">静かに選択し、すぐに結果を確認。</p>
        <p>Retentoは語源・類義語を事前生成し、回答直後に表示します。</p>
      </div>
    );
  }

  const correct = question.choices.find((choice) => choice.correct);
  const picked = question.choices.find((choice) => choice.id === sheet.choiceId);
  const related = pool
    .filter((item) => item.id !== question.word.id && item.meanings.length)
    .slice(0, 2)
    .map((item) => `${item.word}（${item.meanings[0]}）`)
    .join("、");

  return (
    <div className="space-y-4 text-sm">
      <div
        className={cn(
          "rounded-2xl border px-4 py-4",
          sheet.state === "correct"
            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
            : "border-rose-100 bg-rose-50 text-rose-700",
        )}
      >
        <p className="text-xs font-semibold tracking-wide">{sheet.state === "correct" ? "正解" : "不正解"}</p>
        <p className="text-lg font-semibold mt-1">{correct?.label ?? "-"}</p>
        {sheet.state === "incorrect" && picked && <p className="mt-1 text-xs">選択: {picked.label}</p>}
      </div>
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-gray-700">
        <p className="font-semibold text-gray-900">語源メモ</p>
        <p className="mt-1 leading-relaxed">
          {question.word.word} は {question.word.partOfSpeech ?? "語"}。Retentoは語源とニュアンスを先に生成し、待ち時間をなくします。
        </p>
      </div>
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-gray-700">
        <p className="font-semibold text-gray-900">関連語</p>
        <p className="mt-1 leading-relaxed">{related || "関連語を準備しています"}</p>
      </div>
    </div>
  );
}

function StateCard({ icon, message, actionLabel, onAction }: { icon: ReactNode; message: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[24px] border border-gray-100 bg-white py-16 text-gray-600">
      <div className="text-gray-400">{icon}</div>
      <p className="text-sm">{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-full border border-gray-200 px-6 py-2 text-sm text-gray-700 transition hover:border-gray-300"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

function renderSentence(sentence: string, keyword: string) {
  const pattern = new RegExp(`(\\b${escapeRegExp(keyword)}\\b)`, "i");
  const parts = sentence.split(pattern);
  return parts.map((part, index) => {
    if (part.toLowerCase() === keyword.toLowerCase()) {
      return (
        <span key={`${part}-${index}`} className="border-b-2 border-[#c2255d]">
          {part}
        </span>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
