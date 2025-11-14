"use client";

import { CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

import { selectInitialTestQuestion } from "@/lib/initial-test/questions";
import type { InitialTestQuestionPayload } from "@/lib/initial-test/questions";
import type {
  InitialTestAnswerPayload,
  InitialTestResultDetails,
} from "@/lib/services/initial-test";

const TOTAL_QUESTIONS = 30;
const DEFAULT_ESTIMATE = 150;
const SWIPE_THRESHOLD = 80;

type SwipeDirection = "left" | "right" | "up" | null;
type ConfidenceLevel = "none" | "forget" | "iffy" | "perfect";

type SwipeIndicatorState = {
  direction: Exclude<SwipeDirection, null>;
  label: string;
  color: string;
  progress: number;
};

type CompletionState = {
  initialScore: number;
  calculatedWordScore: number;
  autoWordMarks: { wordId: number; confidence: "perfect" | "iffy" }[];
};

const SWIPE_META = {
  left: { label: "覚えてない", color: "#ef4444", confidence: "forget" as ConfidenceLevel },
  right: { label: "微妙", color: "#f97316", confidence: "iffy" as ConfidenceLevel },
  up: { label: "完璧", color: "#22c55e", confidence: "perfect" as ConfidenceLevel },
} as const;

const SWIPE_EXIT_TRANSFORMS: Record<Exclude<SwipeDirection, null>, string> = {
  left: "translate3d(-150%, -8%, 0) rotate(-15deg)",
  right: "translate3d(150%, -6%, 0) rotate(15deg)",
  up: "translate3d(0, -150%, 0) rotate(-4deg)",
};

const CONFIDENCE_BACKGROUND: Record<ConfidenceLevel, string> = {
  none: "#ffffff",
  forget: "#fee2e2",
  iffy: "#fff7ed",
  perfect: "#dcfce7",
};

const CONFIDENCE_BORDER: Record<ConfidenceLevel, string> = {
  none: "#e5e7eb",
  forget: "#f87171",
  iffy: "#fb923c",
  perfect: "#34d399",
};

export default function InitialTestPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InitialTestQuestionPayload | null>(null);
  const [answers, setAnswers] = useState<InitialTestAnswerPayload[]>([]);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<number[]>([]);
  const [estimatedScore, setEstimatedScore] = useState(DEFAULT_ESTIMATE);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [completion, setCompletion] = useState<CompletionState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("選択したらスワイプで自信度を送信");

  useEffect(() => {
    let cancelled = false;
    const initialize = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/initial-test/start", { method: "POST" });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error ?? "初回テストの準備に失敗しました");
        }
        if (payload?.completed) {
          if (!cancelled) {
            const details: InitialTestResultDetails | null = payload.testDetails ?? null;
            if (details) {
              setCompletion({
                initialScore: payload.initialScore ?? details.estimatedScore,
                calculatedWordScore: details.calculatedWordScore,
                autoWordMarks: details.autoWordMarks ?? [],
              });
              setIsSessionComplete(true);
            } else {
              setError("既に初回テストを完了しています");
            }
          }
          return;
        }
        const progress = payload?.progress;
        const resumedEstimate = typeof progress?.estimatedScore === "number" ? progress.estimatedScore : DEFAULT_ESTIMATE;
        const resumedIds = Array.isArray(progress?.answeredQuestionIds)
          ? progress.answeredQuestionIds.filter((id: unknown) => typeof id === "number")
          : [];
        const resumedAnswers: InitialTestAnswerPayload[] = Array.isArray(progress?.answers)
          ? progress.answers
          : [];

        if (!cancelled) {
          setAnswers(resumedAnswers);
          setAnsweredQuestionIds(resumedIds);
          setEstimatedScore(resumedEstimate);
          if (resumedIds.length >= TOTAL_QUESTIONS) {
            setIsSessionComplete(true);
            return;
          }
          const nextQuestion = selectInitialTestQuestion(resumedEstimate, resumedIds);
          setCurrentQuestion(nextQuestion);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "初回テストの開始に失敗しました");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    initialize();
    return () => {
      cancelled = true;
    };
  }, []);

  const progressPercent = useMemo(() => Math.min(100, (answers.length / TOTAL_QUESTIONS) * 100), [answers.length]);
  const swipeEnabled = Boolean(isAnswered && selectedChoiceId && currentQuestion && !isSessionComplete);
  const cardConfidence: ConfidenceLevel = swipeDirection
    ? swipeDirectionToConfidence(swipeDirection)
    : "none";

  const cardStyle = useMemo(() => {
    const baseStyle: CSSProperties = {
      borderColor: CONFIDENCE_BORDER[cardConfidence],
      backgroundColor: CONFIDENCE_BACKGROUND[cardConfidence],
      transform: "translate3d(0, 0, 0) rotate(0deg)",
      transition: "transform 0.22s ease-out, opacity 0.22s ease-out",
      opacity: 1,
      touchAction: swipeEnabled ? "none" : "auto",
    };

    if (swipeDirection) {
      return {
        ...baseStyle,
        transform: SWIPE_EXIT_TRANSFORMS[swipeDirection],
        opacity: 0,
        transition: "transform 0.3s ease-out, opacity 0.3s ease-out",
      };
    }

    if (isDragging) {
      const rotation = dragOffset.x * 0.08;
      const indicator = getSwipeIndicator(isDragging, swipeEnabled, dragOffset);
      const opacity = 1 - (indicator?.progress ?? 0) * 0.3;
      return {
        ...baseStyle,
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
        transition: "none",
        opacity,
      };
    }

    return baseStyle;
  }, [cardConfidence, dragOffset, isDragging, swipeDirection, swipeEnabled]);

  const indicator = useMemo(() => getSwipeIndicator(isDragging, swipeEnabled, dragOffset), [isDragging, swipeEnabled, dragOffset]);

  const handleChoiceSelect = useCallback(
    (choiceId: string) => {
      if (isAnswered) return;
      setSelectedChoiceId(choiceId);
      setIsAnswered(true);
      setStatusMessage("左右・上スワイプで自信度を記録できます");
    },
    [isAnswered],
  );

  const syncProgress = useCallback(async (
    updatedAnswers: InitialTestAnswerPayload[],
    updatedIds: number[],
    score: number,
  ) => {
    try {
      await fetch("/api/initial-test/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: updatedAnswers, answeredQuestionIds: updatedIds, estimatedScore: score }),
      });
    } catch (err) {
      console.warn("progress sync failed", err);
    }
  }, []);

  const submitFinalResult = useCallback(async (finalAnswers: InitialTestAnswerPayload[], finalScore: number) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/initial-test/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers, finalScore }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "結果の保存に失敗しました");
      }
      setCompletion({
        initialScore: payload.initialScore,
        calculatedWordScore: payload.calculatedWordScore,
        autoWordMarks: payload.autoWordMarks ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信中にエラーが発生しました");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  const processConfidence = useCallback(
    (confidence: ConfidenceLevel, question: InitialTestQuestionPayload, choiceId: string) => {
      const questionNumber = answers.length + 1;
      const selectedChoice = question.choices.find((choice) => choice.id === choiceId);
      const isCorrect = Boolean(selectedChoice?.isCorrect);
      const delta = computeScoreDelta(isCorrect, confidence);
      const nextScore = clampScoreChange(estimatedScore, delta, questionNumber);
      const payload: InitialTestAnswerPayload = {
        questionId: question.id,
        wordId: question.wordId,
        selectedAnswer: selectedChoice?.label ?? null,
        isCorrect,
        confidence: confidence === "none" ? "forget" : confidence,
        difficultyScore: question.difficultyScore,
        estimatedScore: nextScore,
        timestamp: new Date().toISOString(),
      };
      const updatedAnswers = [...answers, payload];
      const updatedIds = [...answeredQuestionIds, question.id];
      setAnswers(updatedAnswers);
      setAnsweredQuestionIds(updatedIds);
      setEstimatedScore(nextScore);
      void syncProgress(updatedAnswers, updatedIds, nextScore);
      if (updatedAnswers.length >= TOTAL_QUESTIONS) {
        setIsSessionComplete(true);
        void submitFinalResult(updatedAnswers, nextScore);
        return;
      }
      setTimeout(() => {
        if (updatedIds.length >= TOTAL_QUESTIONS) return;
        try {
          const nextQuestion = selectInitialTestQuestion(nextScore, updatedIds);
          setCurrentQuestion(nextQuestion);
          setSelectedChoiceId(null);
          setIsAnswered(false);
          setSwipeDirection(null);
          setDragOffset({ x: 0, y: 0 });
          setStatusMessage("次の問題に回答してください");
        } catch (err) {
          setError(err instanceof Error ? err.message : "次の問題を読み込めませんでした");
        }
      }, 320);
    },
    [answers, answeredQuestionIds, estimatedScore, syncProgress, submitFinalResult],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!swipeEnabled) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      setSwipeDirection(null);
      dragStartRef.current = { x: event.clientX, y: event.clientY };
      setDragOffset({ x: 0, y: 0 });
    },
    [swipeEnabled],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const deltaX = event.clientX - dragStartRef.current.x;
      const deltaY = Math.min(event.clientY - dragStartRef.current.y, 0);
      setDragOffset({ x: deltaX, y: deltaY });
    },
    [isDragging],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      setIsDragging(false);
      const result = detectSwipe(dragOffset.x, dragOffset.y);
      if (result && currentQuestion && selectedChoiceId) {
        setSwipeDirection(result.direction);
        processConfidence(result.confidence, currentQuestion, selectedChoiceId);
      } else {
        setDragOffset({ x: 0, y: 0 });
      }
    },
    [isDragging, dragOffset.x, dragOffset.y, currentQuestion, selectedChoiceId, processConfidence],
  );

  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
    },
    [isDragging],
  );

  const questionNumber = Math.min(TOTAL_QUESTIONS, answers.length + 1);
  const progressLabel = `${Math.min(answers.length + 1, TOTAL_QUESTIONS)}/${TOTAL_QUESTIONS}`;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f5f6fb] text-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-slate-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f5f6fb] text-slate-900 flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-semibold">{error}</p>
        <Button variant="outline" onClick={() => router.push("/app")}>アプリへ戻る</Button>
      </div>
    );
  }

  if (isSessionComplete && completion) {
    const perfectCount = completion.autoWordMarks.filter((mark) => mark.confidence === "perfect").length;
    const microCount = completion.autoWordMarks.filter((mark) => mark.confidence === "iffy").length;
    return (
      <div className="min-h-screen bg-[#f5f6fb] text-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-xl border border-slate-200 bg-white shadow-lg">
          <div className="space-y-4 p-6">
            <h1 className="text-2xl font-semibold text-slate-900">初回レベルテスト完了</h1>
            <div className="text-sm text-slate-600 space-y-1">
              <p>推定スコア: {completion.initialScore.toFixed(2)}</p>
              <p>算出された単語力スコア: {completion.calculatedWordScore.toFixed(2)}</p>
              <p>自動マーク: 完璧 {perfectCount} / 微妙 {microCount}</p>
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" onClick={() => router.push("/app")}>アプリを開く</Button>
              <Button variant="outline" className="flex-1" onClick={() => router.push("/")}>ランディング</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f6fb] text-slate-900 px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">推定スコア</p>
              <p className="text-3xl font-semibold text-slate-900">{estimatedScore.toFixed(0)}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-sm text-slate-500">問題番号</p>
              <p className="text-lg font-semibold text-slate-900">{progressLabel}</p>
            </div>
          </div>
          <div className="mt-4 h-2 rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${progressPercent}%` }} />
          </div>
        </header>

        <div className="relative">
          {indicator && (
            <div
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-semibold"
              style={{ color: indicator.color }}
            >
              {indicator.label}
            </div>
          )}
          <div
            className="rounded-3xl border border-slate-200 bg-white shadow-xl p-6 text-slate-900"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerCancel}
            onPointerCancel={handlePointerCancel}
            style={cardStyle}
          >
            <p className="text-sm text-slate-500">第{questionNumber}問 / {TOTAL_QUESTIONS}問</p>
            <p className="mt-4 text-2xl font-semibold leading-snug" style={{ minHeight: 88 }}>
              {currentQuestion ? (
                <span className="text-slate-900" dangerouslySetInnerHTML={{ __html: currentQuestion.sentenceContext }} />
              ) : (
                "次の問題を準備中..."
              )}
            </p>
            <p className="text-sm text-slate-500">{currentQuestion?.sentenceJapanese}</p>
            <div className="mt-6 grid gap-3">
              {currentQuestion?.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => handleChoiceSelect(choice.id)}
                  disabled={isAnswered}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-lg transition ${
                    selectedChoiceId === choice.id
                      ? "border-emerald-400 bg-emerald-100"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">{statusMessage}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p>回答と自信度でリアルタイムにスコアが動きます。スワイプを使って、自分の語彙力を感じてみてください。</p>
        </div>
      </div>
    </div>
  );
}

