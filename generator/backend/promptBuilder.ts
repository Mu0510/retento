import type { VocabularyEntry } from "./types";

export function buildUserPrompt(entry: VocabularyEntry, tagPool: string[], patternCount: number) {
  const normalizedMeanings = [entry.meaning_1, entry.meaning_2, entry.meaning_3]
    .filter(Boolean)
    .map((meaning) => meaning?.trim())
    .filter(Boolean);

  return JSON.stringify({
    word: entry.word,
    difficulty_score: entry.difficulty_score,
    pattern_count: patternCount,
    meaning_candidates: normalizedMeanings,
    part_of_speech: entry.part_of_speech,
    tag_pool: tagPool,
  });
}
