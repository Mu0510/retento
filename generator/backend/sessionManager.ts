import { QUESTIONS_PER_WORD, SESSION_WORD_BATCH_SIZE, TAG_POOL } from "./config";
import { requestOpenAIForWord } from "./openaiClient";
import {
  createSession,
  fetchGeneratorSession,
  insertGeneratedQuestion,
  logSessionMessage,
  updateSessionProgress,
  updateSessionStatus,
} from "./supabaseClient";
import type { GeminiResponse, QuestionPayload, VocabularyEntry } from "./types";

export class SessionManager {
  private queue: VocabularyEntry[] = [];
  private parallelLimit = 1;
  private desiredParallel = 1;
  private workerCounter = 1;
  private workerTasks = new Set<Promise<void>>();
  private completionPromise: Promise<void> | null = null;
  private completionResolver: (() => void) | null = null;
  private activeWorkers = 0;
  private pendingShutdown = 0;
  private processedCount = 0;
  private sessionId?: string;
  private questionsPerWord = QUESTIONS_PER_WORD;

  constructor(private readonly entries: VocabularyEntry[], private readonly metadata: Record<string, unknown> = {}) {
    this.queue = [...entries];
    const requestedPatternCount = Number(metadata.patternCount ?? 0);
    if (Number.isFinite(requestedPatternCount) && requestedPatternCount > 0) {
      this.questionsPerWord = Math.max(1, Math.min(20, Math.floor(requestedPatternCount)));
    }
  }

  setParallelLimit(limit: number) {
    const normalized = Math.max(1, Math.min(limit, 20));
    this.parallelLimit = normalized;
    this.desiredParallel = normalized;
  }

  async start() {
    this.processedCount = 0;
    const session = await createSession(this.parallelLimit, this.metadata);
    this.sessionId = session.id;
    await logSessionMessage(session.id, `session ${session.id} started`, "info", {
      parallelLimit: this.parallelLimit,
    });
    await updateSessionStatus(session.id, "running");

    this.workerTasks.clear();
    this.completionPromise = new Promise((resolve) => {
      this.completionResolver = resolve;
    });
    for (let slot = 1; slot <= this.parallelLimit; slot += 1) {
      this.registerWorker(this.runWorker(slot, session.id));
    }
    this.workerCounter = this.parallelLimit + 1;

    await this.completionPromise;
  }

  private registerWorker(task: Promise<void>) {
    this.workerTasks.add(task);
    void task.finally(() => {
      this.workerTasks.delete(task);
      this.checkCompletion();
    });
  }

  private checkCompletion() {
    if (this.queue.length === 0 && this.workerTasks.size === 0) {
      this.completionResolver?.();
      this.completionResolver = null;
    }
  }

  private async runWorker(slot: number, sessionId: string) {
    this.activeWorkers += 1;
    try {
      while (true) {
        if (this.shouldShutdownWorker()) {
          break;
        }
        const batch = this.dequeueBatch();
        if (!batch.length) {
          break;
        }

        for (const entry of batch) {
          await this.waitIfPaused(sessionId);
          try {
            await logSessionMessage(sessionId, `processing ${entry.word}`, "info", {
              word_id: entry.id,
              slot,
            });
            const message = await requestOpenAIForWord(entry, TAG_POOL, this.questionsPerWord, {
              sessionId,
              workerId: slot,
            });
            const parsed = this.parseResponse(message);
            await this.persistQuestions(sessionId, parsed, entry.id);
            await this.reportProgress(sessionId, entry);
          } catch (error) {
            await logSessionMessage(sessionId, `error for ${entry.word}`, "error", {
              word_id: entry.id,
              word: entry.word,
              error: (error as Error).message,
              slot,
            });
          }
        }
        if (await this.shouldStopAfterBatch(sessionId)) {
          break;
        }
        await this.syncParallelLimit(sessionId);
      }

      await updateSessionStatus(sessionId, "completed");
      await logSessionMessage(sessionId, `session ${sessionId} completed`, "info");
    } catch (error) {
      await updateSessionStatus(sessionId, "failed");
      await logSessionMessage(sessionId, `session ${sessionId} failed`, "error", {
        error: (error as Error).message,
      });
      throw error;
    } finally {
      this.activeWorkers -= 1;
      this.checkCompletion();
    }
  }

  private shouldShutdownWorker() {
    if (this.pendingShutdown > 0) {
      this.pendingShutdown -= 1;
      return true;
    }
    return false;
  }

  private async waitIfPaused(sessionId: string) {
    while (true) {
      const session = await fetchGeneratorSession(sessionId);
      if (!session || session.status !== "paused") {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }

  private async shouldStopAfterBatch(sessionId: string) {
    const session = await fetchGeneratorSession(sessionId);
    return session?.status === "paused";
  }

  private dequeueBatch() {
    return this.queue.splice(0, SESSION_WORD_BATCH_SIZE);
  }

  private sanitizePayload(payload: string) {
    let trimmed = payload.trim();
    if (trimmed.startsWith("```")) {
      trimmed = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    return trimmed;
  }

  private extractJsonArray(payload: string) {
    const start = payload.indexOf("[");
    if (start === -1) {
      throw new Error("no JSON array found in Gemini response");
    }

    let depth = 0;
    for (let i = start; i < payload.length; i += 1) {
      const char = payload[i];
      if (char === "[") {
        depth += 1;
      } else if (char === "]") {
        depth -= 1;
        if (depth === 0) {
          return payload.slice(start, i + 1);
        }
      }
    }

    throw new Error("no matching closing bracket for JSON array in Gemini response");
  }

  private parseResponse(message: string): GeminiResponse {
    const sanitized = this.sanitizePayload(message);
    const jsonText = this.extractJsonArray(sanitized);
    const parsed = JSON.parse(jsonText) as GeminiResponse;
    if (!Array.isArray(parsed) || parsed.length !== this.questionsPerWord) {
      throw new Error(`unexpected response length: ${parsed.length}`);
    }
    return parsed;
  }

  private async persistQuestions(sessionId: string, questions: QuestionPayload[], wordId?: number) {
    let patternIndex = 1;
    for (const question of questions) {
      const safeQuestion = {
        ...question,
        pattern_number: question.pattern_number ?? patternIndex,
      };
      await insertGeneratedQuestion(sessionId, safeQuestion, wordId);
      patternIndex += 1;
    }
  }

  private async reportProgress(sessionId: string, entry: VocabularyEntry) {
    this.processedCount += 1;
    await updateSessionProgress(sessionId, this.processedCount, entry.word);
  }

  private async syncParallelLimit(sessionId: string) {
    const session = await fetchGeneratorSession(sessionId);
    if (!session) return;
    const requested = this.normalizeParallel(session.session_meta?.parallel);
    if (requested === null || requested === this.desiredParallel) {
      return;
    }

    if (requested > this.desiredParallel) {
      const toSpawn = requested - this.desiredParallel;
      this.desiredParallel = requested;
      for (let i = 0; i < toSpawn; i += 1) {
        this.registerWorker(this.runWorker(this.workerCounter++, sessionId));
      }
    } else {
      const available = Math.max(0, this.activeWorkers - this.pendingShutdown);
      const toStop = Math.max(0, available - requested);
      this.pendingShutdown += toStop;
      this.desiredParallel = requested;
    }
    await logSessionMessage(sessionId, `parallel target now ${this.desiredParallel}`, "info");
  }

  private normalizeParallel(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Math.max(1, Math.min(20, Math.floor(parsed)));
  }

  getSessionId() {
    return this.sessionId;
  }
}
