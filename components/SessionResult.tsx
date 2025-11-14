import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Lightbulb } from "lucide-react";

interface SessionResultProps {
  feedback: string | null;
  scoreBefore: number;
  scoreAfter: number;
  scoreDiff: number;
  results: {
    word: string;
    meaning: string;
    isCorrect: boolean;
    confidenceLevel: string;
  }[];
  onClose: () => void;
  onNextSession: () => void;
}

export default function SessionResult({
  feedback,
  scoreBefore,
  scoreAfter,
  scoreDiff,
  results,
  onClose,
  onNextSession,
}: SessionResultProps) {
  const getStatusIcon = (result: typeof results[0]) => {
    if (!result.isCorrect) return "✕";
    if (result.confidenceLevel === "perfect") return "◎";
    if (result.confidenceLevel === "uncertain") return "○";
    return "△";
  };

  const getStatusColor = (result: typeof results[0]) => {
    if (!result.isCorrect) return "text-black dark:text-white";
    if (result.confidenceLevel === "perfect") return "text-green-500";
    if (result.confidenceLevel === "uncertain") return "text-orange-500";
    return "text-red-500";
  };

  const formatScore = (score: number) => {
    if (score >= 100) {
      return { integer: Math.round(score).toString(), decimal: "" };
    } else if (score >= 10) {
      const rounded = Math.round(score * 10) / 10;
      const parts = rounded.toFixed(1).split(".");
      return { integer: parts[0], decimal: parts[1] };
    }
    const rounded = Math.round(score * 100) / 100;
    const parts = rounded.toFixed(2).split(".");
    return { integer: parts[0], decimal: parts[1] };
  };

  const scoreBeforeFormatted = formatScore(scoreBefore);
  const scoreAfterFormatted = formatScore(scoreAfter);

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl border-border">
        <CardContent className="space-y-6 pt-6">
          <div className="border border-border bg-card p-6 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">あなたの単語力スコア</p>
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-end">
                  <span className="text-3xl font-bold text-foreground">{scoreBeforeFormatted.integer}</span>
                  {scoreBeforeFormatted.decimal && (
                    <span className="text-xl font-bold text-foreground">.{scoreBeforeFormatted.decimal}</span>
                  )}
                </div>
                <span className="text-xl text-muted-foreground">→</span>
                <div className="flex items-end">
                  <span className="text-3xl font-bold text-foreground">{scoreAfterFormatted.integer}</span>
                  {scoreAfterFormatted.decimal && (
                    <span className="text-xl font-bold text-foreground">.{scoreAfterFormatted.decimal}</span>
                  )}
                </div>
              </div>
              {scoreDiff > 0 && (
                <p className="text-sm mt-2 text-primary font-medium">
                  +{scoreDiff.toPrecision(4)} ポイント上昇
                </p>
              )}
              {scoreDiff === 0 && (
                <p className="text-sm mt-2 text-muted-foreground">変化なし</p>
              )}
              {scoreDiff < 0 && (
                <p className="text-sm mt-2 text-muted-foreground">
                  {scoreDiff.toPrecision(4)} ポイント減少
                </p>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">今回の学習内容</h3>
            </div>
            <div className="space-y-2">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 border border-border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl font-bold ${getStatusColor(result)}`}>
                      {getStatusIcon(result)}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground">{result.word}</p>
                      <p className="text-sm text-muted-foreground">{result.meaning}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-border bg-card p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">学習アドバイス</h3>
            </div>
            {feedback ? (
              <p className="text-sm leading-relaxed text-foreground">{feedback}</p>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full bg-muted" />
                <Skeleton className="h-4 w-full bg-muted" />
                <Skeleton className="h-4 w-3/4 bg-muted" />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button onClick={onNextSession} className="flex-1" size="lg">
              次のセッションへ
            </Button>
            <Button onClick={onClose} variant="outline" size="lg" className="px-6">
              ホームに戻る
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
