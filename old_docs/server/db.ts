import { eq, and, lt, or, isNull, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users, 
  words, 
  userWordProgress, 
  sessions, 
  questions,
  InsertSession,
  InsertQuestion,
  InsertUserWordProgress
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * ランダムに単語を取得する
 */
export async function getRandomWords(limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(words)
    .orderBy(sql`RAND()`)
    .limit(limit);

  return result;
}

/**
 * 復習が必要な単語を取得する（忘却曲線ベース）
 */
export async function getWordsForReview(userId: number, limit: number = 10) {
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
 * セッションを作成する
 */
export async function createSession(data: InsertSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(sessions).values(data);
  const insertId = (result as any)[0]?.insertId;
  
  if (!insertId) {
    throw new Error("Failed to get insertId from session creation");
  }
  
  return Number(insertId);
}

/**
 * 問題を作成する
 */
export async function createQuestion(data: InsertQuestion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(questions).values(data);
  return result;
}

/**
 * ユーザーの単語進捗を更新する
 */
export async function upsertUserWordProgress(data: InsertUserWordProgress) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(userWordProgress)
    .where(
      and(
        eq(userWordProgress.userId, data.userId),
        eq(userWordProgress.wordId, data.wordId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // 更新
    await db
      .update(userWordProgress)
      .set(data)
      .where(eq(userWordProgress.id, existing[0].id));
  } else {
    // 新規作成
    await db.insert(userWordProgress).values(data);
  }
}

/**
 * ユーザーのセッションを取得する
 */
export async function getUserSessions(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.createdAt))
    .limit(limit);

  return result;
}

/**
 * セッションの問題を取得する
 */
export async function getSessionQuestions(sessionId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      id: questions.id,
      sessionId: questions.sessionId,
      wordId: questions.wordId,
      word: words.word,
      sentenceContext: questions.sentenceContext,
      sentenceJapanese: questions.sentenceJapanese,
      correctAnswer: questions.correctAnswer,
      choice1: questions.choice1,
      choice2: questions.choice2,
      choice3: questions.choice3,
      choice4: questions.choice4,
      feedbackCorrect: questions.feedbackCorrect,
      feedbackChoice1: questions.feedbackChoice1,
      feedbackChoice2: questions.feedbackChoice2,
      feedbackChoice3: questions.feedbackChoice3,
      feedbackChoice4: questions.feedbackChoice4,
      createdAt: questions.createdAt,
    })
    .from(questions)
    .innerJoin(words, eq(questions.wordId, words.id))
    .where(eq(questions.sessionId, sessionId))
    .orderBy(questions.id);

  return result;
}
