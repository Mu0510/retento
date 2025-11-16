"use client";

import type { PointerEvent, ReactNode } from "react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, RefreshCcw, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import type { SessionPlanResponse } from "@/lib/session-builder";
import type { SessionChoice, SessionQuestion } from "@/types/questions";
import SessionResult from "@/components/SessionResult";

const ACCENT = "#c2255d";

type Answer = {
  state: "idle" | "correct" | "incorrect";
  choiceId: string | null;
};

type AnswerSheet = Record<number, Answer>;

type ConfidenceLevel = "none" | "forget" | "iffy" | "perfect";
type SwipeDirection = "left" | "right" | "up" | null;
type SwipeIndicatorState = {
  direction: Exclude<SwipeDirection, null>;
  label: string;
  color: string;
  progress: number;
};

function SessionPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [plan, setPlan] = useState<SessionPlanResponse | null>(null);
  const [questions, setQuestions] = useState<SessionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerSheet>({});
  const [confidenceMap, setConfidenceMap] = useState<Record<number, ConfidenceLevel>>({});
  const [completedCount, setCompletedCount] = useState(0);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [scoreBefore, setScoreBefore] = useState<number>(0);
  const [scoreAfter, setScoreAfter] = useState<number>(0);
  const [scoreDiff, setScoreDiff] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const submissionRequestedRef = useRef(false);

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

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentIndex(0);
    setAnswers({});
    setConfidenceMap({});
    setCompletedCount(0);
    setQuestions([]);
    setIsSessionComplete(false);
    submissionRequestedRef.current = false;
    try {
      const res = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionSize: 5 }),
      });
      let responseBody:
        | {
            error?: string;
            plan?: SessionPlanResponse;
            questions?: SessionQuestion[];
          }
        | null = null;
      try {
        responseBody = await res.json();
      } catch {
        // ignore parse errors for error responses
      }
      if (!res.ok) {
        const message = responseBody?.error ?? "セッションを生成できませんでした";
        throw new Error(message);
      }
      if (!responseBody || !responseBody.plan) {
        throw new Error("セッションデータを読み込めませんでした");
      }
      const fetchedPlan = responseBody.plan;
      const questions = Array.isArray(responseBody.questions) ? responseBody.questions : [];
      if (!questions.length) {
        throw new Error("問題データが空です");
      }
      setPlan(fetchedPlan);
      const planScore = fetchedPlan.metadata.userScore ?? 0;
      setScoreBefore(planScore);
      setScoreAfter(planScore);
      setScoreDiff(0);
      setQuestions(questions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "予期せぬエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    void fetchPlan();
  }, [sessionId, fetchPlan]);

  useEffect(() => {
    if (!questions.length) return;
    if (completedCount > 0 && completedCount >= questions.length) {
      setIsSessionComplete(true);
    }
  }, [completedCount, questions.length]);

  const handleRestart = useCallback(() => {
    setIsSessionComplete(false);
    submissionRequestedRef.current = false;
    setScoreBefore(0);
    setScoreAfter(0);
    setScoreDiff(0);
    void fetchPlan();
  }, [fetchPlan]);

  const feedbackResults = useMemo(
    () => buildFeedbackResults(questions, answers, confidenceMap),
    [questions, answers, confidenceMap],
  );

  useEffect(() => {
    if (!isSessionComplete || !questions.length) {
      return;
    }
    if (submissionRequestedRef.current) {
      return;
    }
    if (!feedbackResults.length) {
      return;
    }
    submissionRequestedRef.current = true;
    void (async () => {
      try {
        const submitResponse = await fetch("/api/sessions/answers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            results: feedbackResults.map((result) => ({
              wordId: result.wordId,
              confidence: result.confidence,
              isCorrect: result.isCorrect,
            })),
          }),
        });
        if (!submitResponse.ok) {
          throw new Error("結果記録に失敗しました");
        }
        const submitData = (await submitResponse.json()) as {
          scoreBefore: number;
          scoreAfter: number;
          scoreDiff: number;
        };
        setScoreBefore(submitData.scoreBefore);
        setScoreAfter(submitData.scoreAfter);
        setScoreDiff(submitData.scoreDiff);
      } catch (err) {
        setScoreDiff(0);
        console.error("[SessionPage] score update failed:", err);
      }
    })();
  }, [feedbackResults, isSessionComplete, questions.length]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length ? (currentIndex + 1) / questions.length : 0;
  const currentSheet = currentQuestion ? answers[currentQuestion.word.id] : undefined;
  const swipeEnabled = Boolean(currentSheet && currentSheet.state !== "idle");
  const currentQuestionId = currentQuestion?.word.id ?? null;
  const handleChoice = (choice: SessionChoice) => {
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

  const goToNextQuestion = useCallback(() => {
    setCurrentIndex((prev) => {
      if (!questions.length) return prev;
      return prev + 1 < questions.length ? prev + 1 : prev;
    });
  }, [questions.length]);

  const commitConfidence = useCallback(
    (wordId: number, level: ConfidenceLevel) => {
      let alreadyRecorded = false;
      setConfidenceMap((prev) => {
        if (prev[wordId]) {
          alreadyRecorded = true;
          return prev;
        }
        return { ...prev, [wordId]: level };
      });
      if (alreadyRecorded) return;
      setCompletedCount((prev) => prev + 1);
      void queueConfidenceRecord(wordId, level);
      setTimeout(() => {
        goToNextQuestion();
        setSwipeDirection(null);
        setDragOffset({ x: 0, y: 0 });
        setIsDragging(false);
      }, 250);
    },
    [goToNextQuestion],
  );

  const handlePointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!swipeEnabled) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
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
    if (result && currentQuestionId) {
      setSwipeDirection(result.direction);
      commitConfidence(currentQuestionId, result.level);
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
    },
    [commitConfidence, currentQuestionId, dragOffset.x, dragOffset.y, isDragging],
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
  }, [currentQuestionId]);

  const recordedConfidence =
    currentQuestionId && confidenceMap[currentQuestionId] ? confidenceMap[currentQuestionId] : "none";
  const previewConfidence = swipeDirection ? swipeDirectionToConfidence(swipeDirection) : "none";
  const displayConfidence = previewConfidence !== "none" ? previewConfidence : recordedConfidence;
  const baseCardBackground =
    displayConfidence !== "none" ? CONFIDENCE_BACKGROUND[displayConfidence] : "#ffffff";
  const baseCardBorder =
    displayConfidence !== "none" ? CONFIDENCE_BORDER[displayConfidence] : "#e5e7eb";

  const swipeIndicator = useMemo(
    () => getSwipeIndicator(isDragging, swipeEnabled, dragOffset),
    [dragOffset, isDragging, swipeEnabled],
  );

  const cardStyle = useMemo(() => {
    const defaultStyle = {
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
  }, [
    baseCardBackground,
    baseCardBorder,
    dragOffset.x,
    dragOffset.y,
    isDragging,
    swipeDirection,
    swipeIndicator,
    swipeEnabled,
  ]);

  const sessionResults = feedbackResults.map((result) => ({
    word: result.word,
    meaning: result.meaning,
    isCorrect: result.isCorrect,
    confidenceLevel:
      result.confidence === "perfect"
        ? "perfect"
        : result.confidence === "iffy"
          ? "uncertain"
          : "not_learned",
  }));

  if (isSessionComplete) {
      return (
        <SessionResult
          scoreBefore={scoreBefore}
          scoreAfter={scoreAfter}
          scoreDiff={scoreDiff}
          results={sessionResults}
          onClose={() => router.push("/")}
          onNextSession={handleRestart}
        />
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfdfd] text-gray-900">
      <main className="mx-auto w-[92vw] max-w-5xl px-4 py-12 space-y-8">
        <header className="space-y-4">
          <div className="flex items-center justify-start text-sm text-gray-500">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-gray-600 transition hover:text-gray-900"
              onClick={() => router.push("/")}
            >
              <ArrowLeft className="h-4 w-4" /> ホーム
            </button>
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
                      {renderSentence(currentQuestion.sentence, currentQuestion.word.word)}
                    </p>
                    <p
                      className={cn(
                        "min-h-[1.75rem] text-sm leading-snug transition-colors",
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
                              "w-full text-left p-4 rounded-lg border text-gray-700 flex items-center justify-between font-[450] text-[1.1rem] select-none",
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
                <p className="text-sm text-gray-500">問題を読み込めませんでした。</p>
              )}
            </div>

            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-xl">
              {currentQuestion ? (
                <FeedbackPanel
                  question={currentQuestion}
                  sheet={answers[currentQuestion.word.id]}
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

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fdfdfd] text-gray-900 flex items-center justify-center">
          <StateCard icon={<Loader2 className="h-6 w-6 animate-spin" />} message="セッションを読み込んでいます" />
        </div>
      }
    >
      <SessionPageContent />
    </Suspense>
  );
}

