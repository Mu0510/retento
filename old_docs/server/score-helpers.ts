import { getDb } from "./db";
import { userWordProgress, words } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TOTAL_DIFFICULTY, MAX_USER_SCORE, MASTERY } from "../shared/constants";

/**
 * ユーザーの単語力スコアを計算する
 * 
 * 計算式:
 * ユーザースコア = (各単語の貢献度の合計 / 全単語の難易度スコア合計) × 3400
 * 各単語の貢献度 = 難易度スコア × 習得度（0 / 0.5 / 1）
 * 
 * @param userId ユーザーID
 * @returns ユーザースコア（0-3400）
 */
export async function calculateUserScore(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // ユーザーの全単語の進捗を取得
  const progressList = await db
    .select({
      wordId: userWordProgress.wordId,
      confidenceLevel: userWordProgress.confidenceLevel,
      difficultyScore: words.difficultyScore,
    })
    .from(userWordProgress)
    .innerJoin(words, eq(userWordProgress.wordId, words.id))
    .where(eq(userWordProgress.userId, userId));

  // 各单語の貢献度を計算
  let totalContribution = 0;

  for (const progress of progressList) {
    const difficultyScore = progress.difficultyScore;
    let mastery: number = MASTERY.NOT_LEARNED;

    // confidenceLevelを習得度に変換
    if (progress.confidenceLevel === "perfect") {
      mastery = MASTERY.PERFECT;
    } else if (progress.confidenceLevel === "uncertain") {
      mastery = MASTERY.UNCERTAIN;
    } else {
      // "not_learned" または null
      mastery = MASTERY.NOT_LEARNED;
    }

    totalContribution += difficultyScore * mastery;
  }

  // ユーザースコアを計算（小数点以下も保持）
  const userScore = (totalContribution / TOTAL_DIFFICULTY) * MAX_USER_SCORE;

  return userScore;
}

/**
 * ユーザーの単語力スコアを更新する
 * 
 * @param userId ユーザーID
 * @returns 更新後のユーザースコア
 */
export async function updateUserScore(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const score = await calculateUserScore(userId);

  // usersテーブルにスコアを保存（スキーマに追加する必要がある）
  // TODO: usersテーブルにscoreカラムを追加

  return score;
}
