import { getDb } from "./db";
import { words, initialTestQuestions, userInitialTestResults, userWordProgress } from "../drizzle/schema";
import { and, gte, lte, sql } from "drizzle-orm";

const ENV = {
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL,
};

/**
 * 300題の初回テスト用問題を生成
 * 難易度スコア100-3400を10区間に分け、各区間から30単語を選定
 */
export async function generateInitialTestQuestions(): Promise<number> {
  console.log("[InitialTest] Starting question generation...");

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 既存の問題をカウント
  const existingCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(initialTestQuestions);
  
  const count = Number(existingCount[0]?.count || 0);
  
  if (count >= 300) {
    console.log(`[InitialTest] Already have ${count} questions, skipping generation`);
    return count;
  }

  // 難易度スコアの範囲を10区間に分割
  const ranges = [
    { min: 100, max: 430 },
    { min: 431, max: 760 },
    { min: 761, max: 1090 },
    { min: 1091, max: 1420 },
    { min: 1421, max: 1750 },
    { min: 1751, max: 2080 },
    { min: 2081, max: 2410 },
    { min: 2411, max: 2740 },
    { min: 2741, max: 3070 },
    { min: 3071, max: 3400 },
  ];

  const selectedWords = [];

  // 各区間から30単語をランダム選定
  for (const range of ranges) {
    console.log(`[InitialTest] Selecting 30 words from range ${range.min}-${range.max}...`);
    
    const wordsInRange = await db
      .select()
      .from(words)
      .where(
        and(
          gte(words.difficultyScore, range.min),
          lte(words.difficultyScore, range.max)
        )
      )
      .orderBy(sql`RAND()`)
      .limit(30);

    if (wordsInRange.length < 30) {
      console.warn(`[InitialTest] Warning: Only ${wordsInRange.length} words found in range ${range.min}-${range.max}`);
    }

    selectedWords.push(...wordsInRange);
  }

  console.log(`[InitialTest] Selected ${selectedWords.length} words total`);

  // AIで問題を一括生成（10単語ずつ）
  const batchSize = 10;
  let generatedCount = 0;

  for (let i = 0; i < selectedWords.length; i += batchSize) {
    const batch = selectedWords.slice(i, i + batchSize);
    console.log(`[InitialTest] Generating questions for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(selectedWords.length / batchSize)}...`);

    try {
      const questions = await generateQuestionsForBatch(batch);

      // データベースに保存
      for (let j = 0; j < questions.length; j++) {
        const question = questions[j];
        const word = batch[j];

        await db.insert(initialTestQuestions).values({
          wordId: word.id,
          difficultyScore: word.difficultyScore,
          sentenceContext: question.sentence,
          sentenceJapanese: question.sentenceJapanese,
          correctAnswer: word.commonMeaning1,
          choice1: question.choices[0],
          choice2: question.choices[1],
          choice3: question.choices[2],
          choice4: question.choices[3],
          feedbackForChoice1: question.feedbackForChoice1,
          feedbackForChoice2: question.feedbackForChoice2,
          feedbackForChoice3: question.feedbackForChoice3,
          feedbackForChoice4: question.feedbackForChoice4,
        });

        generatedCount++;
      }

      console.log(`[InitialTest] Progress: ${generatedCount}/${selectedWords.length} questions generated`);
    } catch (error) {
      console.error(`[InitialTest] Error generating batch:`, error);
    }
  }

  console.log(`[InitialTest] Completed! Generated ${generatedCount} questions`);
  return generatedCount;
}

/**
 * 10単語分の問題を一括生成
 */
