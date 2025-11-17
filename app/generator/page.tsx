'use client';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

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
    missingWordIds: MissingWordIssue[];
  };
  timestamp: string;
  success: true;
};

type MissingWordIssue = {
  wordId: number;
  word: string;
  reason: string;
};

type RegenerationQueueEntryStatus = "pending" | "processing" | "completed" | "failed";

type RegenerationQueueEntry = {
  id: string;
  wordId: number;
  word: string;
  reason: string | null;
  status: RegenerationQueueEntryStatus;
  sessionId: string | null;
  lastError: string | null;
  updatedAt: string;
};

type QueueCandidate = {
  wordId: number;
  word: string;
  reasons: string[];
};

const queueStatusClasses: Record<RegenerationQueueEntryStatus, string> = {
  pending: "border-amber-300 bg-amber-50 text-amber-700",
  processing: "border-sky-300 bg-sky-50 text-sky-700",
  completed: "border-emerald-300 bg-emerald-50 text-emerald-700",
  failed: "border-rose-300 bg-rose-50 text-rose-700",
};

const createTagIssueKey = (issue: DbTagIssue, index: number) => {
  const reasonSlug = issue.reason.replace(/\s+/g, "-").slice(0, 40);
  return issue.id ?? `${issue.word}-${issue.wordId ?? "n/a"}-${reasonSlug}-${index}`;
};