function computeScoreDelta(isCorrect: boolean, confidence: ConfidenceLevel) {
  if (!isCorrect) return -150;
  if (confidence === "perfect") return 200;
  if (confidence === "iffy") return 75;
  if (confidence === "forget") return -100;
  return 0;
}

function getMultiplier(questionNumber: number) {
  if (questionNumber <= 20) return 1;
  const progress = (questionNumber - 21) / 9;
  return Math.max(0, 1 - progress * 0.7);
}

function clampScore(value: number) {
  return Math.min(Math.max(value, 0), 10000);
}

function clampScoreChange(current: number, delta: number, questionNumber: number) {
  const multiplier = getMultiplier(questionNumber);
  return clampScore(current + Math.round(delta * multiplier));
}

function detectSwipe(offsetX: number, offsetY: number) {
  const absX = Math.abs(offsetX);
  const absY = Math.abs(offsetY);
  if (offsetY < -SWIPE_THRESHOLD && absY > absX) {
    return { direction: "up", confidence: "perfect" };
  }
  if (offsetX < -SWIPE_THRESHOLD && absX > absY) {
    return { direction: "left", confidence: "forget" };
  }
  if (offsetX > SWIPE_THRESHOLD && absX > absY) {
    return { direction: "right", confidence: "iffy" };
  }
  return null;
}

function getSwipeIndicator(isDragging: boolean, enabled: boolean, offset: { x: number; y: number }): SwipeIndicatorState | null {
  if (!isDragging || !enabled) return null;
  const { x, y } = offset;
  const half = SWIPE_THRESHOLD / 2;
  if (y < -half && Math.abs(y) > Math.abs(x)) {
    return { direction: "up", label: SWIPE_META.up.label, color: SWIPE_META.up.color, progress: Math.min(Math.abs(y) / SWIPE_THRESHOLD, 1) };
  }
  if (x < -half && Math.abs(x) > Math.abs(y)) {
    return { direction: "left", label: SWIPE_META.left.label, color: SWIPE_META.left.color, progress: Math.min(Math.abs(x) / SWIPE_THRESHOLD, 1) };
  }
  if (x > half && Math.abs(x) > Math.abs(y)) {
    return { direction: "right", label: SWIPE_META.right.label, color: SWIPE_META.right.color, progress: Math.min(Math.abs(x) / SWIPE_THRESHOLD, 1) };
  }
  return null;
}

function swipeDirectionToConfidence(direction: SwipeDirection): ConfidenceLevel {
  if (!direction) return "none";
  return SWIPE_META[direction].confidence;
}
