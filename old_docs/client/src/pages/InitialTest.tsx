import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { QuestionCard } from "@/components/QuestionCard";
import { FeedbackCard } from "@/components/FeedbackCard";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

type ConfidenceLevel = "not_learned" | "uncertain" | "perfect";

/**
 * 初回レベルテスト（30問）
 * リアルタイムでスコアを推定し、推定スコアに応じて次の問題を動的に選定
 */
export default function InitialTest() {
  const [, setLocation] = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [estimatedScore, setEstimatedScore] = useState(100); // 初期推定スコア
  const [answers, setAnswers] = useState<any[]>([]);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<number[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any | null>(null);
  
  // スワイプ関連の状態
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  const totalQuestions = 30;

  // 次の問題を取得
  const getNextQuestionQuery = trpc.initialTest.getNextQuestion.useQuery(
    {
      estimatedScore,
      answeredQuestionIds,
    },
    {
      enabled: false, // 手動で実行
    }
  );

  const submitTestMutation = trpc.initialTest.submit.useMutation();

  // 初回問題を取得
  useEffect(() => {
    if (currentQuestionIndex === 0 && !currentQuestion && !getNextQuestionQuery.isFetching) {
      loadNextQuestion();
    }
  }, []);

  const loadNextQuestion = async () => {
    try {
      const question = await getNextQuestionQuery.refetch();
      if (question.data) {
        setCurrentQuestion(question.data);
      } else {
        toast.error("問題の取得に失敗しました");
        setLocation("/");
      }
    } catch (error: any) {
      toast.error(error.message || "問題の取得に失敗しました");
      setLocation("/");
    }
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-6">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <Skeleton className="h-24 w-full mb-4" />
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-12 w-full mb-2" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);
  };

  // スワイプ開始
  const handleSwipeStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isAnswered) return;
    setIsDragging(true);
    setDragOffset({ x: 0, y: 0 });
  };

  // スワイプ中
  const handleSwipeMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !isAnswered) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      setDragOffset({
        x: clientX - centerX,
        y: clientY - centerY,
      });
    }
  };

  // スワイプ終了
  const handleSwipeEnd = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !isAnswered) return;

    setIsDragging(false);

    const { x, y } = dragOffset;
    const threshold = 80;

    let confidenceLevel: ConfidenceLevel | null = null;
    let direction: string | null = null;

    // 上スワイプを優先
    if (y < -threshold && Math.abs(y) > Math.abs(x)) {
      confidenceLevel = "perfect";
      direction = "up";
    }
    // 左スワイプ
    else if (x < -threshold && Math.abs(x) > Math.abs(y)) {
      confidenceLevel = "not_learned";
      direction = "left";
    }
    // 右スワイプ
    else if (x > threshold && Math.abs(x) > Math.abs(y)) {
      confidenceLevel = "uncertain";
      direction = "right";
    }

    if (confidenceLevel && direction) {
      setSwipeDirection(direction);

      // スコア推定アルゴリズム
      const newScore = calculateScoreUpdate(
        estimatedScore,
        currentQuestionIndex + 1,
        isCorrect,
        confidenceLevel,
        currentQuestion.difficultyScore
      );

      setEstimatedScore(newScore);

      // 回答を記録
      const newAnswer = {
        questionId: currentQuestion.id,
        selectedAnswer,
        correctAnswer: currentQuestion.correctAnswer,
        confidenceLevel: confidenceLevel === "not_learned" ? "forgot" : confidenceLevel,
        difficultyScore: currentQuestion.difficultyScore,
        isCorrect,
        estimatedScore: newScore,
      };

      const newAnswers = [...answers, newAnswer];
      setAnswers(newAnswers);
      setAnsweredQuestionIds([...answeredQuestionIds, currentQuestion.id]);

      // アニメーション後に次の問題へ
      setTimeout(async () => {
        if (currentQuestionIndex < totalQuestions - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedAnswer(null);
          setIsAnswered(false);
          setSwipeDirection(null);
          setDragOffset({ x: 0, y: 0 });
          
          // 次の問題を取得（推定スコアに基づく）
          await loadNextQuestion();
        } else {
          // テスト完了
          handleTestComplete(newAnswers, newScore);
        }
      }, 300);
    } else {
      // スワイプ距離が足りない場合は元に戻す
      setDragOffset({ x: 0, y: 0 });
    }
  };

  /**
   * スコア推定アルゴリズム
   */
  const calculateScoreUpdate = (
    currentScore: number,
    questionNumber: number,
    isCorrect: boolean,
    confidenceLevel: ConfidenceLevel,
    difficultyScore: number
  ): number => {
    let baseChange = 0;

    // 21-30問目は補正をかける（100% → 30%に線形減少）
    let multiplier = 1.0;
    if (questionNumber >= 21) {
      const progressIn21to30 = (questionNumber - 21) / 9; // 0.0 ~ 1.0
      multiplier = 1.0 - progressIn21to30 * 0.7; // 1.0 → 0.3
    }

    if (questionNumber <= 20) {
      // 1-20問目
      if (isCorrect && confidenceLevel === "perfect") {
        baseChange = 120;
      } else if (isCorrect && confidenceLevel === "uncertain") {
        baseChange = 25;
      } else if (isCorrect && confidenceLevel === "not_learned") {
        baseChange = -25;
      } else {
        // 不正解
        baseChange = -50;
      }
    } else {
      // 21-30問目
      if (isCorrect && confidenceLevel === "perfect") {
        baseChange = Math.round(120 * multiplier);
      } else if (isCorrect && confidenceLevel === "uncertain") {
        baseChange = Math.round(25 * multiplier);
      } else if (isCorrect && confidenceLevel === "not_learned") {
        baseChange = Math.round(-25 * multiplier);
      } else {
        // 不正解
        baseChange = Math.round(-50 * multiplier);
      }
    }

    let newScore = currentScore + baseChange;

    // 上限・下限を設ける
    if (newScore < 0) newScore = 0;
    if (newScore > 3400) newScore = 3400;

    return newScore;
  };

  const handleTestComplete = async (allAnswers: any[], finalScore: number) => {
    try {
      await submitTestMutation.mutateAsync({
        answers: allAnswers,
        finalScore,
      });

      toast.success("初回テストが完了しました！");
      setLocation("/initial-test-result?score=" + finalScore);
    } catch (error: any) {
      toast.error(error.message || "テスト結果の保存に失敗しました");
    }
  };

  // スワイプ方向の判定（視覚的フィードバック用）
  const getSwipeDirectionIndicator = () => {
    if (!isDragging || !isAnswered) return null;

    const { x, y } = dragOffset;
    const threshold = 80;

    // 上スワイプ
    if (y < -threshold / 2 && Math.abs(y) > Math.abs(x)) {
      const progress = Math.min(Math.abs(y) / threshold, 1);
      return { direction: "up", label: "完璧", color: "green", progress };
    }
    // 左スワイプ
    else if (x < -threshold / 2 && Math.abs(x) > Math.abs(y)) {
      const progress = Math.min(Math.abs(x) / threshold, 1);
      return { direction: "left", label: "覚えてない", color: "red", progress };
    }
    // 右スワイプ
    else if (x > threshold / 2 && Math.abs(x) > Math.abs(y)) {
      const progress = Math.min(Math.abs(x) / threshold, 1);
      return { direction: "right", label: "微妙", color: "orange", progress };
    }

    return null;
  };

  // スワイプアニメーション用のスタイル
  const getCardStyle = () => {
    const baseStyle: React.CSSProperties = {};

    if (swipeDirection) {
      // スワイプ完了時のアニメーション
      if (swipeDirection === "left") {
        return { transform: "translateX(-200%) rotate(-30deg)", transition: "transform 0.3s ease-out", opacity: 0 };
      } else if (swipeDirection === "right") {
        return { transform: "translateX(200%) rotate(30deg)", transition: "transform 0.3s ease-out", opacity: 0 };
      } else if (swipeDirection === "up") {
        return { transform: "translateY(-200%)", transition: "transform 0.3s ease-out", opacity: 0 };
      }
    } else if (isDragging) {
      // ドラッグ中
      const rotation = dragOffset.x / 10;
      let opacity = 1;
      let backgroundColor = "transparent";

      const swipeIndicator = getSwipeDirectionIndicator();
      if (swipeIndicator) {
        opacity = 1 - swipeIndicator.progress * 0.2;
        if (swipeIndicator.color === "red") {
          const intensity = Math.floor(swipeIndicator.progress * 100);
          backgroundColor = `rgba(239, 68, 68, ${intensity / 200})`;
        } else if (swipeIndicator.color === "orange") {
          const intensity = Math.floor(swipeIndicator.progress * 100);
          backgroundColor = `rgba(249, 115, 22, ${intensity / 200})`;
        } else if (swipeIndicator.color === "green") {
          const intensity = Math.floor(swipeIndicator.progress * 100);
          backgroundColor = `rgba(34, 197, 94, ${intensity / 200})`;
        }
      }

      return {
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
        transition: "none",
        opacity,
        backgroundColor,
      };
    } else {
      // 通常状態
      return {
        transform: "translate(0, 0) rotate(0deg)",
        transition: "transform 0.2s ease-out, opacity 0.2s ease-out, background-color 0.2s ease-out",
        opacity: 1,
      };
    }

    return baseStyle;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ヘッダー */}
      <header className="border-b border-border shrink-0">
        <div className="container max-w-6xl py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="text-sm">
            <ChevronLeft className="w-4 h-4 mr-1" />
            ホーム
          </Button>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-lg font-bold text-foreground">初回レベルテスト</div>
              <div className="text-xs text-muted-foreground">推定スコア: {estimatedScore}</div>
            </div>
          </div>
        </div>
      </header>

      {/* プログレスバー */}
      <div className="container max-w-6xl py-3 shrink-0">
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground whitespace-nowrap min-w-[60px] text-right">
            {currentQuestionIndex + 1} / {totalQuestions}
          </span>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="container max-w-6xl flex-1 flex items-center py-4">
        <div className="w-full grid lg:grid-cols-2 gap-6">
          {/* 問題カード（スワイプ可能） */}
          <div className="relative">
            <QuestionCard
              sentenceContext={currentQuestion.sentenceContext}
              sentenceJapanese={currentQuestion.sentenceJapanese}
              choices={[
                currentQuestion.choice1,
                currentQuestion.choice2,
                currentQuestion.choice3,
                currentQuestion.choice4,
              ]}
              correctAnswer={currentQuestion.correctAnswer}
              selectedAnswer={selectedAnswer}
              isAnswered={isAnswered}
              onAnswerSelect={handleAnswerSelect}
              cardRef={cardRef}
              isDragging={isDragging}
              dragOffset={dragOffset}
              swipeDirection={swipeDirection}
              onSwipeStart={handleSwipeStart}
              onSwipeMove={handleSwipeMove}
              onSwipeEnd={handleSwipeEnd}
              getCardStyle={getCardStyle}
              getSwipeDirectionIndicator={getSwipeDirectionIndicator}
            />
          </div>

          {/* フィードバックカード */}
          <FeedbackCard
            isAnswered={isAnswered}
            isCorrect={isCorrect}
            correctAnswer={currentQuestion.correctAnswer}
            selectedAnswer={selectedAnswer}
            feedbackForSelected={
              selectedAnswer === currentQuestion.choice1
                ? currentQuestion.feedbackForChoice1
                : selectedAnswer === currentQuestion.choice2
                ? currentQuestion.feedbackForChoice2
                : selectedAnswer === currentQuestion.choice3
                ? currentQuestion.feedbackForChoice3
                : selectedAnswer === currentQuestion.choice4
                ? currentQuestion.feedbackForChoice4
                : undefined
            }
            feedbackForCorrect={
              currentQuestion.correctAnswer === currentQuestion.choice1
                ? currentQuestion.feedbackForChoice1
                : currentQuestion.correctAnswer === currentQuestion.choice2
                ? currentQuestion.feedbackForChoice2
                : currentQuestion.correctAnswer === currentQuestion.choice3
                ? currentQuestion.feedbackForChoice3
                : currentQuestion.correctAnswer === currentQuestion.choice4
                ? currentQuestion.feedbackForChoice4
                : undefined
            }
            placeholder="選択肅を選んでください"
          />
        </div>
      </div>
    </div>
  );
}
