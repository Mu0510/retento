import { DEFAULT_SESSION_SIZE, DIFFICULTY_RANGE } from "@/lib/constants";
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
const difficultyOrderedVocabulary = vocabularyList
  .filter((entry) => typeof entry.difficulty_score === "number")
  .sort((a, b) => (a.difficulty_score ?? 0) - (b.difficulty_score ?? 0));

const WINDOW_LOWER_WORDS = 200;
const WINDOW_UPPER_WORDS = 100;

export function selectWordsForUser(options: SelectionOptions): WordSelectionResult {
  const sessionSize = Math.max(3, options.sessionSize ?? DEFAULT_SESSION_SIZE);
  const seen = options.seenWordIds ?? new Set<number>();
  const reviewWordIds = (options.reviewWordIds ?? []).slice(0, 3);
  const targetDifficulty = scoreToDifficulty(options.userScore);
  const window = buildDifficultyWindow(targetDifficulty, WINDOW_LOWER_WORDS, WINDOW_UPPER_WORDS);
  const range = window.entries;
  const rangeSet = new Set(range.map((entry) => entry.id));
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

  // 2. Choose anchor words within the user range
  const remainingSlots = sessionSize - selected.length;
  const anchorTarget = Math.min(2, Math.max(1, remainingSlots));
  const anchors = pickAnchors(anchorTarget, range, rangeSet, exclude);
  selected.push(...anchors);

  // 3. Fill remaining slots with neighbors selected via embeddings
  const neighborSlots = sessionSize - selected.length;
  if (neighborSlots > 0) {
    const neighborSeeds = anchors.length ? anchors : selected;
    const neighborWords = pickNeighborWords(neighborSeeds, neighborSlots, range, rangeSet, exclude);
    selected.push(...neighborWords);
  }

  // 4. Fallback random picks if still short
  if (selected.length < sessionSize) {
    const fallback = pickFallbackWords(sessionSize - selected.length, range, exclude);
    selected.push(...fallback);
  }

  const baseWordIds = selected
    .filter((word) => word.basis === "review" || word.basis === "score")
    .map((word) => word.id);

  const windowRange: [number, number] =
    range.length > 0
      ? [
          range[0].difficulty_score ?? DIFFICULTY_RANGE.min,
          range.at(-1)?.difficulty_score ?? DIFFICULTY_RANGE.max,
        ]
      : [DIFFICULTY_RANGE.min, DIFFICULTY_RANGE.max];

  return {
    words: selected,
    metadata: {
      sessionSize,
      baseWordIds,
      userScore: options.userScore,
      difficultyRange: windowRange,
    },
  };
}

export function scoreToDifficulty(userScore: number): number {
  return clamp(userScore, DIFFICULTY_RANGE.min, DIFFICULTY_RANGE.max);
}

type DifficultyWindow = {
  entries: VocabularyEntry[];
};

function buildDifficultyWindow(
  target: number,
  lowerWords: number,
  upperWords: number,
): DifficultyWindow {
  if (!difficultyOrderedVocabulary.length) {
    return { entries: [] };
  }
  const lowerCandidates = difficultyOrderedVocabulary.filter(
    (entry) => (entry.difficulty_score ?? 0) <= target,
  );
  const upperCandidates = difficultyOrderedVocabulary.filter(
    (entry) => (entry.difficulty_score ?? 0) > target,
  );

  const lowerSelected: VocabularyEntry[] = [];
  let lowerIndex = lowerCandidates.length - 1;
  while (lowerSelected.length < lowerWords && lowerIndex >= 0) {
    lowerSelected.push(lowerCandidates[lowerIndex]);
    lowerIndex -= 1;
  }

  const upperSelected: VocabularyEntry[] = [];
  let upperIndex = 0;
  while (upperSelected.length < upperWords && upperIndex < upperCandidates.length) {
    upperSelected.push(upperCandidates[upperIndex]);
    upperIndex += 1;
  }

  const totalDesired = lowerWords + upperWords;
  while (lowerSelected.length + upperSelected.length < totalDesired) {
    if (upperIndex < upperCandidates.length) {
      upperSelected.push(upperCandidates[upperIndex]);
      upperIndex += 1;
      continue;
    }
    if (lowerIndex >= 0) {
      lowerSelected.push(lowerCandidates[lowerIndex]);
      lowerIndex -= 1;
      continue;
    }
    break;
  }

  const selectedSet = new Set<number>();
  const entries: VocabularyEntry[] = [];
  const addEntry = (entry: VocabularyEntry) => {
    if (selectedSet.has(entry.id)) {
      return;
    }
    selectedSet.add(entry.id);
    entries.push(entry);
  };

  for (const entry of lowerSelected) {
    addEntry(entry);
  }
  for (const entry of upperSelected) {
    addEntry(entry);
  }

  while (entries.length < totalDesired) {
    if (upperIndex < upperCandidates.length) {
      addEntry(upperCandidates[upperIndex]);
      upperIndex += 1;
      continue;
    }
    if (lowerIndex >= 0) {
      addEntry(lowerCandidates[lowerIndex]);
      lowerIndex -= 1;
      continue;
    }
    break;
  }

  entries.sort((a, b) => (a.difficulty_score ?? 0) - (b.difficulty_score ?? 0));
  return { entries };
}

function pickAnchors(
  count: number,
  pool: VocabularyEntry[],
  poolSet: Set<number>,
  exclude: Set<number>,
): SessionWord[] {
  if (count <= 0 || !pool.length) return [];
  const candidates = pool.filter((entry) => poolSet.has(entry.id) && !exclude.has(entry.id));
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
  pool: VocabularyEntry[],
  poolSet: Set<number>,
  exclude: Set<number>,
): SessionWord[] {
  if (count <= 0 || !seeds.length || !embeddings.size || !pool.length) {
    return [];
  }
  const seedEmbeddings = seeds
    .map((seed) => embeddings.get(seed.id))
    .filter((vec): vec is number[] => Array.isArray(vec));
  if (!seedEmbeddings.length) {
    return [];
  }
  const candidates = pool.filter(
    (entry) => poolSet.has(entry.id) && !exclude.has(entry.id) && embeddings.has(entry.id),
  );
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

function pickFallbackWords(count: number, pool: VocabularyEntry[], exclude: Set<number>): SessionWord[] {
  if (count <= 0) return [];
  const primary = pool.filter((entry) => !exclude.has(entry.id));
  shuffleInPlace(primary);
  const picked: SessionWord[] = [];
  for (const entry of primary) {
    if (picked.length >= count) break;
    picked.push(toSessionWord(entry, "score"));
    exclude.add(entry.id);
  }
  if (picked.length >= count) {
    return picked;
  }
  const remaining = vocabularyList.filter((entry) => !exclude.has(entry.id));
  shuffleInPlace(remaining);
  for (const entry of remaining) {
    if (picked.length >= count) break;
    picked.push(toSessionWord(entry, "score"));
    exclude.add(entry.id);
  }
  return picked;
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
