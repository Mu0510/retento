import { getDb } from "./db";
import { preGeneratedSessions } from "../drizzle/schema";
import { eq, and, isNull } from "drizzle-orm";
import { selectWordsForSession } from "./db-helpers";
import { generateBatchQuestions } from "./ai-batch";

/**
 * 次のセッション用の問題を事前生成
 * 
 * @param userId ユーザーID
 */
export async function preGenerateNextSession(userId: number): Promise<void> {
  try {
    console.log(`[PreGenerate] Starting pre-generation for user ${userId}`);
    
    // 単語を選定
    const selectedWords = await selectWordsForSession(userId);
    
    if (selectedWords.length === 0) {
      console.log(`[PreGenerate] No words available for user ${userId}`);
      return;
    }
    
    // AIで問題を生成
    const questions = await generateBatchQuestions(selectedWords);
    
    // 各問題にwordIdを追加
    const questionsWithWordId = questions.map((q: any) => ({
      ...q,
      wordId: selectedWords[q.wordIndex - 1].id, // wordIndexは1-indexed
    }));
    
    // データベースに保存
    const db = await getDb();
    if (!db) {
      console.error("[PreGenerate] Database not available");
      return;
    }
    
    await db.insert(preGeneratedSessions).values({
      userId,
      questionsData: JSON.stringify(questionsWithWordId),
    });
    
    console.log(`[PreGenerate] Successfully pre-generated session for user ${userId}`);
  } catch (error) {
    console.error(`[PreGenerate] Error pre-generating session for user ${userId}:`, error);
    // エラーは無視（次回のセッション開始時に通常通り生成される）
  }
}

/**
 * 事前生成された問題を取得
 * 
 * @param userId ユーザーID
 * @returns 事前生成された問題データ（なければnull）
 */
export async function getPreGeneratedSession(userId: number): Promise<any | null> {
  const db = await getDb();
  if (!db) return null;
  
  // 未使用の事前生成セッションを取得
  const preGenerated = await db
    .select()
    .from(preGeneratedSessions)
    .where(
      and(
        eq(preGeneratedSessions.userId, userId),
        isNull(preGeneratedSessions.usedAt)
      )
    )
    .orderBy(preGeneratedSessions.createdAt)
    .limit(1);
  
  if (preGenerated.length === 0) {
    return null;
  }
  
  const session = preGenerated[0];
  
  // 使用済みとしてマーク
  await db
    .update(preGeneratedSessions)
    .set({ usedAt: new Date() })
    .where(eq(preGeneratedSessions.id, session.id));
  
  return JSON.parse(session.questionsData);
}

/**
 * 古い事前生成セッションを削除（24時間以上経過したもの）
 * 
 * @param userId ユーザーID
 */
export async function cleanupOldPreGeneratedSessions(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  await db
    .delete(preGeneratedSessions)
    .where(
      and(
        eq(preGeneratedSessions.userId, userId),
        isNull(preGeneratedSessions.usedAt)
      )
    );
}
