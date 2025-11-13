/**
 * アプリケーション全体で使用する定数
 */

/**
 * 全単語の難易度スコア合計
 * この値は vocabulary_new.csv の全単語の difficulty_score の合計値
 */
export const TOTAL_DIFFICULTY = 17071535;

/**
 * ユーザースコアの最大値
 * 全単語を完璧に習得した場合のスコア
 */
export const MAX_USER_SCORE = 3400;

/**
 * 習得度の定数
 */
export const MASTERY = {
  NOT_LEARNED: 0,    // 覚えてない（旧：自信無し）または未出題
  UNCERTAIN: 0.5,    // 微妙
  PERFECT: 1,        // 完璧
} as const;
