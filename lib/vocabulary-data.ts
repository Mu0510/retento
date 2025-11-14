import fs from "fs";
import path from "path";

export type VocabularyEntry = {
  id: number;
  word: string;
  part_of_speech?: string | null;
  difficulty_score?: number;
  meaning_1?: string | null;
  meaning_2?: string | null;
  meaning_3?: string | null;
};

const VOCAB_PATH = path.join(process.cwd(), "data", "vocabulary.json");
const EMBEDDING_PATH = path.join(process.cwd(), "data", "vocab-embeddings.jsonl");

let vocabularyCache: VocabularyEntry[] | null = null;
let embeddingCache: Map<number, number[]> | null = null;
let difficultyBoundsCache: { min: number; max: number } | null = null;
let totalDifficultyScoreCache: number | null = null;

export function getVocabularyList(): VocabularyEntry[] {
  if (vocabularyCache) {
    return vocabularyCache;
  }
  if (!fs.existsSync(VOCAB_PATH)) {
    throw new Error("vocabulary master list missing (data/vocabulary.json)");
  }
  const contents = fs.readFileSync(VOCAB_PATH, "utf-8");
  vocabularyCache = JSON.parse(contents) as VocabularyEntry[];
  return vocabularyCache;
}

export function getVocabularyById(): Map<number, VocabularyEntry> {
  const list = getVocabularyList();
  return new Map(list.map((entry) => [entry.id, entry]));
}

export function getEmbeddingMap(): Map<number, number[]> {
  if (embeddingCache) {
    return embeddingCache;
  }
  const map = new Map<number, number[]>();
  if (!fs.existsSync(EMBEDDING_PATH)) {
    embeddingCache = map;
    return map;
  }
  const lines = fs.readFileSync(EMBEDDING_PATH, "utf-8").split("\n");
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line) as { id: number; embedding: number[] };
      map.set(record.id, record.embedding);
    } catch (error) {
      console.warn("failed to parse embedding record", error);
    }
  }
  embeddingCache = map;
  return map;
}

export function getDifficultyBounds(): { min: number; max: number } {
  if (difficultyBoundsCache) {
    return difficultyBoundsCache;
  }
  const list = getVocabularyList();
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const entry of list) {
    const score = entry.difficulty_score;
    if (typeof score !== "number") continue;
    min = Math.min(min, score);
    max = Math.max(max, score);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error("difficulty bounds could not be determined");
  }
  difficultyBoundsCache = { min, max };
  return difficultyBoundsCache;
}

export function getTotalDifficultyScore(): number {
  if (totalDifficultyScoreCache !== null) {
    return totalDifficultyScoreCache;
  }
  const list = getVocabularyList();
  totalDifficultyScoreCache = list.reduce(
    (acc, entry) => acc + (typeof entry.difficulty_score === "number" ? entry.difficulty_score : 0),
    0,
  );
  return totalDifficultyScoreCache;
}
