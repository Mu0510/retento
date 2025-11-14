"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AppHome() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDiff, setLastDiff] = useState<number | null>(null);
  const [debugLog, setDebugLog] = useState<string>("デバッグログ:");

  const fetchScore = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/user/score", { credentials: "same-origin" });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error ?? "スコア取得に失敗しました");
      }
      const data = (await response.json()) as { score?: number };
      setScore(typeof data.score === "number" ? data.score : 0);
      setLastDiff(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "スコア取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const refreshScore = useCallback(async () => {
    if (!isAuthenticated || !session?.user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${session.user.id}/recalculate-score`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error ?? "スコア再計算に失敗しました");
      }
      const data = (await response.json()) as { scoreBefore: number; scoreAfter: number; scoreDiff: number };
      setScore(data.scoreAfter);
      setLastDiff(data.scoreDiff);
    } catch (err) {
      setError(err instanceof Error ? err.message : "スコア再計算に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, session]);

  useEffect(() => {
    void fetchScore();
  }, [fetchScore]);

  const formatScore = (value: number | null) => {
    if (value === null) return "—";
    return value.toFixed(2);
  };

  const appendDebug = (message: string) => {
    setDebugLog((prev) => `${prev}\n${new Date().toISOString()}: ${message}`);
  };

  return (
    <div className="min-h-screen bg-white py-12">
      <div className="mx-auto w-[90vw] max-w-[1100px]">
        <Card className="border border-border shadow-lg">
          <div className="flex flex-col items-start gap-4 px-6 py-8">
            <h1 className="text-2xl font-semibold text-foreground">Retento アプリホーム</h1>
            {!isAuthenticated && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  ログインすると単語力スコアや学習履歴、次のセッションに進むことができます。
                </p>
                <Button onClick={() => signIn("google")}>ログインして始める</Button>
              </div>
            )}
            {isAuthenticated && (
              <div className="w-full space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">現在の単語力スコア</p>
                    <p className="text-3xl font-semibold text-gray-900">
                      {loading ? (
                        <span className="inline-flex items-center gap-2 text-base">
                          <Loader2 className="animate-spin w-5 h-5" />
                          計算中...
                        </span>
                      ) : (
                        formatScore(score)
                      )}
                    </p>
                    {lastDiff !== null && (
                      <p className={`text-sm ${lastDiff >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        {lastDiff >= 0 ? `+${lastDiff.toFixed(2)} 上昇` : `${lastDiff.toFixed(2)} 減少`}
                      </p>
                    )}
              {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" size="md" onClick={fetchScore} disabled={loading}>
                再読み込み
              </Button>
                    <Button size="md" onClick={refreshScore} disabled={loading}>
                      スコア再計算
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  「スコア再計算」はユーザーの全自信度を集計して再評価します。セッション終了時と別途実行できます。
                </p>
                <Button variant="ghost" className="w-full text-left" onClick={() => window.location.assign('/app/session')}>
                  セッションを開始する →
                </Button>
              </div>
            )}
            {isAuthenticated && (
              <div className="border-t border-dashed border-border mt-8 pt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/user/score", { credentials: "same-origin" });
                        const body = await res.json().catch(() => ({}));
                        appendDebug(`GET /api/user/score ${res.status} ${JSON.stringify(body)}`);
                      } catch (err) {
                        appendDebug(`GET /api/user/score error: ${err}`);
                      }
                    }}
                  >
                    スコア取得確認
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      if (!session?.user?.id) {
                        appendDebug("No user ID for recalc");
                        return;
                      }
                      try {
                        const res = await fetch(`/api/users/${session.user.id}/recalculate-score`, {
                          method: "POST",
                          credentials: "same-origin",
                        });
                        const body = await res.json().catch(() => ({}));
                        appendDebug(`POST recalc ${res.status} ${JSON.stringify(body)}`);
                      } catch (err) {
                        appendDebug(`POST recalc error: ${err}`);
                      }
                    }}
                  >
                    再計算確認
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      appendDebug(`document.cookie: ${document.cookie}`);
                    }}
                  >
                    Cookie表示
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/auth/session", { credentials: "same-origin" });
                        const body = await res.json().catch(() => ({}));
                        appendDebug(`GET /api/auth/session ${res.status} ${JSON.stringify(body)}`);
                      } catch (err) {
                        appendDebug(`GET /api/auth/session error: ${err}`);
                      }
                    }}
                  >
                    セッション確認
                  </Button>
                </div>
                <pre className="text-xs font-mono whitespace-pre-wrap bg-gray-50 rounded-md p-3 h-32 overflow-y-auto text-gray-600">
                  {debugLog}
                </pre>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
