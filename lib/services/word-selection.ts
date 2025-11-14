import {
  DEFAULT_SESSION_SIZE,
  DIFFICULTY_RANGE,
  DIFFICULTY_THRESHOLDS,
  NEIGHBOR_WINDOW,
  USER_SCORE_RANGE,
} from "@/lib/constants";
import { getEmbeddingMap, getVocabularyById, getVocabularyList, type VocabularyEntry } from "@/lib/vocabulary-data";
import type { SessionWord } from "@/lib/session-builder";

type SelectionOptions = {
  userScore: number;
  reviewWordIds?: number[];
  seenWordIds?: Set<number>;
  sessionSize?: number;
};

export type WordSelectionResult = {
  words: SessionWord[];
  metadata: {
    sessionSize: number;
    baseWordIds: number[];
    userScore: number;
    difficultyRange: [number, number];
  };
};

const vocabularyList = getVocabularyList();
const vocabularyById = getVocabularyById();
const embeddings = getEmbeddingMap();

export function selectWordsForUser(options: SelectionOptions): WordSelectionResult {
  const sessionSize = Math.max(3, options.sessionSize ?? DEFAULT_SESSION_SIZE);
  const seen = options.seenWordIds ?? new Set<number>();
  const reviewWordIds = (options.reviewWordIds ?? []).slice(0, 3);
  const targetDifficulty = scoreToDifficulty(options.userScore);
  const difficultyRange = buildDifficultyRange(targetDifficulty);
  const exclude = new Set<number>([...seen]);
  const selected: SessionWord[] = [];

  // 1. Pick review words first
  for (const wordId of reviewWordIds) {
    if (selected.length >= sessionSize) break;
    const entry = vocabularyById.get(wordId);
    if (!entry) continue;
    selected.push(toSessionWord(entry, "review"));
    exclude.add(entry.id);
  }

  // 2. Choose anchor words near the user's difficulty
  const remainingSlots = sessionSize - selected.length;
  const anchorTarget = Math.min(2, Math.max(1, remainingSlots));
  const anchors = pickAnchors(anchorTarget, difficultyRange, exclude);
  selected.push(...anchors);

  // 3. Fill remaining slots with neighbors selected via embeddings
  const neighborSlots = sessionSize - selected.length;
  if (neighborSlots > 0) {
    const neighborSeeds = anchors.length ? anchors : selected;
    const neighborWords = pickNeighborWords(neighborSeeds, neighborSlots, difficultyRange, exclude);
    selected.push(...neighborWords);
  }

  // 4. Fallback random picks if still short
  if (selected.length < sessionSize) {
    const fallback = pickFallbackWords(sessionSize - selected.length, exclude);
    selected.push(...fallback);
  }

  const baseWordIds = selected
    .filter((word) => word.basis === "review" || word.basis === "score")
    .map((word) => word.id);

  return {
    words: selected,
    metadata: {
      sessionSize,
      baseWordIds,
      userScore: options.userScore,
      difficultyRange,
    },
  };
}

function scoreToDifficulty(userScore: number): number {
  const clamped = clamp(userScore, USER_SCORE_RANGE.min, USER_SCORE_RANGE.max);
  for (const threshold of DIFFICULTY_THRESHOLDS) {
    const [scaledMin, scaledMax] = threshold.scaled_range;
    const [diffMin, diffMax] = threshold.range;
    if (clamped <= scaledMax) {
      if (scaledMax === scaledMin) {
        return diffMin;
      }
      const ratio = (clamped - scaledMin) / (scaledMax - scaledMin);
      return diffMin + ratio * (diffMax - diffMin);
    }
  }
  return DIFFICULTY_THRESHOLDS.at(-1)?.range[1] ?? DIFFICULTY_RANGE.max;
}

function buildDifficultyRange(target: number): [number, number] {
  const min = Math.max(DIFFICULTY_RANGE.min, target - NEIGHBOR_WINDOW);
  const max = Math.min(DIFFICULTY_RANGE.max, target + NEIGHBOR_WINDOW);
  return [min, max];
}

function pickAnchors(count: number, range: [number, number], exclude: Set<number>): SessionWord[] {
  if (count <= 0) return [];
  const candidates = vocabularyList.filter((entry) => {
    const score = entry.difficulty_score ?? 0;
    return score >= range[0] && score <= range[1] && !exclude.has(entry.id);
  });
  shuffleInPlace(candidates);
  const anchors: SessionWord[] = [];
  for (const entry of candidates) {
    if (anchors.length >= count) break;
    anchors.push(toSessionWord(entry, "score"));
    exclude.add(entry.id);
  }
  return anchors;
}

function pickNeighborWords(
  seeds: SessionWord[],
  count: number,
  range: [number, number],
  exclude: Set<number>,
): SessionWord[] {
  if (count <= 0 || !seeds.length || !embeddings.size) {
    return [];
  }
  const seedEmbeddings = seeds
    .map((seed) => embeddings.get(seed.id))
    .filter((vec): vec is number[] => Array.isArray(vec));
  if (!seedEmbeddings.length) {
    return [];
  }
  const candidates = vocabularyList.filter((entry) => {
    const score = entry.difficulty_score ?? 0;
    return (
      score >= range[0] &&
      score <= range[1] &&
      !exclude.has(entry.id) &&
      embeddings.has(entry.id)
    );
  });
  const scored = candidates
    .map((entry) => ({
      entry,
      score: getBestSimilarity(entry.id, seedEmbeddings),
    }))
    .sort((a, b) => b.score - a.score);

  const neighbors: SessionWord[] = [];
  for (const { entry, score } of scored) {
    if (neighbors.length >= count) break;
    neighbors.push(toSessionWord(entry, "neighbor", score));
    exclude.add(entry.id);
  }
  return neighbors;
}

function pickFallbackWords(count: number, exclude: Set<number>): SessionWord[] {
  if (count <= 0) return [];
  const remaining = vocabularyList.filter((entry) => !exclude.has(entry.id));
  shuffleInPlace(remaining);
  return remaining.slice(0, count).map((entry) => toSessionWord(entry, "score"));
}

function toSessionWord(entry: VocabularyEntry, basis: SessionWord["basis"], neighborScore?: number): SessionWord {
  const meanings = [entry.meaning_1, entry.meaning_2, entry.meaning_3].filter(
    (meaning): meaning is string => typeof meaning === "string" && meaning.trim().length > 0,
  );
  return {
    id: entry.id,
    word: entry.word,
    partOfSpeech: entry.part_of_speech ?? null,
    difficultyScore: entry.difficulty_score,
    meanings,
    basis,
    neighborScore,
  };
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function getBestSimilarity(wordId: number, seedEmbeddings: number[][]): number {
  const vector = embeddings.get(wordId);
  if (!vector) {
    return -Infinity;
  }
  let best = -Infinity;
  for (const seed of seedEmbeddings) {
    const similarity = cosineSimilarity(seed, vector);
    if (similarity > best) {
      best = similarity;
    }
  }
  return best;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) {
    return -Infinity;
  }
  return dot / Math.sqrt(magA * magB);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
