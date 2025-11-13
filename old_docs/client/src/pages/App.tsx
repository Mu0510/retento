import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SessionResult from "@/components/SessionResult";
import { Progress } from "@/components/ui/progress";
import { QuestionCard } from "@/components/QuestionCard";
import { FeedbackCard } from "@/components/FeedbackCard";
import { trpc } from "@/lib/trpc";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";

type ConfidenceLevel = "not_learned" | "uncertain" | "perfect";

export default function AppPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [sessionResults, setSessionResults] = useState<any[]>([]);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [sessionFeedback, setSessionFeedback] = useState<any>(null);
  
  // スワイプ状態
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  // 認証チェック
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      setLocation("/");
    }
  }, [loading, isAuthenticated, setLocation]);

  // セッションを開始
  const startSessionMutation = trpc.learning.startSession.useMutation();
  const calculateSessionScoreMutation = trpc.learning.calculateSessionScore.useMutation();
  const generateSessionFeedbackMutation = trpc.learning.generateSessionFeedback.useMutation();
  const [sessionData, setSessionData] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated && !sessionData && !startSessionMutation.isPending) {
      startSessionMutation.mutate(undefined, {
        onSuccess: (data) => {
          console.log("[Debug] Session data received:", data);
          console.log("[Debug] Questions:", data.questions);
          console.log("[Debug] Questions length:", data.questions?.length);
          setSessionData(data);
        },
        onError: (error) => {
          console.error("セッションの開始に失敗しました:", error);
        },
      });
    }
  }, [isAuthenticated, sessionData, startSessionMutation]);

  const currentQuestion = sessionData?.questions[currentQuestionIndex];
  const totalQuestions = sessionData?.questions.length || 0;
  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  const handleAnswerSelect = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);
  };

  const handleSwipeStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isAnswered) return;
    
    // タッチイベントの場合、デフォルトのスクロールを防止
    if ('touches' in e) {
      e.preventDefault();
    }
    
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPos.current = { x: clientX, y: clientY };
  };

  const handleSwipeMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !isAnswered) return;
    
    // タッチイベントの場合、デフォルトのスクロールを防止
    if ('touches' in e) {
      e.preventDefault();
    }
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;
    
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleSwipeEnd = () => {
    if (!isDragging || !isAnswered) return;
    
    setIsDragging(false);
    
    const { x, y } = dragOffset;
    const threshold = 80; // スワイプ判定の最小距離
    
    let confidenceLevel: ConfidenceLevel | null = null;
    let direction: string | null = null;
    
    // 上スワイプを優先（Y軸の負の方向）
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
      
      // 現在の問題の結果を記録
      const result = {
        word: currentQuestion.word,
        meaning: currentQuestion.correctAnswer,
        isCorrect: selectedAnswer === currentQuestion.correctAnswer,
        confidenceLevel: confidenceLevel,
      };
      
      // 新しい結果配列を作成
      const newResults = [...sessionResults, result];
      setSessionResults(newResults);
      
      // 5問目の回答時にフィードバック生成を事前開始
      if (currentQuestionIndex === 4) {
        // スコア計算とフィードバック生成を事前に開始
        calculateSessionScoreMutation.mutate(
          {
            sessionId: sessionData.sessionId,
            results: newResults,
          },
          {
            onSuccess: (scoreData: any) => {
              // スコアを保存（まだ表示はしない）
              setSessionFeedback({
                feedback: null,
                scoreBefore: scoreData.scoreBefore,
                scoreAfter: scoreData.scoreAfter,
                scoreDiff: scoreData.scoreDiff,
              });
              
              // フィードバック生成も開始
              generateSessionFeedbackMutation.mutate(
                {
                  sessionId: sessionData.sessionId,
                  results: newResults,
                },
                {
                  onSuccess: (feedbackData: any) => {
                    setSessionFeedback((prev: any) => ({
                      ...prev,
                      feedback: feedbackData.feedback,
                    }));
                  },
                }
              );
            },
          }
        );
      }

      // アニメーション後に次の問題へ
      setTimeout(() => {
        if (currentQuestionIndex < totalQuestions - 1) {
          setCurrentQuestionIndex(currentQuestionIndex + 1);
          setSelectedAnswer(null);
          setIsAnswered(false);
          setSwipeDirection(null);
          setDragOffset({ x: 0, y: 0 });
        } else {
          // セッション完了 - すぐに終了画面に移行
          setIsSessionComplete(true);
          
          // まずスコアを計算（高速）
          calculateSessionScoreMutation.mutate(
            {
              sessionId: sessionData.sessionId,
              results: newResults,
            },
            {
              onSuccess: (scoreData: any) => {
                // スコアをすぐ表示
                setSessionFeedback({
                  feedback: null,
                  scoreBefore: scoreData.scoreBefore,
                  scoreAfter: scoreData.scoreAfter,
                  scoreDiff: scoreData.scoreDiff,
                });
                
                // バックグラウンドでフィードバックを生成
                generateSessionFeedbackMutation.mutate(
                  {
                    sessionId: sessionData.sessionId,
                    results: newResults,
                  },
                  {
                    onSuccess: (feedbackData: any) => {
                      // フィードバックを追加
                      setSessionFeedback((prev: any) => ({
                        ...prev,
                        feedback: feedbackData.feedback,
                      }));
                    },
                    onError: (error: any) => {
                      console.error("フィードバック生成に失敗しました:", error);
                    },
                  }
                );
              },
              onError: (error: any) => {
                console.error("スコア計算に失敗しました:", error);
                console.error("Results:", newResults);
                // エラー時も0を表示
                setSessionFeedback({
                  feedback: null,
                  scoreBefore: 0,
                  scoreAfter: 0,
                  scoreDiff: 0,
                });
              },
            }
          );
        }
      }, 300);
    } else {
      // スワイプ距離が足りない場合は元に戻す
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // 認証チェック中またはセッション読み込み中
  if (loading || startSessionMutation.isPending || !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">
          {loading ? "読み込み中..." : "問題を生成中..."}
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // セッション終了画面
  if (isSessionComplete) {
    return (
      <SessionResult
        feedback={sessionFeedback?.feedback || null}
        scoreBefore={sessionFeedback?.scoreBefore || 0}
        scoreAfter={sessionFeedback?.scoreAfter || 0}
        scoreDiff={sessionFeedback?.scoreDiff || 0}
        results={sessionResults}
        onClose={() => setLocation("/")}
        onNextSession={() => {
          // セッションをリセットして新しいセッションを開始
          setIsSessionComplete(false);
          setSessionFeedback(null);
          setSessionResults([]);
          setCurrentQuestionIndex(0);
          setSelectedAnswer(null);
          setIsAnswered(false);
          setSwipeDirection(null);
          setDragOffset({ x: 0, y: 0 });
          setSessionData(null); // 重要：古いセッションデータをクリア
          startSessionMutation.mutate(undefined, {
            onSuccess: (data) => {
              setSessionData(data);
            },
          });
        }}
      />
    );
  }



  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">問題が見つかりません</p>
      </div>
    );
  }

  const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

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

  const swipeIndicator = getSwipeDirectionIndicator();

  // スワイプアニメーション用のスタイル
  const getCardStyle = () => {
    const baseStyle: React.CSSProperties = {};
    
    if (swipeDirection) {
      // スワイプ完了時のアニメーション
      if (swipeDirection === "left") {
        return { transform: "translateX(-150%) rotate(-20deg)", transition: "transform 0.3s ease-out", opacity: 0 };
      } else if (swipeDirection === "right") {
        return { transform: "translateX(150%) rotate(20deg)", transition: "transform 0.3s ease-out", opacity: 0 };
      } else if (swipeDirection === "up") {
        return { transform: "translateY(-150%)", transition: "transform 0.3s ease-out", opacity: 0 };
      }
    } else if (isDragging && swipeIndicator) {
      // ドラッグ中（視覚的フィードバック付き）
      const rotation = dragOffset.x * 0.1;
      const opacity = 1 - (swipeIndicator.progress * 0.3); // 最大30%透明に
      
      // 色の変化
      let backgroundColor = "transparent";
      if (swipeIndicator.color === "red") {
        const intensity = Math.floor(swipeIndicator.progress * 100);
        backgroundColor = `rgba(239, 68, 68, ${intensity / 200})`; // 最大50%の不透明度
      } else if (swipeIndicator.color === "orange") {
        const intensity = Math.floor(swipeIndicator.progress * 100);
        backgroundColor = `rgba(249, 115, 22, ${intensity / 200})`;
      } else if (swipeIndicator.color === "green") {
        const intensity = Math.floor(swipeIndicator.progress * 100);
        backgroundColor = `rgba(34, 197, 94, ${intensity / 200})`;
      }
      
      return { 
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`,
        transition: "none",
        opacity,
        backgroundColor
      };
    } else {
      // 通常状態
      return { transform: "translate(0, 0) rotate(0deg)", transition: "transform 0.2s ease-out, opacity 0.2s ease-out, background-color 0.2s ease-out", opacity: 1 };
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
          <div className="text-sm text-muted-foreground">
            {user?.name || "ゲスト"}
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
                ? currentQuestion.feedbackChoice1
                : selectedAnswer === currentQuestion.choice2
                ? currentQuestion.feedbackChoice2
                : selectedAnswer === currentQuestion.choice3
                ? currentQuestion.feedbackChoice3
                : selectedAnswer === currentQuestion.choice4
                ? currentQuestion.feedbackChoice4
                : undefined
            }
            feedbackForCorrect={currentQuestion.feedbackCorrect}
          />
        </div>
      </div>
    </div>
  );
}
