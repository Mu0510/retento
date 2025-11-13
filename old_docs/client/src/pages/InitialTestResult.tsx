import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Award, TrendingUp } from "lucide-react";

/**
 * 初回テスト結果画面
 */
export default function InitialTestResult() {
  const [, setLocation] = useLocation();
  
  // URLパラメータからスコアを取得
  const params = new URLSearchParams(window.location.search);
  const score = parseInt(params.get("score") || "0");

  useEffect(() => {
    if (!score) {
      setLocation("/");
    }
  }, [score]);

  const getRankFromScore = (score: number): string => {
    if (score >= 3000) return "S+";
    if (score >= 2700) return "S";
    if (score >= 2400) return "S-";
    if (score >= 2100) return "A+";
    if (score >= 1800) return "A";
    if (score >= 1500) return "A-";
    if (score >= 1200) return "B+";
    if (score >= 900) return "B";
    if (score >= 600) return "B-";
    if (score >= 300) return "C+";
    if (score >= 100) return "C";
    return "D";
  };

  const getScoreDescription = (score: number): string => {
    if (score >= 3000) return "最高レベル！ネイティブレベルの語彙力です";
    if (score >= 2700) return "素晴らしい！難関大学レベルの語彙力です";
    if (score >= 2400) return "優秀！上位大学レベルの語彙力です";
    if (score >= 2100) return "良好！大学受験レベルの語彙力です";
    if (score >= 1800) return "標準的な大学受験レベルの語彙力です";
    if (score >= 1500) return "高校上級レベルの語彙力です";
    if (score >= 1200) return "高校中級レベルの語彙力です";
    if (score >= 900) return "高校初級レベルの語彙力です";
    if (score >= 600) return "中学上級レベルの語彙力です";
    if (score >= 300) return "中学レベルの語彙力です";
    return "基礎から学習を始めましょう";
  };

  const rank = getRankFromScore(score);
  const description = getScoreDescription(score);

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        {/* タイトル */}
        <div className="text-center">
          <Award className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            初回テスト完了！
          </h1>
          <p className="text-muted-foreground">
            あなたの初期単語力スコアが算出されました
          </p>
        </div>

        {/* スコア表示 */}
        <Card className="border-primary/20">
          <CardContent className="p-8">
            <div className="text-center space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">あなたのランク</p>
                <div className="text-6xl font-bold text-primary mb-4">{rank}</div>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-2">初期単語力スコア</p>
                <div className="text-4xl font-bold text-foreground">{score}</div>
              </div>

              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 説明 */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="w-5 h-5 text-primary mt-1" />
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  これから始まる学習について
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  初期スコアに基づいて、あなたに最適な単語が自動的に選定されました。
                  簡単すぎる単語は「完璧」、これから学習する単語は「微妙」として設定されています。
                  忘却曲線に基づいた復習スケジュールで、効率的に語彙力を伸ばしていきましょう！
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <h4 className="font-semibold text-foreground mb-2 text-sm">
                設定された単語の内訳
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 難易度 {Math.round(score * 0.8)} 以下の単語: 「完璧」に設定</li>
                <li>• 難易度 {Math.round(score * 0.8)} 以上の単語: 一部を「微妙」に設定</li>
                <li>• 単語力スコアが初期スコアに近づくように最適化</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* アクションボタン */}
        <div className="flex gap-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setLocation("/")}
          >
            ホームに戻る
          </Button>
          <Button
            className="flex-1"
            onClick={() => setLocation("/app")}
          >
            学習を開始する
          </Button>
        </div>
      </div>
    </div>
  );
}
