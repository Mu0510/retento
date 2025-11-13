import { eq, and, or, lt, isNull, sql, ne, inArray } from "drizzle-orm";
import { getDb } from "./db";
import { words, userWordProgress } from "../drizzle/schema";

/**
 * ユーザーレベルから未出題単語を1つランダム選定
 */
export async function getUnstudiedWord(userId: number) {
  const db = await getDb();
  if (!db) return null;

  // ユーザーが一度も回答していない単語を取得
  const result = await db
    .select()
    .from(words)
    .leftJoin(
      userWordProgress,
      and(
        eq(userWordProgress.wordId, words.id),
        eq(userWordProgress.userId, userId)
      )
    )
    .where(isNull(userWordProgress.id))
    .orderBy(sql`RAND()`)
    .limit(1);

  return result.length > 0 ? result[0].words : null;
}

/**
 * アクティブリコール対象単語を取得（復習が必要な単語）
 */
export async function getActiveRecallWords(userId: number, limit: number = 5) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();

  const result = await db
    .select({
      word: words,
      progress: userWordProgress,
    })
    .from(userWordProgress)
    .innerJoin(words, eq(userWordProgress.wordId, words.id))
    .where(
      and(
        eq(userWordProgress.userId, userId),
        or(
          lt(userWordProgress.nextReviewAt, now),
          isNull(userWordProgress.nextReviewAt)
        )
      )
    )
    .orderBy(userWordProgress.nextReviewAt)
    .limit(limit);

  return result.map(r => r.word);
}

/**
 * 品詞・難易度レベルで関連性の高い単語を取得
 * @param anchorWord アンカー単語（基準となる単語）
 * @param excludeIds 除外する単語ID
 * @param limit 取得する単語数
 */
export async function getRelatedWords(
  anchorWord: { id: number; partOfSpeech: string; difficultyScore: number },
  excludeIds: number[],
  limit: number = 4
) {
  const db = await getDb();
  if (!db) return [];

  // 難易度スコアの範囲（±500）
  const minScore = anchorWord.difficultyScore - 500;
  const maxScore = anchorWord.difficultyScore + 500;

  const result = await db
    .select()
    .from(words)
    .where(
      and(
        eq(words.partOfSpeech, anchorWord.partOfSpeech),
        sql`${words.difficultyScore} >= ${minScore}`,
        sql`${words.difficultyScore} <= ${maxScore}`,
        ne(words.id, anchorWord.id),
        excludeIds.length > 0 ? sql`${words.id} NOT IN (${excludeIds.join(",")})` : sql`1=1`
      )
    )
    .orderBy(sql`RAND()`)
    .limit(limit);

  return result;
}

/**
 * 5単語を選定する（新しいロジック）
 * 1. 未出題単語を1つ選定
 * 2. アクティブリコール対象单語を2つ選定（不足していれば関連単語で埋める）
 * 3. 品詞・難易度レベルで関連性の高い単語を2つ選定（不足していれば追加）
 */
export async function selectWordsForSession(userId: number) {
  console.log(`[selectWordsForSession] Starting for user ${userId}`);
  
  // 1. 未出題単語を1つ選定
  const unstudiedWord = await getUnstudiedWord(userId);
  console.log(`[selectWordsForSession] Unstudied word:`, unstudiedWord);
  
  if (!unstudiedWord) {
    // 未出題単語がない場合は、ランダムに1つ選定
    const db = await getDb();
    if (!db) return [];
    
    const randomResult = await db
      .select()
      .from(words)
      .orderBy(sql`RAND()`)
      .limit(1);
    
    if (randomResult.length === 0) {
      console.log(`[selectWordsForSession] No words found in database`);
      return [];
    }
    
    const anchorWord = randomResult[0];
    const excludeIds = [anchorWord.id];
    
    // 2. アクティブリコール対象单語を2つ選定
    const activeRecallWords = await getActiveRecallWords(userId, 2);
    excludeIds.push(...activeRecallWords.map(w => w.id));
    
    // 3. 関連単語を選定（合計5単語になるまで）
    const neededRelatedWords = 5 - 1 - activeRecallWords.length;
    const relatedWords = await getRelatedWords(anchorWord, excludeIds, neededRelatedWords);
    
    return [anchorWord, ...activeRecallWords, ...relatedWords];
  }
  
  const anchorWord = unstudiedWord;
  const excludeIds = [anchorWord.id];
  
  // 2. アクティブリコール対象単語を2つ選定
  const activeRecallWords = await getActiveRecallWords(userId, 2);
  console.log(`[selectWordsForSession] Active recall words:`, activeRecallWords.length);
  excludeIds.push(...activeRecallWords.map(w => w.id));
  
  // 3. 関連単語を選定（合計5単語になるまで）
  const neededRelatedWords = 5 - 1 - activeRecallWords.length;
  const relatedWords = await getRelatedWords(anchorWord, excludeIds, neededRelatedWords);
  console.log(`[selectWordsForSession] Related words:`, relatedWords.length);
  
  const finalWords = [anchorWord, ...activeRecallWords, ...relatedWords];
  console.log(`[selectWordsForSession] Final word count:`, finalWords.length);
  return finalWords;
}
