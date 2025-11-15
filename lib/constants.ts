import { getDifficultyBounds, getTotalDifficultyScore } from "@/lib/vocabulary-data";

const { min: MIN_DIFFICULTY_SCORE, max: MAX_DIFFICULTY_SCORE } = getDifficultyBounds();

export const TOTAL_DIFFICULTY_SCORE = getTotalDifficultyScore();
export const USER_SCORE_RANGE = { min: MIN_DIFFICULTY_SCORE, max: MAX_DIFFICULTY_SCORE } as const;
export const MAX_USER_SCORE = USER_SCORE_RANGE.max;
export const DEFAULT_SESSION_SIZE = 5;
export const REVIEW_WORD_TARGET = 3;
export const NEIGHBOR_WINDOW = 450;

export const DIFFICULTY_RANGE = {
  min: MIN_DIFFICULTY_SCORE,
  max: MAX_DIFFICULTY_SCORE,
} as const;

export const CONFIDENCE_TO_MASTERY: Record<string, number> = {
  none: 0,
  forget: 0,
  iffy: 0.5,
  perfect: 1,
};