async function generateQuestionsForBatch(words: any[]): Promise<any[]> {
  const wordsList = words
    .map((w, idx) => `${idx + 1}. ${w.word} (${w.partOfSpeech}) - 正解: ${w.commonMeaning1}`)
    .join("\n");

  const prompt = `以下の10個の英単語について、初回レベルテスト用の4択問題を作成してください。

単語リスト:
${wordsList}

以下のJSON形式で出力してください。他のテキストは一切含めないでください。

{
  "questions": [
    {
      "wordIndex": 1,
      "sentence": "単語を<u>タグで囲んだ簡潔な英語例文（10-15単語程度）",
      "sentenceJapanese": "例文の日本語訳",
      "choices": ["正解の訳", "紛らわしい不正解1", "紛らわしい不正解2", "紛らわしい不正解3"],
      "feedbackForChoice1": "選択耱1に対する解説（正解または不正解の理由を2-3文で）",
      "feedbackForChoice2": "選択耱2に対する解説",
      "feedbackForChoice3": "選択耱3に対する解説",
      "feedbackForChoice4": "選択耱4に対する解説"
    }
  ]
}

**重要な要件:**
- **最重要**: 例文には必ず問題単語そのものを含めること（単語が抜けた不完全な文にしないこと）
- **類推しにくい文章**: 文脈から単語の意味を推測できないようにする
- **純粋な単語力を測る**: 単語を知っているかどうかだけで正誤が決まるようにする
- 例文は簡潔で自然な英語（10-15単語程度）
- 例文中の問題単語以外の单語は、問題単語より簡単なものを使用
- 選択肅は正解と紛らわしいが間違っているもの
- 選択肅の順番はランダム（正解が常に最初にならないように）
- **各選択肅に対するfeedbackを必ず含める**: 正解の場合はその理由、不正解の場合はなぜ間違いかを2-3文で説明`;

  const response = await fetch(`${ENV.forgeApiUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "あなたは英単語レベルテスト用の問題作成AIです。類推しにくく、純粋な単語力を測る問題を作成してください。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 10000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI API response");
  }

  // JSONをパース
  let jsonContent = content.trim();
  if (jsonContent.startsWith("```")) {
    jsonContent = jsonContent.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonContent = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonContent);

  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error("Invalid response format: questions array not found");
  }

  return parsed.questions;
}

/**
 * 初回テスト用の30問を取得
 * 難易度スコア100から開始し、ユーザーの回答に応じて適応的に問題を選定
 */
export async function getInitialTestQuestions(userId: number): Promise<any[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 初回テスト問題から30問を選定
  // 最初は難易度100程度から開始
  const firstQuestion = await db
    .select()
    .from(initialTestQuestions)
    .where(
      and(
        gte(initialTestQuestions.difficultyScore, 80),
        lte(initialTestQuestions.difficultyScore, 120)
      )
    )
    .orderBy(sql`RAND()`)
    .limit(1);

  if (firstQuestion.length === 0) {
    throw new Error("No initial test questions found");
  }

  // 残りの29問は全範囲からランダムに選定（実際のテストでは適応的に選定）
  const remainingQuestions = await db
    .select()
    .from(initialTestQuestions)
    .orderBy(sql`RAND()`)
    .limit(29);

  return [firstQuestion[0], ...remainingQuestions];
}

/**
 * スコア推定アルゴリズム
 * 
 * @param currentScore 現在の推定スコア
 * @param questionNumber 問題番号（1-30）
 * @param isCorrect 正解かどうか
 * @param confidenceLevel 自信度（perfect, uncertain, forgot）
 * @param questionDifficulty 問題の難易度スコア
 * @returns 更新後のスコア
 */
export function calculateScoreUpdate(
  currentScore: number,
  questionNumber: number,
  isCorrect: boolean,
  confidenceLevel: string,
  questionDifficulty: number
): number {
  let baseChange = 0;

  // 1-20問目: 通常の変化幅
  if (questionNumber <= 20) {
    if (isCorrect && confidenceLevel === "perfect") {
      baseChange = 120;
    } else if (isCorrect && confidenceLevel === "uncertain") {
      baseChange = 25;
    } else if (isCorrect && confidenceLevel === "forgot") {
      baseChange = -25;
    } else {
      // 不正解
      baseChange = -50;
    }
  } else {
    // 21-30問目: 線形補正（20問目=100%, 30問目=30%）
    const progress = (questionNumber - 20) / 10; // 0.0 ~ 1.0
    const multiplier = 1.0 - (0.7 * progress); // 1.0 ~ 0.3

    if (isCorrect && confidenceLevel === "perfect") {
      baseChange = Math.round(120 * multiplier);
    } else if (isCorrect && confidenceLevel === "uncertain") {
      baseChange = Math.round(25 * multiplier);
    } else if (isCorrect && confidenceLevel === "forgot") {
      baseChange = Math.round(-25 * multiplier);
    } else {
      // 不正解
      baseChange = Math.round(-50 * multiplier);
    }
  }

  let newScore = currentScore + baseChange;

  // 上限・下限を設ける
  if (newScore < 0) newScore = 0;
  if (newScore > 3400) newScore = 3400;

  return newScore;
}

/**
 * 初回テスト結果を保存し、単語マーキングを実行
 * 
 * @param userId ユーザーID
 * @param initialScore 算出された初期スコア
 * @param testDetails テスト詳細（JSON）
 */
