import { SessionManager } from "./sessionManager";
import { loadVocabulary } from "./vocabLoader";
import type { VocabularyEntry } from "./types";
import {
  deleteQuestionsForWordIds,
  fetchRegenerationQueueEntries,
  insertRegenerationQueueEntries,
  RegenerationQueueEntry,
  RegenerationQueueStatus,
  updateRegenerationQueueEntriesStatus,
} from "./supabaseClient";

const QUEUE_FETCH_LIMIT = 50;

export async function addToRegenerationQueue(entries: { wordId: number; word: string; reason: string }[]) {
  return insertRegenerationQueueEntries(
    entries.map((entry) => ({
      word_id: entry.wordId,
      word: entry.word,
      reason: entry.reason,
    }))
  );
}

export async function getRegenerationQueue(statuses?: RegenerationQueueStatus[]) {
  return fetchRegenerationQueueEntries(statuses ?? ["pending", "processing", "failed", "completed"], 100);
}

export async function processRegenerationQueue(parallel: number, patternCount: number) {
  const pending = await fetchRegenerationQueueEntries(["pending"], QUEUE_FETCH_LIMIT);
  if (!pending.length) {
    return { processed: 0, sessionId: null };
  }

  const entryIds = pending.map((entry) => entry.id);
  await updateRegenerationQueueEntriesStatus(entryIds, { status: "processing" });

  const vocabularyMap = new Map(loadVocabulary().map((entry) => [entry.id, entry]));
  const readyEntries: RegenerationQueueEntry[] = [];
  const missingEntries: RegenerationQueueEntry[] = [];

  for (const entry of pending) {
    if (!vocabularyMap.has(entry.word_id)) {
      missingEntries.push(entry);
    } else {
      readyEntries.push(entry);
    }
  }

  if (missingEntries.length) {
    await updateRegenerationQueueEntriesStatus(
      missingEntries.map((entry) => entry.id),
      {
        status: "failed",
        last_error: "辞書に登録されていない単語です。",
      }
    );
  }

  if (!readyEntries.length) {
    return { processed: missingEntries.length, sessionId: null };
  }

  const wordIds = readyEntries.map((entry) => entry.word_id);
  await deleteQuestionsForWordIds(wordIds);

  const vocabEntries: VocabularyEntry[] = readyEntries
    .map((entry) => vocabularyMap.get(entry.word_id))
    .filter((item): item is VocabularyEntry => Boolean(item));

  try {
    const { sessionId } = await regenerateVocabularyEntries(vocabEntries, parallel, patternCount);
    await updateRegenerationQueueEntriesStatus(
      readyEntries.map((entry) => entry.id),
      {
        status: "completed",
        session_id: sessionId,
        last_error: null,
      }
    );
    return { processed: readyEntries.length, sessionId };
  } catch (error) {
    const message = (error as Error).message;
    await updateRegenerationQueueEntriesStatus(
      readyEntries.map((entry) => entry.id),
      {
        status: "failed",
        last_error: message,
      }
    );
    throw error;
  }
}

async function regenerateVocabularyEntries(
  entries: VocabularyEntry[],
  parallel: number,
  patternCount: number
) {
  if (!entries.length) {
    throw new Error("regeneration requires at least one vocabulary entry");
  }
  const manager = new SessionManager(entries, {
    patternCount,
    regenQueue: true,
    wordIds: entries.map((entry) => entry.id),
  });
  manager.setParallelLimit(parallel);
  await manager.start();
  const sessionId = manager.getSessionId();
  if (!sessionId) {
    throw new Error("failed to start regeneration session");
  }
  return { sessionId };
}