export default function GeneratorPage() {
  const [parallel, setParallel] = useState(2);
  const [limit, setLimit] = useState(50);
  const [startWordId, setStartWordId] = useState(2);
  const [startWordAuto, setStartWordAuto] = useState(true);
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
  const [queueEntries, setQueueEntries] = useState<RegenerationQueueEntry[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [queueErrorMessage, setQueueErrorMessage] = useState<string | null>(null);
  const [queueFeedback, setQueueFeedback] = useState<string | null>(null);
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [processingQueue, setProcessingQueue] = useState(false);
  const [hideCompletedBusy, setHideCompletedBusy] = useState(false);
  const [hideCompletedError, setHideCompletedError] = useState<string | null>(null);
  const [selectedQueueWordIds, setSelectedQueueWordIds] = useState<number[]>([]);
  const [selectedTagIssueKeys, setSelectedTagIssueKeys] = useState<string[]>([]);
  const [selectionAnchor, setSelectionAnchor] = useState<number | null>(null);
  const [fixingMissingUnderline, setFixingMissingUnderline] = useState(false);
  const [fixingWordTag, setFixingWordTag] = useState(false);
  const [fixingClosingTag, setFixingClosingTag] = useState(false);
  const [fixMessage, setFixMessage] = useState<string | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);

  const [parallelBusy, setParallelBusy] = useState(false);
  const actionsDisabled = useMemo(
    () => isGenerating || controlBusy || parallelBusy,
    [isGenerating, controlBusy, parallelBusy]
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

useEffect(() => {
  if (status?.status === "completed") {
    setStartWordAuto(true);
  }
}, [status?.status]);

useEffect(() => {
  if (!startWordAuto) {
    return;
  }
  if (typeof status?.startWordId !== "number") {
    return;
  }
  if (status?.status === "running") {
    return;
  }
  setStartWordId(status.startWordId);
}, [startWordAuto, status?.startWordId, status?.status]);

  const startGeneration = async () => {
    setIsGenerating(true);
    setLog([]);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/generator/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parallel, startWordId, limit, patternCount }),
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
      setSelectedTagIssueKeys([]);
      setSelectionAnchor(null);
      setFixMessage(null);
      setFixError(null);
    } catch (error) {
      const message = (error as Error).message;
      setDbCheckError(message);
      setDbCheckResult(null);
    } finally {
      setDbCheckBusy(false);
    }
  }, []);

  const fetchQueueEntries = useCallback(async () => {
    setQueueLoading(true);
    setQueueErrorMessage(null);
    try {
      const response = await fetch("/api/generator/queue");
      const payload = await response.json();
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error ?? "再生成キューを取得できませんでした");
      }
      setQueueEntries(payload.entries ?? []);
    } catch (error) {
      setQueueErrorMessage((error as Error).message);
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQueueEntries();
  }, [fetchQueueEntries]);

  useEffect(() => {
    if (dbCheckResult) {
      void fetchQueueEntries();
    }
  }, [dbCheckResult, fetchQueueEntries]);

  const tagIssues = useMemo(() => dbCheckResult?.issues.tagIssues ?? [], [dbCheckResult]);
  const tagIssueKeys = useMemo(
    () => tagIssues.map((issue, index) => createTagIssueKey(issue, index)),
    [tagIssues]
  );
  const selectedTagIssues = useMemo(
    () =>
      selectedTagIssueKeys.length
        ? tagIssues.filter((issue, index) => selectedTagIssueKeys.includes(tagIssueKeys[index]))
        : [],
    [selectedTagIssueKeys, tagIssues, tagIssueKeys]
  );
  const selectedMissingUnderlineIssues = useMemo(
    () => selectedTagIssues.filter((issue) => issue.reason === "<u> タグが見つかりません"),
    [selectedTagIssues]
  );
  const selectedWordTagIssues = useMemo(
    () => selectedTagIssues.filter((issue) => issue.reason.startsWith("<u> タグ内の語")),
    [selectedTagIssues]
  );
  const selectedClosingTagIssues = useMemo(
    () => selectedTagIssues.filter((issue) => issue.reason === "</u> タグが見つかりません"),
    [selectedTagIssues]
  );

  const handleIssueSelection = useCallback(
    (
      event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>,
      index: number,
      issueKey: string
    ) => {
      event.preventDefault();
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey && selectionAnchor !== null;
      setSelectedTagIssueKeys((prev) => {
        if (shift && selectionAnchor !== null) {
          const [start, end] =
            selectionAnchor <= index ? [selectionAnchor, index] : [index, selectionAnchor];
          const rangeKeys = tagIssueKeys.slice(start, end + 1);
          return ctrl ? Array.from(new Set([...prev, ...rangeKeys])) : rangeKeys;
        }
        if (ctrl) {
          return prev.includes(issueKey)
            ? prev.filter((key) => key !== issueKey)
            : [...prev, issueKey];
        }
        return [issueKey];
      });
      setSelectionAnchor(index);
    },
    [selectionAnchor, tagIssueKeys]
  );

  const handleFixMissingUnderlines = useCallback(async () => {
    setFixError(null);
    setFixMessage(null);
    if (!selectedMissingUnderlineIssues.length) {
      setFixError("<u> タグが必要な問題が選択されていません。");
      return;
    }
    const ids = selectedMissingUnderlineIssues
      .map((issue) => issue.id)
      .filter((id): id is string => Boolean(id));
    if (!ids.length) {
      setFixError("選択されたエントリに ID が含まれていないため処理できません。");
      return;
    }
    setFixingMissingUnderline(true);
    try {
      const response = await fetch("/api/generator/validate/fix-missing-underline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error ?? "処理に失敗しました");
      }
      setFixMessage(`${payload.updated ?? ids.length} 件の文に <u>タグを追加しました。`);
      await runDbCheck();
    } catch (error) {
      setFixError((error as Error).message);
    } finally {
      setFixingMissingUnderline(false);
    }
  }, [selectedMissingUnderlineIssues, runDbCheck]);

  const handleFixWordTagIssues = useCallback(async () => {
    setFixError(null);
    setFixMessage(null);
    if (!selectedWordTagIssues.length) {
      setFixError("<u> タグの語一致問題が選択されていません。");
      return;
    }
    const ids = selectedWordTagIssues
      .map((issue) => issue.id)
      .filter((id): id is string => Boolean(id));
    if (!ids.length) {
      setFixError("選択されたエントリに ID が含まれていないため処理できません。");
      return;
    }
    setFixingWordTag(true);
    try {
      const response = await fetch("/api/generator/validate/fix-word-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error ?? "処理に失敗しました");
      }
      setFixMessage(`${payload.updated ?? ids.length} 件の単語から <u>タグを除去しました。`);
      await runDbCheck();
    } catch (error) {
      setFixError((error as Error).message);
    } finally {
      setFixingWordTag(false);
    }
  }, [selectedWordTagIssues, runDbCheck]);

  const handleFixClosingTags = useCallback(async () => {
    setFixError(null);
    setFixMessage(null);
    if (!selectedClosingTagIssues.length) {
      setFixError("</u> タグの閉じが必要な問題が選択されていません。");
      return;
    }
    const ids = selectedClosingTagIssues
      .map((issue) => issue.id)
      .filter((id): id is string => Boolean(id));
    if (!ids.length) {
      setFixError("選択されたエントリに ID が含まれていないため処理できません。");
      return;
    }
    setFixingClosingTag(true);
    try {
      const response = await fetch("/api/generator/validate/fix-closing-tag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const payload = await response.json();
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error ?? "処理に失敗しました");
      }
      setFixMessage(`${payload.updated ?? ids.length} 件の文の</u>閉じを修正しました。`);
      await runDbCheck();
    } catch (error) {
      setFixError((error as Error).message);
    } finally {
      setFixingClosingTag(false);
    }
  }, [selectedClosingTagIssues, runDbCheck]);

  const queueCandidates = useMemo<QueueCandidate[]>(() => {
    const map = new Map<number, QueueCandidate>();

    const addCandidate = (wordId: number, word: string, reason: string) => {
      if (!wordId) {
        return;
      }
      const existing = map.get(wordId);
      if (existing) {
        if (!existing.reasons.includes(reason)) {
          existing.reasons.push(reason);
        }
      } else {
        map.set(wordId, { wordId, word, reasons: [reason] });
      }
    };

    dbCheckResult?.issues.missingWordIds.forEach((issue) =>
      addCandidate(issue.wordId, issue.word, "DBに存在しません")
    );
    dbCheckResult?.issues.underCount.forEach((entry) => {
      if (!entry.wordId) return;
      addCandidate(entry.wordId, entry.word, `${entry.count} 問しかありません`);
    });
    dbCheckResult?.issues.tagIssues.forEach((issue) => {
      if (!issue.wordId) return;
      addCandidate(issue.wordId, issue.word, issue.reason);
    });

    return [...map.values()];
  }, [dbCheckResult]);

  const queueCandidateLookup = useMemo(
    () => new Map(queueCandidates.map((candidate) => [candidate.wordId, candidate])),
    [queueCandidates]
  );

  useEffect(() => {
    setSelectedQueueWordIds((prev) => prev.filter((wordId) => queueCandidateLookup.has(wordId)));
  }, [queueCandidateLookup]);

  const toggleQueueCandidate = useCallback((wordId: number) => {
    setSelectedQueueWordIds((prev) =>
      prev.includes(wordId) ? prev.filter((id) => id !== wordId) : [...prev, wordId]
    );
  }, []);

  const handleAddToQueue = useCallback(async () => {
    const payloadEntries = selectedQueueWordIds
      .map((wordId) => queueCandidateLookup.get(wordId))
      .filter((candidate): candidate is QueueCandidate => Boolean(candidate))
      .map((candidate) => ({
        wordId: candidate.wordId,
        word: candidate.word,
        reason: candidate.reasons.join(" / "),
      }));
    if (!payloadEntries.length) {
      setQueueFeedback("追加する単語を選択してください。");
      return;
    }
    setAddingToQueue(true);
    setQueueErrorMessage(null);
    setQueueFeedback(null);
    try {
      const response = await fetch("/api/generator/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: payloadEntries }),
      });
      const result = await response.json();
      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error ?? "キューへの追加に失敗しました");
      }
      setQueueFeedback(`${result.added ?? payloadEntries.length} 件を再生成キューに登録しました。`);
      setSelectedQueueWordIds([]);
      await fetchQueueEntries();
    } catch (error) {
      setQueueErrorMessage((error as Error).message);
    } finally {
      setAddingToQueue(false);
    }
  }, [fetchQueueEntries, queueCandidateLookup, selectedQueueWordIds]);

  const handleProcessQueue = useCallback(async () => {
    setProcessingQueue(true);
    setQueueErrorMessage(null);
    setQueueFeedback(null);
    try {
      const response = await fetch("/api/generator/queue/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parallel, patternCount }),
      });
      const result = await response.json();
      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error ?? "キュー処理に失敗しました");
      }
      setQueueFeedback(`${result.processed ?? 0} 件の再生成キューを処理しました。`);
      await fetchQueueEntries();
      await runDbCheck();
    } catch (error) {
      setQueueErrorMessage((error as Error).message);
    } finally {
      setProcessingQueue(false);
    }
  }, [fetchQueueEntries, parallel, patternCount, runDbCheck]);

  const completedQueueEntries = useMemo(() => queueEntries.filter((entry) => entry.status === "completed"), [queueEntries]);

  const handleHideCompleted = useCallback(async () => {
    if (!completedQueueEntries.length) {
      return;
    }
    setHideCompletedBusy(true);
    setHideCompletedError(null);
    try {
      const response = await fetch("/api/generator/queue/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: completedQueueEntries.map((entry) => entry.id) }),
      });
      const result = await response.json();
      if (!response.ok || result?.success !== true) {
        throw new Error(result?.error ?? "非表示にできませんでした");
      }
      setQueueFeedback(`${result.hidden ?? completedQueueEntries.length} 件を非表示にしました。`);
      await fetchQueueEntries();
    } catch (error) {
      setHideCompletedError((error as Error).message);
    } finally {
      setHideCompletedBusy(false);
    }
  }, [completedQueueEntries, fetchQueueEntries]);

  const missingWordIssues = useMemo(
    () => dbCheckResult?.issues.missingWordIds ?? [],
    [dbCheckResult]
  );
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
            disabled={controlBusy}
            onChange={(event) => setParallel(Number(event.target.value))}
          />
          <div className="grid max-w-sm grid-cols-2 gap-3">
            <label className="text-xs text-zinc-600">
              <span className="text-[11px] text-zinc-400">開始単語ID</span>
              <input
                type="number"
                min={2}
                value={startWordId}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setStartWordId(Number.isFinite(value) ? value : startWordId);
                  setStartWordAuto(false);
                }}
                className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs text-zinc-600">
              <span className="text-[11px] text-zinc-400">一括処理語数</span>
              <input
                type="number"
                min={10}
                max={1000}
                step={10}
                value={limit}
                onChange={(event) => setLimit(Number(event.target.value))}
                className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              />
            </label>
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
            disabled={!sessionId || controlBusy || parallelBusy}
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
            <div className="space-y-3 text-[12px] text-zinc-700">
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
              <div>
                <p className="text-[13px] font-medium text-zinc-800">DBに存在しない単語ID</p>
                {missingWordIssues.length ? (
                  <ul className="mt-1 space-y-1">
                    {missingWordIssues.map((issue) => (
                      <li
                        key={`${issue.wordId}-${issue.word}`}
                        className="rounded border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] text-zinc-800"
                      >
                        ID {issue.wordId}: {issue.word}
                        <p className="text-[10px] text-zinc-500">理由: {issue.reason}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-[11px] text-emerald-700">セッション内の ID はすべて問題テーブルに存在します。</p>
                )}
              </div>
              <div className="rounded border border-sky-200 bg-sky-50/80 px-3 py-3 text-[11px] text-zinc-700">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-zinc-800">再生成候補</p>
                  <span className="text-[10px] text-zinc-500">
                    問題を削除して再生成キューに登録
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-zinc-500">
                  選択した単語の既存問題（最大10問）をすべて削除したうえで再生成します。
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-400 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-500 disabled:border-zinc-200 disabled:text-zinc-400"
                    onClick={handleAddToQueue}
                    disabled={addingToQueue || !queueCandidates.length}
                  >
                    {addingToQueue ? "追加中…" : "再生成キューに追加"}
                  </button>
                  <span className="text-[11px] text-zinc-500">
                    選択中: {selectedQueueWordIds.length} / {queueCandidates.length}
                  </span>
                </div>
                <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                  {queueCandidates.length ? (
                    queueCandidates.map((candidate) => {
                      const isSelected = selectedQueueWordIds.includes(candidate.wordId);
                      return (
                        <div
                          key={candidate.wordId}
                          role="button"
                          tabIndex={0}
                          onClick={() => toggleQueueCandidate(candidate.wordId)}
                          onKeyDown={(event) => {
                            if (event.key === " " || event.key === "Enter") {
                              event.preventDefault();
                              toggleQueueCandidate(candidate.wordId);
                            }
                          }}
                          className={`flex items-center gap-2 rounded border px-2 py-1 text-[11px] text-zinc-700 transition ${
                            isSelected
                              ? "border-blue-300 bg-blue-50"
                              : "border-zinc-200 bg-white hover:border-zinc-300"
                          } cursor-pointer`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            tabIndex={-1}
                            className="h-4 w-4 rounded border border-zinc-300 bg-white text-blue-600"
                          />
                          <div className="flex-1 space-y-0.5">
                            <p className="font-semibold text-zinc-800">{candidate.word}</p>
                            <p className="text-[10px] text-zinc-500">{candidate.reasons.join(" / ")}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-[11px] text-zinc-500">再生成候補はありません。</p>
                  )}
                </div>
              </div>
              <div className="rounded border border-zinc-200 bg-white/80 px-3 py-3 text-[11px] text-zinc-600">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-medium text-zinc-800">再生成キュー</p>
                    <p className="text-[10px] text-zinc-500">作成されたキューをまとめて処理します</p>
                  </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-400 disabled:border-zinc-200 disabled:text-zinc-400"
                    disabled={
                      processingQueue || queueLoading || !queueEntries.length
                    }
                    onClick={handleProcessQueue}
                  >
                    {processingQueue ? "再生成中…" : "キュー処理を開始"}
                  </button>
                  <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-400 disabled:border-zinc-200 disabled:text-zinc-400"
                      disabled={!completedQueueEntries.length || hideCompletedBusy}
                      onClick={handleHideCompleted}
                    >
                      {hideCompletedBusy ? "非表示中…" : `完了済みを非表示 (${completedQueueEntries.length})`}
                  </button>
                </div>
              </div>
                {hideCompletedError ? (
                  <p className="mt-2 text-[11px] text-red-600">{hideCompletedError}</p>
                ) : null}
                {queueErrorMessage ? (
                  <p className="mt-2 text-[11px] text-red-600">{queueErrorMessage}</p>
                ) : null}
                {queueFeedback ? (
                  <p className="mt-1 text-[11px] text-emerald-600">{queueFeedback}</p>
                ) : null}
                {queueLoading ? (
                  <p className="mt-2 text-[11px] text-zinc-500">再生成キューを読み込み中...</p>
                ) : null}
                {queueEntries.length ? (
                  <div className="mt-3 space-y-2">
                    {queueEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded border border-zinc-200 bg-white px-3 py-2 text-[11px] text-zinc-700 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-zinc-800">{entry.word}</p>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${queueStatusClasses[entry.status]}`}
                          >
                            {entry.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          ID {entry.wordId} · {entry.reason ?? "理由なし"}
                        </p>
                        {entry.status === "failed" && entry.lastError ? (
                          <p className="text-[10px] text-red-600">エラー: {entry.lastError}</p>
                        ) : null}
                        <p className="text-[10px] text-zinc-400">
                          更新: {new Date(entry.updatedAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-emerald-700">再生成キューに登録された単語はありません。</p>
                )}
              </div>
              <div className="space-y-2">
                <div className="rounded border border-zinc-200 bg-white/80 px-3 py-3 text-[11px] text-zinc-600">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-medium text-zinc-800">下線タグの問題</p>
                    <span className="text-[10px] text-zinc-500">Ctrl/Cmd: 複数選択 · Shift: 範囲選択</span>
                  </div>
                  <p className="text-[11px] text-zinc-500">選択: {selectedTagIssueKeys.length} 件</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-400 disabled:border-zinc-200 disabled:text-zinc-400"
                      disabled={!selectedMissingUnderlineIssues.length || fixingMissingUnderline}
                      onClick={handleFixMissingUnderlines}
                    >
                      {fixingMissingUnderline ? (
                        "適用中…"
                      ) : (
                        <>
                          欠落<span className="font-mono">&lt;u&gt;</span>タグを追加
                          {selectedMissingUnderlineIssues.length ? ` (${selectedMissingUnderlineIssues.length})` : ""}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-400 disabled:border-zinc-200 disabled:text-zinc-400"
                      disabled={!selectedWordTagIssues.length || fixingWordTag}
                      onClick={handleFixWordTagIssues}
                    >
                      {fixingWordTag ? (
                        "適用中…"
                      ) : (
                        <>
                          単語側<span className="font-mono">&lt;u&gt;</span>タグを除去
                          {selectedWordTagIssues.length ? ` (${selectedWordTagIssues.length})` : ""}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-700 hover:border-zinc-400 disabled:border-zinc-200 disabled:text-zinc-400"
                      disabled={!selectedClosingTagIssues.length || fixingClosingTag}
                      onClick={handleFixClosingTags}
                    >
                      {fixingClosingTag ? (
                        "適用中…"
                      ) : (
                        <>
                          閉じタグ<span className="font-mono">&lt;/u&gt;</span>を修正
                          {selectedClosingTagIssues.length ? ` (${selectedClosingTagIssues.length})` : ""}
                        </>
                      )}
                    </button>
                  </div>
                  {fixMessage ? (
                    <p className="mt-1 text-[11px] text-emerald-600">{fixMessage}</p>
                  ) : null}
                  {fixError ? <p className="mt-1 text-[11px] text-red-600">{fixError}</p> : null}
                </div>
                {tagIssues.length ? (
                  <div className="space-y-2">
                    {tagIssues.map((issue, index) => {
                      const issueKey = tagIssueKeys[index];
                      const isSelected = selectedTagIssueKeys.includes(issueKey);
                      return (
                        <div
                          key={issueKey}
                          role="button"
                          tabIndex={0}
                          onClick={(event) => handleIssueSelection(event, index, issueKey)}
                          onKeyDown={(event) => {
                            if (event.key === " " || event.key === "Enter") {
                              handleIssueSelection(event, index, issueKey);
                            }
                          }}
                          className={`flex items-start gap-2 rounded border px-3 py-2 text-[11px] transition ${
                            isSelected
                              ? "border-blue-300 bg-blue-50 ring-2 ring-blue-200"
                              : "border-zinc-200 bg-white hover:border-zinc-300"
                          } cursor-pointer`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            tabIndex={-1}
                            className="mt-1 h-4 w-4 shrink-0 cursor-default rounded border border-zinc-300 bg-white text-blue-600"
                          />
                          <div className="flex-1 space-y-1">
                            <p className="font-semibold text-zinc-800">{issue.reason}</p>
                            <p className="text-[11px] text-zinc-500">
                              {issue.word} (wordId: {issue.wordId ?? "n/a"}) / id: {issue.id ?? "n/a"}
                            </p>
                            <pre className="mt-1 whitespace-pre-wrap text-[11px] text-zinc-600">
                              {issue.sentence || "（空）"}
                            </pre>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
