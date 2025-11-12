"use client";

import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Share2, RefreshCcw, Loader2, AlertTriangle } from "lucide-react";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
  hint: string;
  correct: boolean;
};

type Question = {
  word: SessionWord;
  sentence: string;
  translation: string;
  choices: Choice[];
};

type AnswerSheet = Record<
  number,
  {
    state: "idle" | "correct" | "incorrect";
    choiceId: string | null;
  }
>;

export default function SessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [plan, setPlan] = useState<SessionPlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerSheet>({});
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  // shareable session id
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
        body: JSON.stringify({ userScore, reviewIds, sessionSize: 10 }),
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
      const baseSentence = buildSentence(word.word, index);
      const distractors = pickDistractors(word, plan.words, 3);
      const choices: Choice[] = shuffle([
        {
          id: `${word.id}-correct`,
          label: word.meanings[0] ?? `${word.word} の定義`,
          hint: word.partOfSpeech ? `(${word.partOfSpeech})` : "",
          correct: true,
        },
        ...distractors,
      ]);
      return {
        word,
        sentence: baseSentence.sentence,
        translation: baseSentence.translation,
        choices,
      };
    });
  }, [plan]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length ? (currentIndex + 1) / questions.length : 0;

  const handleChoice = (choice: Choice) => {
    if (!currentQuestion) return;
    const state = answers[currentQuestion.word.id]?.state ?? "idle";
    if (state !== "idle") {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.word.id]: { state, choiceId: choice.id },
      }));
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

  const handleCopyLink = async () => {
    if (!sessionId) return;
    const url = new URL(window.location.href);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Retento セッション", url: url.toString() });
        return;
      }
    } catch {
      // fallback to clipboard
    }
    await navigator.clipboard.writeText(url.toString());
    setCopyState("copied");
    setTimeout(() => setCopyState("idle"), 2000);
  };

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-gray-900">
      <SiteHeader
        navItems={[{ id: "lp", label: "Landing", href: "/" }]}
        onNavigateHome={() => router.push("/")}
        onNavigateToApp={() => router.push("/app/session")}
        containerClassName="mx-auto w-[90vw] max-w-5xl px-4"
      />
      <main className="mx-auto w-[90vw] max-w-5xl px-4 pt-28 pb-16 space-y-10">
        <section className="rounded-[32px] border border-gray-100 bg-white/90 p-6 shadow-[0_30px_120px_-60px_rgba(15,23,42,0.4)]">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.4em] text-gray-400">Session</p>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">今日の学習</h1>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <Badge className="bg-gray-100 text-gray-600">ID: {sessionId ?? "---"}</Badge>
              <Button variant="ghost" size="sm" onClick={handleCopyLink} className="text-gray-600 hover:text-gray-900">
                <Share2 className="h-4 w-4" />
                {copyState === "copied" ? "コピー完了" : "共有"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => fetchPlan()} className="text-gray-700">
                <RefreshCcw className="h-4 w-4" /> 再生成
              </Button>
            </div>
          </div>
          <div className="mt-6">
            <div className="h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full"
                style={{ width: `${progress * 100}%`, backgroundColor: ACCENT }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>
                {currentIndex + 1} / {questions.length || 0} 問
              </span>
              <span>
                難易度帯 {plan?.metadata.difficultyRange[0] ?? "-"} – {plan?.metadata.difficultyRange[1] ?? "-"}
              </span>
            </div>
          </div>
        </section>

        {loading ? (
          <StateCard icon={<Loader2 className="h-6 w-6 animate-spin" />} message="セッションを準備中です" />
        ) : error ? (
          <StateCard
            icon={<AlertTriangle className="h-6 w-6 text-rose-500" />}
            message={error}
            actionLabel="再試行"
            onAction={fetchPlan}
          />
        ) : (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,_1.05fr)_minmax(0,_0.95fr)]">
            <Card className="rounded-[32px] border-gray-100 bg-white/95 p-8 shadow-[0_30px_120px_-80px_rgba(15,23,42,0.5)]">
              {currentQuestion ? (
                <div className="flex h-full flex-col gap-6">
                  <header className="space-y-2">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">QUESTION</p>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <h2 className="text-3xl font-semibold tracking-tight text-gray-900">
                        {currentQuestion.word.word}
                      </h2>
                      <span className="text-sm text-gray-500">{currentQuestion.word.partOfSpeech ?? ""}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {basisLabel(currentQuestion.word.basis)} ／ score {currentQuestion.word.difficultyScore ?? "-"}
                    </p>
                  </header>

                  <div className="space-y-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-5">
                    <p className="text-base font-medium text-gray-900 leading-relaxed">{currentQuestion.sentence}</p>
                    <p className="text-sm text-gray-500 leading-relaxed">{currentQuestion.translation}</p>
                  </div>

                  <div className="space-y-3">
                    {currentQuestion.choices.map((choice) => {
                      const sheet = answers[currentQuestion.word.id];
                      const visual = choiceVisual(choice, sheet);
                      return (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => handleChoice(choice)}
                          className={cn(
                            "w-full rounded-2xl border px-4 py-3 text-left transition", visual.className,
                          )}
                        >
                          <span className="text-base font-semibold">{choice.label}</span>
                          {choice.hint && <span className="ml-2 text-xs text-gray-500">{choice.hint}</span>}
                          {visual.caption && (
                            <span className="ml-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                              {visual.caption}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-2 text-sm text-gray-600">
                    <InfoPill label="Master" />
                    <InfoPill label="Review" />
                    <InfoPill label="Again" />
                  </div>

                  <div className="mt-auto flex flex-wrap gap-3 pt-4">
                    <Button
                      variant="ghost"
                      onClick={() => setCurrentIndex((prev) => Math.max(prev - 1, 0))}
                      disabled={currentIndex === 0}
                      className="text-gray-700"
                    >
                      ← 前へ
                    </Button>
                    <Button
                      className="bg-[#c2255d] text-white hover:bg-[#a01d4d]"
                      onClick={() => setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1))}
                      disabled={currentIndex >= questions.length - 1}
                    >
                      次へ →
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">問題を読み込めませんでした。</p>
              )}
            </Card>

            <Card className="rounded-[32px] border-gray-100 bg-gradient-to-b from-white to-gray-50/70 p-8 shadow-[0_30px_120px_-90px_rgba(15,23,42,0.35)]">
              <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">AI COACH</p>
              <h3 className="mt-2 text-2xl font-semibold text-gray-900">言語の芯を静かに整理</h3>
              <p className="mt-1 text-sm text-gray-500">
                語源と類義語を落ち着いたトーンで提示し、セッション全体のテーマを把握します。
              </p>
              <div className="mt-6 space-y-4">
                {currentQuestion ? (
                  <>
                    <InsightBlock title="語源メモ" body={buildEtymology(currentQuestion.word)} />
                    <InsightBlock title="ニュアンス" body={buildNuance(currentQuestion.word)} />
                    <InsightBlock title="関連語" body={buildNeighborSummary(currentQuestion.word, plan?.words ?? [])} />
                  </>
                ) : (
                  <p className="text-sm text-gray-500">AI解説を準備しています…</p>
                )}
              </div>
              <div className="mt-6 rounded-2xl border border-gray-100 bg-white/80 p-5 text-sm leading-relaxed text-gray-600">
                Retentoでは最大3語のベース単語を先に選び、埋め込み空間で最も近い語を静かに補完します。回答結果はスワイプ操作と併せて復習キューに送られます。
              </div>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}

function buildSentence(word: string, index: number) {
  const base = index % 2 === 0 ? "She accepted the award with great" : "The researcher highlighted";
  const sentence = `${base} ${word} in her report.`;
  const translation = `彼女はレポートの中で ${word} の重要性を強調した。`;
  return { sentence, translation };
}

function pickDistractors(source: SessionWord, pool: SessionWord[], max: number): Choice[] {
  const candidates = pool.filter((item) => item.id !== source.id && item.meanings.length);
  return shuffle(candidates)
    .slice(0, max)
    .map((item) => ({
      id: `${source.id}-d-${item.id}`,
      label: item.meanings[0],
      hint: item.word,
      correct: false,
    }));
}

function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function basisLabel(basis: SessionWord["basis"] | undefined) {
  if (basis === "review") return "レビュー起点";
  if (basis === "neighbor") return "関連語";
  return "スコア推奨";
}

function choiceVisual(choice: Choice, sheet?: { state: "idle" | "correct" | "incorrect"; choiceId: string | null }) {
  if (!sheet || sheet.state === "idle") {
    return {
      className: "border-gray-200 bg-white hover:border-gray-300 text-gray-800",
      caption: undefined,
    };
  }

  if (choice.correct) {
    return {
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      caption: "CORRECT",
    };
  }

  if (sheet.choiceId === choice.id) {
    return {
      className: "border-rose-200 bg-rose-50 text-rose-700",
      caption: "YOUR PICK",
    };
  }

  return {
    className: "border-gray-100 bg-gray-50 text-gray-400",
    caption: undefined,
  };
}

function InfoPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-gray-200 px-4 py-1 text-xs font-semibold text-gray-600">
      {label}
    </span>
  );
}

function InsightBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white/85 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">{title}</p>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{body}</p>
    </div>
  );
}

function buildEtymology(word: SessionWord) {
  return `${word.word} は ${word.partOfSpeech ?? "語"}。RetentoのAIは語源を事前生成し、セッション開始時に瞬時に提示します。`;
}

function buildNuance(word: SessionWord) {
  return `この語は「${word.meanings[0] ?? "意味"}」の中でも静かな尊厳や信頼を帯びています。`;
}

function buildNeighborSummary(word: SessionWord, pool: SessionWord[]) {
  const related = pool
    .filter((item) => item.id !== word.id && item.meanings.length)
    .slice(0, 3)
    .map((item) => `${item.word}（${item.meanings[0]}）`);
  return related.length ? related.join(" / ") : "関連語を計算中です";
}

function StateCard({
  icon,
  message,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[32px] border border-gray-100 bg-white/90 py-16 text-gray-600 shadow-[0_30px_120px_-70px_rgba(15,23,42,0.4)]">
      <div className="text-gray-400">{icon}</div>
      <p className="text-sm">{message}</p>
      {actionLabel && onAction && (
        <Button className="bg-[#c2255d] text-white hover:bg-[#a01d4d]" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
