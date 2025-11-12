import fs from "fs";
import path from "path";

const VOCAB_PATH = path.join(process.cwd(), "data", "vocabulary.json");
const EMBEDDING_PATH = path.join(process.cwd(), "data", "vocab-embeddings.jsonl");

export type VocabularyEntry = {
  id: number;
  word: string;
  part_of_speech?: string | null;
  difficulty_score?: number;
  meaning_1?: string | null;
  meaning_2?: string | null;
  meaning_3?: string | null;
};

export type SessionWord = {
  id: number;
  word: string;
  partOfSpeech?: string | null;
  difficultyScore?: number;
  meanings: string[];
  basis: "review" | "score" | "neighbor";
  neighborScore?: number;
};

export type SessionRequestOptions = {
  userScore: number;
  reviewIds?: number[];
  sessionSize?: number;
};

export type SessionPlanResponse = {
  words: SessionWord[];
  metadata: {
    sessionSize: number;
    baseWordIds: number[];
    userScore: number;
    difficultyRange: [number, number];
  };
};

const vocabularyList: VocabularyEntry[] = loadVocabulary();
const vocabularyById = new Map(vocabularyList.map((entry) => [entry.id, entry]));
const embeddingsById = loadEmbeddings();

const DEFAULT_SESSION_SIZE = 10;
const MIN_SCORE = 5;
const MAX_SCORE = 10000;
const SCORE_WINDOW = 400;

function loadVocabulary(): VocabularyEntry[] {
  if (!fs.existsSync(VOCAB_PATH)) {
    throw new Error("vocabulary master list missing (data/vocabulary.json)");
  }
  return JSON.parse(fs.readFileSync(VOCAB_PATH, "utf-8")) as VocabularyEntry[];
}

function loadEmbeddings(): Map<number, number[]> {
  const cache = new Map<number, number[]>();
  if (!fs.existsSync(EMBEDDING_PATH)) {
    return cache;
  }
  const lines = fs.readFileSync(EMBEDDING_PATH, "utf-8").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line) as { id: number; embedding: number[] };
      cache.set(record.id, record.embedding);
    } catch (error) {
      console.warn("failed to parse embedding record", error);
    }
  }
  return cache;
}

function getMeaningList(entry: VocabularyEntry): string[] {
  return [entry.meaning_1, entry.meaning_2, entry.meaning_3].filter(
    (meaning): meaning is string => typeof meaning === "string" && meaning.trim().length > 0,
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function pickRandom<T>(items: T[], count: number): T[] {
  const result: T[] = [];
  const pool = [...items];
  while (result.length < count && pool.length > 0) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]);
  }
  return result;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length && i < b.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    magA += x * x;
    magB += y * y;
  }
  if (magA === 0 || magB === 0) {
    return 0;
  }
  return dot / Math.sqrt(magA * magB);
}

function buildSessionWord(entry: VocabularyEntry, basis: SessionWord["basis"], neighborScore?: number): SessionWord {
  return {
    id: entry.id,
    word: entry.word,
    partOfSpeech: entry.part_of_speech ?? null,
    difficultyScore: entry.difficulty_score,
    meanings: getMeaningList(entry),
    basis,
    neighborScore,
  };
}

function getDifficultyRange(userScore: number): [number, number] {
  const normalized = clamp(userScore, MIN_SCORE, MAX_SCORE);
  const min = clamp(normalized - SCORE_WINDOW, MIN_SCORE, MAX_SCORE);
  const max = clamp(normalized + SCORE_WINDOW, MIN_SCORE, MAX_SCORE);
  return [min, max];
}

function selectBaseWords(
  userScore: number,
  reviewIds: number[] | undefined,
  desiredCount: number,
  exclude: Set<number>,
): SessionWord[] {
  const selected: SessionWord[] = [];
  if (reviewIds?.length) {
    for (const id of reviewIds) {
      if (selected.length >= desiredCount) break;
      if (exclude.has(id)) continue;
      const entry = vocabularyById.get(id);
      if (!entry) continue;
      selected.push(buildSessionWord(entry, "review"));
      exclude.add(id);
    }
  }
  const [rangeMin, rangeMax] = getDifficultyRange(userScore);
  const rangeCandidates = vocabularyList.filter((entry) => {
    const score = entry.difficulty_score ?? 0;
    return score >= rangeMin && score <= rangeMax && !exclude.has(entry.id);
  });
  const randomPool = [...rangeCandidates];
  while (selected.length < desiredCount && randomPool.length > 0) {
    const idx = Math.floor(Math.random() * randomPool.length);
    const entry = randomPool.splice(idx, 1)[0];
    selected.push(buildSessionWord(entry, "score"));
    exclude.add(entry.id);
  }
  if (selected.length < desiredCount) {
    const fallback = vocabularyList.filter((entry) => !exclude.has(entry.id));
    const extra = pickRandom(fallback, desiredCount - selected.length);
    for (const entry of extra) {
      selected.push(buildSessionWord(entry, "score"));
      exclude.add(entry.id);
    }
  }
  return selected;
}

function findNeighborWords(
  seedIds: number[],
  exclude: Set<number>,
  count: number,
): SessionWord[] {
  if (count <= 0 || !embeddingsById.size) {
    return [];
  }
  const seedVectors = seedIds
    .map((id) => embeddingsById.get(id))
    .filter((vec): vec is number[] => Array.isArray(vec));
  if (!seedVectors.length) {
    return [];
  }
  const candidates = vocabularyList.filter((entry) => !exclude.has(entry.id) && embeddingsById.has(entry.id));
  const scored = candidates
    .map((entry) => {
      const vector = embeddingsById.get(entry.id)!;
      let best = -Infinity;
      for (const seed of seedVectors) {
        const similarity = cosineSimilarity(seed, vector);
        best = Math.max(best, similarity);
      }
      return { entry, score: best };
    })
    .sort((a, b) => b.score - a.score);
  const neighbors: SessionWord[] = [];
  for (const item of scored) {
    if (neighbors.length >= count) break;
    exclude.add(item.entry.id);
    neighbors.push(buildSessionWord(item.entry, "neighbor", item.score));
  }
  return neighbors;
}

export function buildSession(options: SessionRequestOptions): SessionPlanResponse {
  const sessionSize = clamp(options.sessionSize ?? DEFAULT_SESSION_SIZE, 5, 20);
  const baseCount = Math.min(3, Math.max(1, Math.round(sessionSize * 0.3)));
  const excludeIds = new Set<number>();
  const baseWords = selectBaseWords(options.userScore, options.reviewIds, baseCount, excludeIds);
  const neighborCount = sessionSize - baseWords.length;
  const neighborWords = findNeighborWords(
    baseWords.map((word) => word.id),
    excludeIds,
    neighborCount,
  );
  const words = [...baseWords, ...neighborWords];
  if (words.length < sessionSize) {
    const extras = pickRandom(
      vocabularyList.filter((entry) => !excludeIds.has(entry.id)),
      sessionSize - words.length,
    );
    for (const entry of extras) {
      words.push(buildSessionWord(entry, "score"));
      excludeIds.add(entry.id);
    }
  }
  return {
    words,
    metadata: {
      sessionSize,
      baseWordIds: baseWords.map((word) => word.id),
      userScore: options.userScore,
      difficultyRange: getDifficultyRange(options.userScore),
    },
  };
}
