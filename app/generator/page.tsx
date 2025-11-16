'use client';
import { useCallback, useEffect, useMemo, useState } from "react";

type StatusPayload = {
  status: string;
  note: string;
  sessionId?: string;
  progress?: number;
  total?: number | null;
  startWordId?: number | null;
  parallel?: number | null;
  updatedAt?: string;
  totalWords?: number | null;
  failures?: number;
  patternCount?: number | null;
};

type DbCountIssue = {
  wordId: number | null;
  word: string;
  count: number;
};

type DbTagIssue = {
  id: string | null;
  wordId: number | null;
  word: string;
  sentence: string;
  reason: string;
};

type DbCheckSummary = {
  totalQuestions: number;
  uniqueWords: number;
  wordIdRange: { min: number | null; max: number | null };
  questionIdRange: { min: string | null; max: string | null };
};

type DbCheckResult = {
  summary: DbCheckSummary;
  issues: {
    underCount: DbCountIssue[];
    tagIssues: DbTagIssue[];
  };
  timestamp: string;
  success: true;
};

export default function GeneratorPage() {
  const [parallel, setParallel] = useState(2);
  const [limit, setLimit] = useState(50);
  const [patternCount, setPatternCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);
  const [controlBusy, setControlBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dbCheckResult, setDbCheckResult] = useState<DbCheckResult | null>(null);
  const [dbCheckBusy, setDbCheckBusy] = useState(false);
  const [dbCheckError, setDbCheckError] = useState<string | null>(null);

  const [isResetting, setIsResetting] = useState(false);
  const [parallelBusy, setParallelBusy] = useState(false);
  const actionsDisabled = useMemo(
    () => isGenerating || controlBusy || isResetting || parallelBusy,
    [isGenerating, controlBusy, isResetting, parallelBusy]
  );

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/generator/status");
      if (!response.ok) {
        throw new Error("ステータス取得に失敗しました。");
      }
      const payload = (await response.json()) as StatusPayload;
      setStatus(payload);
      setSessionId(payload.sessionId ?? null);
      setErrorMessage(null);
      if (typeof payload.patternCount === "number") {
        setPatternCount(payload.patternCount);
      }
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      if (!mounted) return;
      await fetchStatus();
    };
    refresh();
    const timer = setInterval(refresh, 4_000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [fetchStatus]);

  const startGeneration = async () => {
    setIsGenerating(true);
    setLog([]);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/generator/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parallel, startWordId: 2, limit, patternCount }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "生成リクエストに失敗しました");
      }
      setLog((prev) => [...prev, `start response: ${JSON.stringify(json)}`]);
      setSessionId(json.sessionId ?? null);
      if (typeof json.patternCount === "number") {
        setPatternCount(json.patternCount);
      }
      await fetchStatus();
    } catch (error) {
      const message = (error as Error).message;
      setLog((prev) => [...prev, `error: ${message}`]);
      setErrorMessage(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const pauseSession = async () => {
    if (!sessionId) return;
    setControlBusy(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/generator/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "一時停止に失敗しました");
      }
      setLog((prev) => [...prev, `pause response: ${JSON.stringify(json)}`]);
      await fetchStatus();
    } catch (error) {
      const message = (error as Error).message;
      setLog((prev) => [...prev, `pause error: ${message}`]);
      setErrorMessage(message);
    } finally {
      setControlBusy(false);
    }
  };

  const resumeSession = async () => {
    if (!sessionId) return;
    setControlBusy(true);
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/generator/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, parallel }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "再開リクエストに失敗しました");
      }
      setLog((prev) => [...prev, `resume response: ${JSON.stringify(json)}`]);
      setSessionId(json.sessionId ?? sessionId);
      await fetchStatus();
    } catch (error) {
      const message = (error as Error).message;
      setLog((prev) => [...prev, `resume error: ${message}`]);
      setErrorMessage(message);
    } finally {
      setControlBusy(false);
      setIsGenerating(false);
    }
  };

  const confirmParallelChange = async () => {
    if (!sessionId) return;
    setParallelBusy(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/generator/parallel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, parallel }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "並列数更新に失敗しました");
      }
      setLog((prev) => [...prev, `parallel response: ${JSON.stringify(json)}`]);
      await fetchStatus();
    } catch (error) {
      const message = (error as Error).message;
      setLog((prev) => [...prev, `parallel error: ${message}`]);
      setErrorMessage(message);
    } finally {
      setParallelBusy(false);
    }
  };

  const resetGeneratorData = async () => {
    if (!window.confirm("生成済みデータをすべて消去しますか？この操作は元に戻せません。")) {
      return;
    }
    setIsResetting(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/generator/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "dashboard_reset" }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "初期化リクエストに失敗しました");
      }
      setLog((prev) => [...prev, `reset response: ${JSON.stringify(json)}`]);
      setSessionId(null);
      await fetchStatus();
    } catch (error) {
      const message = (error as Error).message;
      setLog((prev) => [...prev, `reset error: ${message}`]);
      setErrorMessage(message);
    } finally {
      setIsResetting(false);
    }
  };

  const runDbCheck = useCallback(async () => {
    setDbCheckBusy(true);
    setDbCheckError(null);
    try {
      const response = await fetch("/api/generator/validate");
      const payload = await response.json();
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error ?? "DBチェックに失敗しました");
      }
      setDbCheckResult(payload);
    } catch (error) {
      const message = (error as Error).message;
      setDbCheckError(message);
      setDbCheckResult(null);
    } finally {
      setDbCheckBusy(false);
    }
  }, []);

  const statusText = status?.status ?? "idle";
  const processed = status?.progress ?? 0;
  const totalWords = status?.totalWords ?? null;
  const failures = status?.failures ?? 0;
  const remaining = totalWords !== null ? Math.max(totalWords - processed, 0) : null;
  const progressPercent = totalWords ? Math.min((processed / totalWords) * 100, 100) : 0;

  return (
    <div className="flex min-h-screen flex-col gap-6 p-6 bg-white">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="mb-3 text-2xl font-semibold">Retento Question Generator</h1>
        <p className="text-sm text-zinc-500">
          並列セッション数を選んで Gemini セッションを回し、生成結果を Supabase に蓄積します。
        </p>
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-2 text-sm font-medium">
            <span className="flex justify-between">
              <span>並列数（1〜20）</span>
              <span>{parallel}</span>
            </span>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={parallel}
            disabled={controlBusy || isResetting}
            onChange={(event) => setParallel(Number(event.target.value))}
          />
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-600">一括処理語数</label>
            <input
              type="number"
              min={10}
              max={1000}
              step={10}
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="w-28 rounded border border-zinc-200 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-zinc-600">1語あたり問題数</label>
            <input
              type="number"
              min={1}
              max={20}
              step={1}
              value={patternCount}
              onChange={(event) => setPatternCount(Number(event.target.value))}
              className="w-20 rounded border border-zinc-200 px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-400 px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-500 disabled:border-slate-200 disabled:text-slate-300"
              onClick={confirmParallelChange}
              disabled={!sessionId || controlBusy || isResetting || parallelBusy}
            >
              並列数 {parallel} を確定
            </button>
            <div className="text-xs text-zinc-500">
              {parallelBusy && "更新送信中..."}
            </div>
          </div>
          <button
            type="button"
            className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
            onClick={startGeneration}
            disabled={actionsDisabled}
          >
            {isGenerating ? "生成中…" : "問題生成をスタート"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-neutral-50 p-6 shadow-sm">
        <h2 className="text-xl font-semibold">進捗 / 状況</h2>
        <p className="text-sm text-zinc-500">
          Gemini セッションの状態: {statusText} (最新ワード: {status?.note ?? "なし"})
        </p>
        <div className="mt-3">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-200">
            <span
              className="block h-full bg-sky-400"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            {totalWords !== null ? `${progressPercent.toFixed(1)}% 完了` : "進捗を計測中..."}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600 sm:text-sm">
          <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1">Session: {sessionId ?? "未開始"}</span>
          <span className="rounded border border-zinc-200 bg-white px-2 py-1">処理済み: {processed}</span>
          <span className="rounded border border-zinc-200 bg-white px-2 py-1">失敗: {failures}</span>
          <span className="rounded border border-zinc-200 bg-white px-2 py-1">
            残り: {remaining !== null ? remaining : "-"}
          </span>
          <span className="rounded border border-zinc-200 bg-white px-2 py-1">
            開始単語 ID: {status?.startWordId ?? "不明"}
          </span>
          <span className="rounded border border-zinc-200 bg-white px-2 py-1">
            並列数: {status?.parallel ?? "-"}
          </span>
          <span className="rounded border border-zinc-200 bg-white px-2 py-1">
            問題数: {status?.patternCount ?? patternCount}
          </span>
          <span className="rounded border border-zinc-200 bg-white px-2 py-1">
            更新: {status?.updatedAt ? new Date(status.updatedAt).toLocaleString() : "—"}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-orange-400 bg-orange-100 px-3 py-2 text-sm font-medium text-orange-800 disabled:border-orange-200 disabled:text-orange-300"
            onClick={pauseSession}
            disabled={!sessionId || statusText !== "running" || controlBusy}
          >
            一時停止
          </button>
          <button
            type="button"
            className="rounded-md border border-emerald-500 bg-emerald-100 px-3 py-2 text-sm font-medium text-emerald-800 disabled:border-emerald-200 disabled:text-emerald-300"
            onClick={resumeSession}
            disabled={!sessionId || controlBusy}
          >
            再開 / 継続
          </button>
          <button
            type="button"
            className="rounded-md border border-red-500 bg-red-100 px-3 py-2 text-sm font-medium text-red-800 disabled:border-red-200 disabled:text-red-300"
            onClick={resetGeneratorData}
            disabled={isResetting || controlBusy}
          >
            データ初期化
          </button>
        </div>
        {errorMessage ? (
          <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-600">
            {errorMessage}
          </p>
        ) : null}
        <div className="mt-3 grid gap-2 text-xs text-zinc-600 sm:text-sm">
          {log.length ? (
            log.map((entry, index) => (
              <div key={index} className="rounded border border-zinc-300 bg-white px-3 py-1">
                {entry}
              </div>
            ))
          ) : (
            <p className="rounded border border-zinc-200 bg-white px-3 py-1">生成履歴がありません</p>
          )}
        </div>
      </section>
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">DBチェック</h2>
        <p className="text-sm text-zinc-500">
          `generated_questions` の状態を確認し、各単語ごとに10問あるか、下線タグに問題がないか、IDレンジを表示します。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-md border border-slate-400 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 hover:border-slate-500 disabled:border-slate-200 disabled:text-slate-400"
            onClick={runDbCheck}
            disabled={dbCheckBusy}
          >
            {dbCheckBusy ? "検査中..." : "DBチェックを実行"}
          </button>
          {dbCheckResult ? (
            <p className="text-xs text-zinc-500">
              最終実行: {new Date(dbCheckResult.timestamp).toLocaleString()}
            </p>
          ) : null}
        </div>
        {dbCheckError ? (
          <p className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-600">
            {dbCheckError}
          </p>
        ) : null}
        {dbCheckResult ? (
          <div className="mt-4 space-y-3 text-xs text-zinc-700">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded border border-zinc-200 bg-zinc-50 p-2">
                <p className="text-[13px] text-zinc-500">問題総数</p>
                <p className="text-base font-semibold text-zinc-800">{dbCheckResult.summary.totalQuestions}</p>
              </div>
              <div className="rounded border border-zinc-200 bg-zinc-50 p-2">
                <p className="text-[13px] text-zinc-500">ユニーク単語数</p>
                <p className="text-base font-semibold text-zinc-800">{dbCheckResult.summary.uniqueWords}</p>
              </div>
            </div>
            <div className="rounded border border-zinc-200 bg-white p-3 text-[13px] text-zinc-600">
              <p className="text-[12px] text-zinc-500">Word ID レンジ</p>
              <p className="text-sm text-zinc-800">
                {dbCheckResult.summary.wordIdRange.min ?? "未設定"} 〜 {dbCheckResult.summary.wordIdRange.max ?? "未設定"}
              </p>
              <p className="mt-1 text-[12px] text-zinc-500">Question ID レンジ</p>
              <p className="text-sm text-zinc-800">
                {dbCheckResult.summary.questionIdRange.min ?? "未設定"} 〜 {dbCheckResult.summary.questionIdRange.max ?? "未設定"}
              </p>
            </div>
            <div className="space-y-2 text-[12px] text-zinc-700">
              <div>
                <p className="text-[13px] font-medium text-zinc-800">10問未満の単語</p>
                {dbCheckResult.issues.underCount.length ? (
                  <ul className="mt-1 space-y-1">
                    {dbCheckResult.issues.underCount.map((issue) => (
                      <li
                        key={`${issue.word}-${issue.wordId ?? "null"}`}
                        className="rounded border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] text-zinc-800"
                      >
                        {issue.word} (wordId: {issue.wordId ?? "n/a"}) — {issue.count} 問
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[11px] text-emerald-700">すべての単語に10問以上あります。</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-zinc-800">下線タグの問題</p>
                {dbCheckResult.issues.tagIssues.length ? (
                  dbCheckResult.issues.tagIssues.map((issue) => (
                    <div key={issue.id ?? `${issue.word}-${issue.reason}`} className="rounded border border-zinc-200 bg-zinc-50 p-3 text-[11px]">
                      <p className="font-semibold text-zinc-800">{issue.reason}</p>
                      <p className="text-[11px] text-zinc-500">
                        {issue.word} (wordId: {issue.wordId ?? "n/a"}) / id: {issue.id ?? "n/a"}
                      </p>
                      <pre className="mt-2 whitespace-pre-wrap text-[11px] text-zinc-600">{issue.sentence || "（空）"}</pre>
                    </div>
                  ))
                ) : (
                  <p className="mt-1 text-[11px] text-emerald-700">
                    すべての文に{'<u>...</u>'}タグが正常に付与されています。
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
