import { Card } from "@/components/ui/card";
import React from "react";

interface QuestionCardProps {
  sentenceContext: string;
  sentenceJapanese?: string;
  choices: string[];
  correctAnswer: string;
  selectedAnswer: string | null;
  isAnswered: boolean;
  onAnswerSelect: (choice: string) => void;
  // スワイプ機能用のprops
  cardRef?: React.RefObject<HTMLDivElement | null>;
  isDragging?: boolean;
  dragOffset?: { x: number; y: number };
  swipeDirection?: string | null;
  onSwipeStart?: (e: React.MouseEvent | React.TouchEvent) => void;
  onSwipeMove?: (e: React.MouseEvent | React.TouchEvent) => void;
  onSwipeEnd?: (e: React.MouseEvent | React.TouchEvent) => void;
  getCardStyle?: () => React.CSSProperties;
  getSwipeDirectionIndicator?: () => { direction: string; label: string; color: string; progress: number } | null;
}

export function QuestionCard({
  sentenceContext,
  sentenceJapanese,
  choices,
  correctAnswer,
  selectedAnswer,
  isAnswered,
  onAnswerSelect,
  cardRef,
  isDragging,
  dragOffset,
  swipeDirection,
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
  getCardStyle,
  getSwipeDirectionIndicator,
}: QuestionCardProps) {
  const isCorrect = selectedAnswer === correctAnswer;
  const swipeIndicator = getSwipeDirectionIndicator ? getSwipeDirectionIndicator() : null;

  return (
    <Card
      ref={cardRef}
      className={`p-6 flex flex-col justify-center min-h-[400px] relative ${
        isAnswered && onSwipeStart ? "cursor-grab active:cursor-grabbing select-none" : ""
      }`}
      style={{
        ...(getCardStyle ? getCardStyle() : {}),
        touchAction: isAnswered && onSwipeStart ? "none" : "auto",
      }}
      onMouseDown={onSwipeStart}
      onMouseMove={onSwipeMove}
      onMouseUp={onSwipeEnd}
      onMouseLeave={onSwipeEnd}
      onTouchStart={onSwipeStart}
      onTouchMove={onSwipeMove}
      onTouchEnd={onSwipeEnd}
    >
      {/* スワイプ方向インジケーター */}
      {swipeIndicator && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            {swipeIndicator.direction === "left" && (
              <>
                <div
                  className="w-0 h-0 border-t-[30px] border-t-transparent border-r-[50px] border-r-red-500 border-b-[30px] border-b-transparent"
                  style={{ opacity: swipeIndicator.progress }}
                />
                <span
                  className="text-2xl font-bold text-red-500"
                  style={{ opacity: swipeIndicator.progress }}
                >
                  {swipeIndicator.label}
                </span>
              </>
            )}
            {swipeIndicator.direction === "right" && (
              <>
                <div
                  className="w-0 h-0 border-t-[30px] border-t-transparent border-l-[50px] border-l-orange-500 border-b-[30px] border-b-transparent"
                  style={{ opacity: swipeIndicator.progress }}
                />
                <span
                  className="text-2xl font-bold text-orange-500"
                  style={{ opacity: swipeIndicator.progress }}
                >
                  {swipeIndicator.label}
                </span>
              </>
            )}
            {swipeIndicator.direction === "up" && (
              <>
                <div
                  className="w-0 h-0 border-l-[30px] border-l-transparent border-b-[50px] border-b-green-500 border-r-[30px] border-r-transparent"
                  style={{ opacity: swipeIndicator.progress }}
                />
                <span
                  className="text-2xl font-bold text-green-500"
                  style={{ opacity: swipeIndicator.progress }}
                >
                  {swipeIndicator.label}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div
          className="text-base text-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: sentenceContext }}
        />
        {/* 選択後に日本語訳を表示 */}
        {isAnswered && sentenceJapanese && (
          <p className="text-sm text-muted-foreground italic">{sentenceJapanese}</p>
        )}
      </div>
      <div className="h-4" />
      <div className="space-y-2">
        {choices.map((choice: string, index: number) => {
          const isSelected = selectedAnswer === choice;
          const isCorrectChoice = choice === correctAnswer;

          let bgColor = "bg-card";
          let hoverClass = isAnswered ? "" : "hover:bg-accent/10";

          if (isAnswered && isSelected) {
            bgColor = isCorrect
              ? "bg-green-100 dark:bg-green-900/20"
              : "bg-red-100 dark:bg-red-900/20";
          } else if (isAnswered && isCorrectChoice) {
            bgColor = "bg-green-100 dark:bg-green-900/20";
          }

          return (
            <button
              key={index}
              onClick={() => onAnswerSelect(choice)}
              disabled={isAnswered}
              className={`w-full p-3 rounded-lg border border-border text-left transition-colors ${bgColor} ${hoverClass} ${
                isAnswered ? "cursor-default pointer-events-none" : "cursor-pointer"
              }`}
            >
              <span className="text-foreground text-sm select-none">{choice}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
