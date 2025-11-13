import { Card } from "@/components/ui/card";

interface FeedbackCardProps {
  isAnswered: boolean;
  isCorrect: boolean;
  correctAnswer: string;
  selectedAnswer: string | null;
  feedbackForSelected?: string;
  feedbackForCorrect?: string;
  placeholder?: string;
}

export function FeedbackCard({
  isAnswered,
  isCorrect,
  correctAnswer,
  selectedAnswer,
  feedbackForSelected,
  feedbackForCorrect,
  placeholder = "選択肢を選んでください",
}: FeedbackCardProps) {
  return (
    <Card className="p-6 flex flex-col justify-center min-h-[400px]">
      {!isAnswered ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground text-center text-sm">{placeholder}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              {isCorrect ? "正解！" : "不正解"}
            </h3>
            <p className="text-sm text-muted-foreground">正解: {correctAnswer}</p>
          </div>

          {/* AIフィードバック */}
          <div className="space-y-3">
            {/* 選択した答えに対するフィードバック */}
            {selectedAnswer && feedbackForSelected && (
              <div className="p-3 rounded-lg bg-accent/10 border border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-1">
                  {isCorrect ? "あなたの答え" : "選んだ答え"}
                </p>
                <p className="text-sm text-foreground">{feedbackForSelected}</p>
              </div>
            )}

            {/* 正解のフィードバック（不正解の場合のみ表示） */}
            {!isCorrect && feedbackForCorrect && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                  正解について
                </p>
                <p className="text-sm text-foreground">{feedbackForCorrect}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
