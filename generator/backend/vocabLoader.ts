import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { VocabularyEntry } from "./types";

let cached: VocabularyEntry[] | null = null;

export function loadVocabulary(): VocabularyEntry[] {
  if (cached) {
    return cached;
  }
  const raw = readFileSync(join(process.cwd(), "data", "vocabulary.json"), "utf-8");
  cached = JSON.parse(raw) as VocabularyEntry[];
  return cached;
}

export function sliceVocabulary(startId: number, count: number): VocabularyEntry[] {
  const vocab = loadVocabulary();
  return vocab.filter((entry) => entry.id >= startId).slice(0, count);
}
