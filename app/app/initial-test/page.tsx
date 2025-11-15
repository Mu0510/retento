"use client";

import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { selectInitialTestQuestion } from "@/lib/initial-test/questions";
import type { InitialTestQuestionPayload } from "@/lib/initial-test/questions";
import type {
  InitialTestAnswerPayload,
  InitialTestResultDetails,
} from "@/lib/services/initial-test";

const TOTAL_QUESTIONS = 30;
const DEFAULT_ESTIMATE = 150;
const SWIPE_THRESHOLD = 80;
const ACCENT = "#c2255d";

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
  left: "translate3d(-150%, -8%, 0) rotate(-16deg)",
  right: "translate3d(150%, -6%, 0) rotate(16deg)",
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

function InitialTestPageContent() {
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

  const loadInitialTest = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setIsSessionComplete(false);
    setCompletion(null);
    setCurrentQuestion(null);
    setSelectedChoiceId(null);
    setIsAnswered(false);
    setSwipeDirection(null);
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });

    try {
      const response = await fetch("/api/initial-test/start", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error ?? "初回テストの準備に失敗しました");
      }

      if (payload?.completed) {
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
        return;
      }

      const progress = payload?.progress;
      const resumedEstimate =
        typeof progress?.estimatedScore === "number" ? progress.estimatedScore : DEFAULT_ESTIMATE;
      const resumedIds = Array.isArray(progress?.answeredQuestionIds)
        ? progress.answeredQuestionIds.filter((id: unknown) => typeof id === "number")
        : [];
      const resumedAnswers: InitialTestAnswerPayload[] = Array.isArray(progress?.answers)
        ? progress.answers
        : [];

      setAnswers(resumedAnswers);
      setAnsweredQuestionIds(resumedIds);
      setEstimatedScore(resumedEstimate);

      if (resumedIds.length >= TOTAL_QUESTIONS) {
        setIsSessionComplete(true);
        return;
      }

      const nextQuestion = selectInitialTestQuestion(resumedEstimate, resumedIds);
      setCurrentQuestion(nextQuestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : "初回テストの開始に失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadInitialTest();
  }, [loadInitialTest]);

  const syncProgress = useCallback(
    async (updatedAnswers: InitialTestAnswerPayload[], updatedIds: number[], score: number) => {
      try {
        await fetch("/api/initial-test/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: updatedAnswers, answeredQuestionIds: updatedIds, estimatedScore: score }),
        });
      } catch (err) {
        console.warn("progress sync failed", err);
      }
    },
    [],
  );

  const submitFinalResult = useCallback(
    async (finalAnswers: InitialTestAnswerPayload[], finalScore: number) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
        const response = await fetch("/api/initial-test/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: finalAnswers, finalScore }),
        });
        const payload = await response.json().catch(() => ({}));
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
    },
    [isSubmitting],
  );

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
      setSelectedChoiceId(null);
      setIsAnswered(false);
      void syncProgress(updatedAnswers, updatedIds, nextScore);

      if (updatedAnswers.length >= TOTAL_QUESTIONS) {
        setCurrentQuestion(null);
        setIsSessionComplete(true);
        void submitFinalResult(updatedAnswers, nextScore);
        return;
      }

      setTimeout(() => {
        if (updatedIds.length >= TOTAL_QUESTIONS) return;
        try {
          const nextQuestion = selectInitialTestQuestion(nextScore, updatedIds);
          setCurrentQuestion(nextQuestion);
          setSwipeDirection(null);
          setDragOffset({ x: 0, y: 0 });
          setIsDragging(false);
        } catch (err) {
          setError(err instanceof Error ? err.message : "次の問題を読み込めませんでした");
        }
      }, 320);
    },
    [answers, answeredQuestionIds, estimatedScore, submitFinalResult, syncProgress],
  );

  const handleChoiceSelect = useCallback(
    (choiceId: string) => {
      if (isAnswered || !currentQuestion) return;
      setSelectedChoiceId(choiceId);
      setIsAnswered(true);
    },
    [isAnswered, currentQuestion],
  );

  const swipeEnabled = Boolean(isAnswered && selectedChoiceId && currentQuestion && !isSessionComplete);

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
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
    (event: PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      const deltaX = event.clientX - dragStartRef.current.x;
      const deltaY = Math.min(event.clientY - dragStartRef.current.y, 0);
      setDragOffset({ x: deltaX, y: deltaY });
    },
    [isDragging],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
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
    [currentQuestion, dragOffset.x, dragOffset.y, isDragging, processConfidence, selectedChoiceId],
  );

  const handlePointerCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      setIsDragging(false);
      setDragOffset({ x: 0, y: 0 });
    },
    [isDragging],
  );

  useEffect(() => {
    setSwipeDirection(null);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, [currentQuestion?.id]);

  const swipeIndicator = useMemo(
    () => getSwipeIndicator(isDragging, swipeEnabled, dragOffset),
    [dragOffset, isDragging, swipeEnabled],
  );

  const previewConfidence = swipeDirection
    ? swipeDirectionToConfidence(swipeDirection)
    : swipeIndicator
      ? swipeDirectionToConfidence(swipeIndicator.direction)
      : "none";
  const baseCardBackground =
    previewConfidence !== "none" ? CONFIDENCE_BACKGROUND[previewConfidence] : "#ffffff";
  const baseCardBorder = previewConfidence !== "none" ? CONFIDENCE_BORDER[previewConfidence] : "#e5e7eb";

  const cardStyle = useMemo<CSSProperties>(() => {
    const defaultStyle: CSSProperties = {
      borderColor: baseCardBorder,
      backgroundColor: baseCardBackground,
      transform: "translate3d(0, 0, 0) rotate(0deg)",
      transition: "transform 0.2s ease-out, opacity 0.2s ease-out",
      opacity: 1,
      touchAction: swipeEnabled ? "none" : "auto",
    };

    if (swipeDirection) {
      return {
        ...defaultStyle,
        transform: SWIPE_EXIT_TRANSFORMS[swipeDirection],
        opacity: 0,
        transition: "transform 0.3s ease-out, opacity 0.3s ease-out",
      };
    }

    if (isDragging && swipeIndicator) {
      const rotation = dragOffset.x * 0.08;
      const opacity = 1 - swipeIndicator.progress * 0.3;
      const shadow = shadowFromHex(swipeIndicator.color, swipeIndicator.progress * 0.35);
      return {
        ...defaultStyle,
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
        transition: "none",
        opacity,
        boxShadow: `0 20px 60px ${shadow}`,
      };
    }

    return defaultStyle;
  }, [baseCardBackground, baseCardBorder, dragOffset.x, dragOffset.y, isDragging, swipeDirection, swipeIndicator, swipeEnabled]);

  const progress = Math.min(answers.length / TOTAL_QUESTIONS, 1);
  const questionIndex = Math.min(answers.length + (currentQuestion ? 1 : 0), TOTAL_QUESTIONS);

  if (isSessionComplete) {
    if (!completion) {
      if (error) {
        return (
          <div className="min-h-screen bg-[#fdfdfd] text-gray-900 flex items-center justify-center">
            <StateCard
              icon={<RefreshCcw className="h-6 w-6 text-gray-500" />}
              message={error}
              actionLabel="アプリへ戻る"
              onAction={() => router.push("/app")}
            />
          </div>
        );
      }
      return (
        <div className="min-h-screen bg-[#fdfdfd] text-gray-900 flex items-center justify-center">
          <StateCard icon={<Loader2 className="h-6 w-6 animate-spin" />} message="結果を保存しています" />
        </div>
      );
    }

    const perfectCount = completion.autoWordMarks.filter((mark) => mark.confidence === "perfect").length;
    const microCount = completion.autoWordMarks.filter((mark) => mark.confidence === "iffy").length;

    return (
      <div className="min-h-screen bg-[#fdfdfd] text-gray-900 flex items-center justify-center p-6">
        <Card className="w-full max-w-xl border border-gray-200 bg-white shadow-2xl">
          <div className="space-y-6 p-8">
            <h1 className="text-2xl font-semibold text-gray-900">初回レベルテスト完了</h1>
            <div className="space-y-2 text-sm text-gray-600">
              <p>推定スコア: {completion.initialScore.toFixed(2)}</p>
              <p>算出された単語力スコア: {completion.calculatedWordScore.toFixed(2)}</p>
              <p>自動マーク: 完璧 {perfectCount} / 微妙 {microCount}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1" onClick={() => router.push("/app")}>アプリを開く</Button>
              <Button variant="outline" className="flex-1" onClick={() => router.push("/")}>ランディング</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-gray-900">
      <main className="mx-auto w-[92vw] max-w-5xl px-4 py-12 space-y-8">
        <header className="space-y-4">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-gray-600 transition hover:text-gray-900"
              onClick={() => router.push("/app")}
            >
              <ArrowLeft className="h-4 w-4" /> アプリ
            </button>
            <div className="text-right">
              <p className="text-[0.7rem] uppercase tracking-wide text-gray-400">推定スコア</p>
              <p className="text-lg font-semibold text-gray-900">{estimatedScore.toFixed(0)}</p>
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
              {questionIndex} / {TOTAL_QUESTIONS} 問
            </span>
          </div>
        </header>

        {isLoading ? (
          <StateCard icon={<Loader2 className="h-6 w-6 animate-spin" />} message="テストを準備中です" />
        ) : error ? (
          <StateCard
            icon={<RefreshCcw className="h-6 w-6 text-gray-500" />}
            message={error}
            actionLabel="再試行"
            onAction={loadInitialTest}
          />
        ) : (
          <section className="grid gap-8 md:grid-cols-2">
            <div>
              {currentQuestion ? (
                <div
                  className={cn(
                    "relative overflow-hidden rounded-lg p-6 border shadow-xl select-none",
                    swipeEnabled ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                  )}
                  style={cardStyle}
                  onPointerDown={swipeEnabled ? handlePointerDown : undefined}
                  onPointerMove={swipeEnabled ? handlePointerMove : undefined}
                  onPointerUp={swipeEnabled ? handlePointerUp : undefined}
                  onPointerCancel={swipeEnabled ? handlePointerCancel : undefined}
                  onPointerDownCapture={swipeEnabled ? handlePointerDown : undefined}
                  onPointerMoveCapture={swipeEnabled ? handlePointerMove : undefined}
                  onPointerUpCapture={swipeEnabled ? handlePointerUp : undefined}
                  onPointerCancelCapture={swipeEnabled ? handlePointerCancel : undefined}
                >
                  <div className="relative z-10 space-y-4">
                    <p className="text-gray-700 leading-relaxed text-lg">
                      {renderSentence(currentQuestion.sentenceContext)}
                    </p>
                    <p
                      className={cn(
                        "min-h-[1.75rem] text-sm leading-snug transition-colors",
                        isAnswered ? "text-gray-500" : "text-gray-300",
                      )}
                    >
                      {isAnswered ? currentQuestion.sentenceJapanese : "　"}
                    </p>
                    <div className="space-y-3">
                      {currentQuestion.choices.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          onClick={() => handleChoiceSelect(choice.id)}
                          className={cn(
                            "w-full text-left p-4 rounded-lg border text-gray-700 flex items-center justify-between font-[450] text-[1.05rem] select-none transition",
                            choiceVisual(choice, isAnswered, selectedChoiceId),
                          )}
                        >
                          <span>{choice.label}</span>
                          {isAnswered && choice.isCorrect && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  {swipeIndicator && (
                    <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-2">
                      {swipeIndicator.direction === "left" && (
                        <>
                          <div
                            className="w-0 h-0 border-t-[34px] border-t-transparent border-r-[70px] border-b-[34px] border-b-transparent"
                            style={{ borderRightColor: swipeIndicator.color, opacity: swipeIndicator.progress }}
                          />
                          <span
                            className="text-2xl font-bold"
                            style={{ color: swipeIndicator.color, opacity: swipeIndicator.progress }}
                          >
                            {swipeIndicator.label}
                          </span>
                        </>
                      )}
                      {swipeIndicator.direction === "right" && (
                        <>
                          <div
                            className="w-0 h-0 border-t-[34px] border-t-transparent border-l-[70px] border-b-[34px] border-b-transparent"
                            style={{ borderLeftColor: swipeIndicator.color, opacity: swipeIndicator.progress }}
                          />
                          <span
                            className="text-2xl font-bold"
                            style={{ color: swipeIndicator.color, opacity: swipeIndicator.progress }}
                          >
                            {swipeIndicator.label}
                          </span>
                        </>
                      )}
                      {swipeIndicator.direction === "up" && (
                        <>
                          <div
                            className="w-0 h-0 border-l-[34px] border-l-transparent border-r-[34px] border-r-transparent border-b-[70px]"
                            style={{ borderBottomColor: swipeIndicator.color, opacity: swipeIndicator.progress }}
                          />
                          <span
                            className="text-2xl font-bold"
                            style={{ color: swipeIndicator.color, opacity: swipeIndicator.progress }}
                          >
                            {swipeIndicator.label}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <StateCard icon={<Loader2 className="h-6 w-6 animate-spin" />} message="問題を読み込んでいます" />
              )}
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-xl">
              {currentQuestion ? (
                <InitialTestFeedbackPanel
                  question={currentQuestion}
                  isAnswered={isAnswered}
                  selectedChoiceId={selectedChoiceId}
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

export default function InitialTestPage() {
  return <InitialTestPageContent />;
}

function choiceVisual(
  choice: InitialTestQuestionPayload["choices"][number],
  isAnswered: boolean,
  selectedChoiceId: string | null,
) {
  if (!isAnswered) {
    return "";
  }
  if (choice.isCorrect) {
    return "border-emerald-200 bg-emerald-50";
  }
  if (selectedChoiceId === choice.id) {
    return "border-rose-200 bg-rose-50";
  }
  return "opacity-60";
}

function InitialTestFeedbackPanel({
  question,
  isAnswered,
  selectedChoiceId,
}: {
  question: InitialTestQuestionPayload;
  isAnswered: boolean;
  selectedChoiceId: string | null;
}) {
  if (!isAnswered || !selectedChoiceId) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-sm text-gray-600">
        <p className="text-center text-base text-gray-500">選択肢を選んでください</p>
      </div>
    );
  }

  const picked = question.choices.find((choice) => choice.id === selectedChoiceId) ?? null;
  const correct = question.choices.find((choice) => choice.isCorrect) ?? null;
  const isCorrect = picked?.isCorrect ?? false;

  return (
    <div className="space-y-4 text-sm text-foreground">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">
          {isCorrect ? "正解！" : "不正解"}
        </h3>
        <p className="text-sm text-muted-foreground">正解: {correct?.label ?? "—"}</p>
      </div>

      {!isCorrect && picked && (
        <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm">
          <p className="text-xs font-semibold text-foreground">選んだ答え</p>
          <p className="text-sm leading-relaxed text-foreground">
            {picked.feedback ?? "フィードバックがありません"}
          </p>
        </div>
      )}

      <div className="space-y-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
        <p className="text-xs font-semibold text-green-700">正解について</p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">
          {correct?.feedback ?? "正解のフィードバックがありません"}
        </p>
      </div>
    </div>
  );
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
    <div className="flex flex-col items-center gap-4 rounded-[24px] border border-gray-100 bg-white py-16 text-gray-600">
      <div className="text-gray-400">{icon}</div>
      <p className="px-6 text-center text-sm">{message}</p>
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

function renderSentence(sentence: string) {
  const normalized = sentence.replace(/\s+/g, " ").trim();
  const matches: { text: string; underline: boolean }[] = [];
  let lastIndex = 0;
  const regex = /<u>([\s\S]*?)<\/u>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      matches.push({ text: normalized.slice(lastIndex, match.index), underline: false });
    }
    matches.push({ text: match[1], underline: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < normalized.length) {
    matches.push({ text: normalized.slice(lastIndex), underline: false });
  }

  if (!matches.length) {
    return normalized;
  }

  return matches.map((segment, index) => {
    if (segment.underline) {
      return (
        <span key={`underline-${index}`} className="border-b-2 border-[#c2255d]">
          {segment.text}
        </span>
      );
    }
    return <span key={`text-${index}`}>{segment.text}</span>;
  });
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
    return { direction: "up" as const, confidence: "perfect" as ConfidenceLevel };
  }
  if (offsetX < -SWIPE_THRESHOLD && absX > absY) {
    return { direction: "left" as const, confidence: "forget" as ConfidenceLevel };
  }
  if (offsetX > SWIPE_THRESHOLD && absX > absY) {
    return { direction: "right" as const, confidence: "iffy" as ConfidenceLevel };
  }
  return null;
}

function getSwipeIndicator(
  isDragging: boolean,
  enabled: boolean,
  offset: { x: number; y: number },
): SwipeIndicatorState | null {
  if (!isDragging || !enabled) return null;
  const { x, y } = offset;
  const half = SWIPE_THRESHOLD / 2;

  if (y < -half && Math.abs(y) > Math.abs(x)) {
    return {
      direction: "up",
      label: SWIPE_META.up.label,
      color: SWIPE_META.up.color,
      progress: Math.min(Math.abs(y) / SWIPE_THRESHOLD, 1),
    };
  }
  if (x < -half && Math.abs(x) > Math.abs(y)) {
    return {
      direction: "left",
      label: SWIPE_META.left.label,
      color: SWIPE_META.left.color,
      progress: Math.min(Math.abs(x) / SWIPE_THRESHOLD, 1),
    };
  }
  if (x > half && Math.abs(x) > Math.abs(y)) {
    return {
      direction: "right",
      label: SWIPE_META.right.label,
      color: SWIPE_META.right.color,
      progress: Math.min(Math.abs(x) / SWIPE_THRESHOLD, 1),
    };
  }
  return null;
}

function swipeDirectionToConfidence(direction: Exclude<SwipeDirection, null>) {
  return SWIPE_META[direction].confidence;
}

function shadowFromHex(colorHex: string, alpha: number) {
  const [r, g, b] = hexToRgb(colorHex);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(Math.max(alpha, 0), 1)})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return [r, g, b];
}
