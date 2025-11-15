import { getDifficultyThresholds } from "@/lib/difficulty-thresholds";
import { getDifficultyBounds, getTotalDifficultyScore } from "@/lib/vocabulary-data";

const { min: MIN_DIFFICULTY_SCORE, max: MAX_DIFFICULTY_SCORE } = getDifficultyBounds();
const DIFFICULTY_THRESHOLDS = getDifficultyThresholds();
const USER_SCORE_MIN = DIFFICULTY_THRESHOLDS.at(0)?.scaled_range[0] ?? 0;
const USER_SCORE_MAX = DIFFICULTY_THRESHOLDS.at(-1)?.scaled_range[1] ?? 10000;

export { DIFFICULTY_THRESHOLDS };

export const TOTAL_DIFFICULTY_SCORE = getTotalDifficultyScore();
export const USER_SCORE_RANGE = { min: USER_SCORE_MIN, max: USER_SCORE_MAX } as const;
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
