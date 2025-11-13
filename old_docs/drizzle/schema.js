import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, float, boolean, index } from "drizzle-orm/mysql-core";
/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
    /**
     * Surrogate primary key. Auto-incremented numeric value managed by the database.
     * Use this for relations between tables.
     */
    id: int("id").autoincrement().primaryKey(),
    /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
    openId: varchar("openId", { length: 64 }).notNull().unique(),
    name: text("name"),
    email: varchar("email", { length: 320 }),
    loginMethod: varchar("loginMethod", { length: 64 }),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
    // Retento固有のユーザー情報
    currentRank: varchar("currentRank", { length: 10 }).default("D"), // S+, S, S-, A+, A, A-, B+, B, B-, C+, C, C-, D+, D
    totalScore: int("totalScore").default(0).notNull(),
    rankingOptIn: boolean("rankingOptIn").default(false).notNull(), // ランキング参加フラグ
    schoolName: varchar("schoolName", { length: 255 }), // 学校名（任意）
    groupId: int("groupId"), // グループID（任意）
});
/**
 * 英単語マスターテーブル（9000語）
 */
export const words = mysqlTable("words", {
    id: int("id").autoincrement().primaryKey(),
    word: varchar("word", { length: 100 }).notNull().unique(),
    partOfSpeech: varchar("partOfSpeech", { length: 50 }).notNull(), // noun, verb, adjective, etc.
    difficultyScore: int("difficultyScore").notNull(), // 1001-10000（難易度スコア）
    commonMeaning1: varchar("commonMeaning1", { length: 255 }).notNull(),
    commonMeaning2: varchar("commonMeaning2", { length: 255 }),
    commonMeaning3: varchar("commonMeaning3", { length: 255 }),
    // ベクトル埋め込み（OpenAI text-embedding-3-small: 1536次元）
    embedding: text("embedding"), // JSON配列として保存
    // AI生成された例文と選択肢のキャッシュ
    cachedSentence: text("cachedSentence"), // AI生成された例文
    cachedChoice1: varchar("cachedChoice1", { length: 255 }), // 不正解の選択肢1
    cachedChoice2: varchar("cachedChoice2", { length: 255 }), // 不正解の選択肢2
    cachedChoice3: varchar("cachedChoice3", { length: 255 }), // 不正解の選択肢3
    cacheGeneratedAt: timestamp("cacheGeneratedAt"), // キャッシュ生成日時
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
/**
 * ユーザーごとの単語学習進捗
 */
export const userWordProgress = mysqlTable("user_word_progress", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    wordId: int("wordId").notNull(),
    // 学習状態
    timesAnswered: int("timesAnswered").default(0).notNull(), // 回答回数
    timesCorrect: int("timesCorrect").default(0).notNull(), // 正解回数
    timesIncorrect: int("timesIncorrect").default(0).notNull(), // 不正解回数
    // 忘却曲線スケジューリング
    nextReviewAt: timestamp("nextReviewAt"), // 次の復習予定日時
    lastAnsweredAt: timestamp("lastAnsweredAt"), // 最後に回答した日時
    confidenceLevel: mysqlEnum("confidenceLevel", ["perfect", "again", "not_confident"]), // 最後の自信度
    // メタデータ
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    wordIdIdx: index("word_id_idx").on(table.wordId),
    nextReviewAtIdx: index("next_review_at_idx").on(table.nextReviewAt),
}));
/**
 * セッション（10問のまとまり）
 */
export const sessions = mysqlTable("sessions", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    // セッション情報
    theme: varchar("theme", { length: 255 }), // テーマ名（例: "類義語: 影響を与える動詞"）
    status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
    totalQuestions: int("totalQuestions").default(10).notNull(),
    correctAnswers: int("correctAnswers").default(0).notNull(),
    // AI生成フィードバック
    aiFeedback: text("aiFeedback"), // セッション全体のAIフィードバック
    // メタデータ
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
}, (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    statusIdx: index("status_idx").on(table.status),
}));
/**
 * 問題（セッション内の個別の問題）
 */
export const questions = mysqlTable("questions", {
    id: int("id").autoincrement().primaryKey(),
    sessionId: int("sessionId").notNull(),
    wordId: int("wordId").notNull(),
    // 問題内容
    sentenceContext: text("sentenceContext").notNull(), // 例文（下線部付き）
    correctAnswer: varchar("correctAnswer", { length: 255 }).notNull(), // 正解の日本語訳
    choice1: varchar("choice1", { length: 255 }).notNull(), // 選択肢1
    choice2: varchar("choice2", { length: 255 }).notNull(), // 選択肢2
    choice3: varchar("choice3", { length: 255 }).notNull(), // 選択肢3
    choice4: varchar("choice4", { length: 255 }).notNull(), // 選択肢4
    // 回答情報
    userAnswer: varchar("userAnswer", { length: 255 }), // ユーザーの回答
    isCorrect: boolean("isCorrect"), // 正誤
    confidenceLevel: mysqlEnum("confidenceLevel", ["perfect", "again", "not_confident"]), // 自信度
    answerTimeMs: int("answerTimeMs"), // 回答時間（ミリ秒）
    // AIフィードバック
    aiFeedback: text("aiFeedback"), // 個別問題のAIフィードバック（語源、類義語など）
    // メタデータ
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    answeredAt: timestamp("answeredAt"),
}, (table) => ({
    sessionIdIdx: index("session_id_idx").on(table.sessionId),
    wordIdIdx: index("word_id_idx").on(table.wordId),
}));
/**
 * ランキングスナップショット（週間・総合）
 */
export const rankings = mysqlTable("rankings", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    // ランキング情報
    rankingType: mysqlEnum("rankingType", ["weekly", "all_time"]).notNull(),
    score: int("score").notNull(),
    rank: int("rank").notNull(),
    percentile: float("percentile"), // 上位〇%
    // スコープ
    scope: mysqlEnum("scope", ["national", "school", "group"]).notNull(),
    scopeId: int("scopeId"), // school/groupの場合のID
    // メタデータ
    snapshotDate: timestamp("snapshotDate").defaultNow().notNull(),
}, (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    rankingTypeIdx: index("ranking_type_idx").on(table.rankingType),
    scopeIdx: index("scope_idx").on(table.scope),
}));
/**
 * グループ（学校やクラスなど）
 */
export const groups = mysqlTable("groups", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    type: mysqlEnum("type", ["school", "class", "custom"]).notNull(),
    inviteCode: varchar("inviteCode", { length: 20 }).unique(), // 招待コード
    createdBy: int("createdBy").notNull(), // 作成者のユーザーID
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});
/**
 * テーマリクエスト（ユーザーが能動的にテーマをリクエスト）
 */
export const themeRequests = mysqlTable("theme_requests", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    themeDescription: text("themeDescription").notNull(), // ユーザーが入力したテーマ
    status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
    sessionId: int("sessionId"), // 生成されたセッションID
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    processedAt: timestamp("processedAt"),
}, (table) => ({
    userIdIdx: index("user_id_idx").on(table.userId),
    statusIdx: index("status_idx").on(table.status),
}));