function choiceVisual(choice: SessionChoice, sheet?: Answer) {
  if (!sheet || sheet.state === "idle") {
    return "";
  }
  if (choice.correct) {
    return "border-emerald-200 bg-emerald-50";
  }
  if (sheet.choiceId === choice.id) {
    return "border-rose-200 bg-rose-50";
  }
  return "opacity-60";
}

function FeedbackPanel({ question, sheet }: { question: SessionQuestion; sheet?: Answer }) {
  if (!sheet || sheet.state === "idle") {
    return (
      <div className="flex h-full flex-col items-center justify-center text-sm text-gray-600">
        <p className="text-center text-base text-gray-500">選択肢を選んでください</p>
      </div>
    );
  }

  const correct = question.choices.find((choice) => choice.correct);
  const picked = question.choices.find((choice) => choice.id === sheet.choiceId);

  return (
    <div className="space-y-3 text-sm text-foreground">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground mb-1">
          {sheet.state === "correct" ? "正解！" : "不正解"}
        </h3>
        <p className="text-sm text-muted-foreground">正解: {correct?.label ?? "—"}</p>
      </div>

      <div className="space-y-3">
        {sheet.state === "incorrect" && picked && (
          <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm">
            <p className="text-xs font-semibold text-foreground">選んだ答え</p>
            <p className="text-sm leading-relaxed text-foreground">
              {picked.feedback ?? "フィードバックがありません"}
            </p>
          </div>
        )}

        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
          <p className="text-xs font-semibold text-green-700">正解について</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {correct?.feedback ?? "正解のフィードバックがありません"}
          </p>
        </div>
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
  const normalized = sentence.replace(/\s+/g, " ").trim();
  const withSpacing = normalized
    .replace(/([^\s])<u>/g, "$1 <u>")
    .replace(/<\/u>([^\s])/g, "</u> $1");
  const matches: { text: string; underline: boolean }[] = [];
  let lastIndex = 0;
  const regex = /<u>([\s\S]*?)<\/u>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(withSpacing)) !== null) {
    if (match.index > lastIndex) {
      matches.push({ text: withSpacing.slice(lastIndex, match.index), underline: false });
    }
    matches.push({ text: match[1], underline: true });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < withSpacing.length) {
    matches.push({ text: withSpacing.slice(lastIndex), underline: false });
  }

  if (matches.length === 0) {
    const pattern = new RegExp(`(\\b${escapeRegExp(keyword)}\\b)`, "i");
    const parts = normalized.split(pattern);
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

const SWIPE_THRESHOLD = 80;

const SWIPE_META = {
  left: { label: "覚えてない", color: "#ef4444", level: "forget" as ConfidenceLevel },
  right: { label: "微妙", color: "#f97316", level: "iffy" as ConfidenceLevel },
  up: { label: "完璧", color: "#22c55e", level: "perfect" as ConfidenceLevel },
} as const;

const SWIPE_EXIT_TRANSFORMS: Record<Exclude<SwipeDirection, null>, string> = {
  left: "translate3d(-150%, -8%, 0) rotate(-16deg)",
  right: "translate3d(150%, -6%, 0) rotate(16deg)",
  up: "translate3d(0, -150%, 0) rotate(-4deg)",
};

async function queueConfidenceRecord(wordId: number, level: ConfidenceLevel) {
  // TODO: implement persistence/API call
  return Promise.resolve({ wordId, level });
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

function swipeDirectionToConfidence(direction: SwipeDirection): ConfidenceLevel {
  if (!direction) return "none";
  return SWIPE_META[direction].level;
}

function detectSwipe(offsetX: number, offsetY: number) {
  const absX = Math.abs(offsetX);
  const absY = Math.abs(offsetY);

  if (offsetY < -SWIPE_THRESHOLD && absY > absX) {
    return { direction: "up" as const, level: SWIPE_META.up.level };
  }
  if (offsetX < -SWIPE_THRESHOLD && absX > absY) {
    return { direction: "left" as const, level: SWIPE_META.left.level };
  }
  if (offsetX > SWIPE_THRESHOLD && absX > absY) {
    return { direction: "right" as const, level: SWIPE_META.right.level };
  }
  return null;
}

function getSwipeIndicator(isDragging: boolean, enabled: boolean, offset: { x: number; y: number }): SwipeIndicatorState | null {
  if (!isDragging || !enabled) return null;
  const { x, y } = offset;
  const half = SWIPE_THRESHOLD / 2;

  if (y < -half && Math.abs(y) > Math.abs(x)) {
    const progress = Math.min(Math.abs(y) / SWIPE_THRESHOLD, 1);
    return { direction: "up", label: SWIPE_META.up.label, color: SWIPE_META.up.color, progress };
  }
  if (x < -half && Math.abs(x) > Math.abs(y)) {
    const progress = Math.min(Math.abs(x) / SWIPE_THRESHOLD, 1);
    return { direction: "left", label: SWIPE_META.left.label, color: SWIPE_META.left.color, progress };
  }
  if (x > half && Math.abs(x) > Math.abs(y)) {
    const progress = Math.min(Math.abs(x) / SWIPE_THRESHOLD, 1);
    return { direction: "right", label: SWIPE_META.right.label, color: SWIPE_META.right.color, progress };
  }
  return null;
}

function rgbaFromHex(colorHex: string, alpha: number) {
  const [r, g, b] = hexToRgb(colorHex);
  const clamped = Math.min(Math.max(alpha, 0), 1);
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

function shadowFromHex(colorHex: string, alpha: number) {
  return rgbaFromHex(colorHex, Math.min(Math.max(alpha, 0), 0.35));
}

type FeedbackResultPayload = {
  index: number;
  word: string;
  meaning: string;
  isCorrect: boolean;
  confidence: ConfidenceLevel;
  userAnswer: string | null;
  correctAnswer: string;
  sentence: string;
  translation: string;
  wordId: number;
};

function buildFeedbackResults(
  questions: SessionQuestion[],
  answers: AnswerSheet,
  confidenceMap: Record<number, ConfidenceLevel>,
): FeedbackResultPayload[] {
  return questions.map((question, index) => {
    const sheet = answers[question.word.id];
    const picked = sheet?.choiceId ? question.choices.find((choice) => choice.id === sheet.choiceId) : undefined;
    const correct = question.choices.find((choice) => choice.correct);
    return {
      index: index + 1,
      word: question.word.word,
      meaning: correct?.label ?? question.word.meanings[0] ?? "",
      isCorrect: sheet?.state === "correct",
      confidence: confidenceMap[question.word.id] ?? "none",
      userAnswer: picked?.label ?? null,
      correctAnswer: correct?.label ?? "",
      sentence: question.sentence,
      translation: question.translation,
      wordId: question.word.id,
    };
  });
}