export async function saveInitialTestResult(
  userId: number,
  initialScore: number,
  testDetails: any
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // テスト結果を保存
  await db.insert(userInitialTestResults).values({
    userId,
    initialScore,
    testDetails: JSON.stringify(testDetails),
  });

  console.log(`[InitialTest] Saved result for user ${userId}: initialScore=${initialScore}`);

  // 単語マーキングを実行
  await markWordsBasedOnInitialScore(userId, initialScore);
}

/**
 * 初期スコアに基づいて単語をマーキング
 * 
 * - 初期スコア*0.8以下の単語: 全て「完璧」に設定
 * - 残りの単語: 単語力スコアが初期スコアに最も近くなるように「微妙」を設定
 */
async function markWordsBasedOnInitialScore(userId: number, initialScore: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const threshold = Math.round(initialScore * 0.8);

  // 初期スコア*0.8以下の単語を「完璧」に設定
  const easyWords = await db
    .select()
    .from(words)
    .where(lte(words.difficultyScore, threshold))
    .orderBy(words.difficultyScore);

  console.log(`[InitialTest] Marking ${easyWords.length} words as perfect (difficulty <= ${threshold})`);

  for (const word of easyWords) {
    await db.insert(userWordProgress).values({
      userId,
      wordId: word.id,
      timesAnswered: 1,
      timesCorrect: 1,
      timesIncorrect: 0,
      confidenceLevel: "perfect",
      lastAnsweredAt: new Date(),
      nextReviewAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1年後
    });
  }

  // 残りの単語から「微妙」を設定
  const remainingWords = await db
    .select()
    .from(words)
    .where(gte(words.difficultyScore, threshold + 1))
    .orderBy(words.difficultyScore);

  console.log(`[InitialTest] Selecting uncertain words from ${remainingWords.length} remaining words...`);

  // 単語力スコアを計算しながら「微妙」を追加
  let currentWordScore = easyWords.length * 10; // 完璧な単語のスコア
  let bestDiff = Math.abs(currentWordScore - initialScore);
  let bestIndex = 0;

  for (let i = 0; i < remainingWords.length; i++) {
    const newScore = currentWordScore + (i + 1) * 5; // 微妙な単語のスコア
    const diff = Math.abs(newScore - initialScore);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i + 1;
    } else if (diff > bestDiff) {
      // 差が広がり始めたら終了
      break;
    }
  }

  console.log(`[InitialTest] Marking ${bestIndex} words as uncertain`);

  for (let i = 0; i < bestIndex; i++) {
    const word = remainingWords[i];
    await db.insert(userWordProgress).values({
      userId,
      wordId: word.id,
      timesAnswered: 1,
      timesCorrect: 1,
      timesIncorrect: 0,
      confidenceLevel: "uncertain",
      lastAnsweredAt: new Date(),
      nextReviewAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3日後
    });
  }

  console.log(`[InitialTest] Word marking completed for user ${userId}`);
}

/**
 * 推定スコアに基づいて次の問題を取得
 * 推定スコア±50の範囲から問題を選定
 */
export async function getNextQuestionByScore(
  userId: number,
  estimatedScore: number,
  answeredQuestionIds: number[]
): Promise<any | null> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const minScore = Math.max(0, estimatedScore - 50);
  const maxScore = Math.min(3400, estimatedScore + 50);

  // 推定スコア±50の範囲から、まだ回答していない問題を選定
  const candidates = await db
    .select()
    .from(initialTestQuestions)
    .where(
      and(
        gte(initialTestQuestions.difficultyScore, minScore),
        lte(initialTestQuestions.difficultyScore, maxScore),
        answeredQuestionIds.length > 0
          ? sql`${initialTestQuestions.id} NOT IN (${sql.join(answeredQuestionIds.map(id => sql`${id}`), sql`, `)})`
          : sql`1=1`
      )
    )
    .orderBy(sql`RAND()`)
    .limit(1);

  if (candidates.length > 0) {
    return candidates[0];
  }

  // 範囲内に問題がない場合は、範囲を広げて再検索
  const fallbackCandidates = await db
    .select()
    .from(initialTestQuestions)
    .where(
      answeredQuestionIds.length > 0
        ? sql`${initialTestQuestions.id} NOT IN (${sql.join(answeredQuestionIds.map(id => sql`${id}`), sql`, `)})`
        : sql`1=1`
    )
    .orderBy(sql`RAND()`)
    .limit(1);

  return fallbackCandidates.length > 0 ? fallbackCandidates[0] : null;
}
