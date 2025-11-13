import { getDb } from "./db";
import { words, initialTestQuestions } from "../drizzle/schema";
import { and, gte, lte, sql, notInArray } from "drizzle-orm";

const ENV = {
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL,
};

/**
 * 難易度均等に1000単語のIDを選定
 */
export async function select1000Words(): Promise<number[]> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // 難易度100-3400を33区間に分け、各区間から30単語選定（合計990単語）
  const ranges = [];
  for (let i = 0; i < 33; i++) {
    const min = 100 + i * 100;
    const max = min + 99;
    ranges.push({ min, max });
  }

  const selectedIds: number[] = [];

  for (const range of ranges) {
    const wordsInRange = await db
      .select({ id: words.id })
      .from(words)
      .where(and(gte(words.difficultyScore, range.min), lte(words.difficultyScore, range.max)))
      .orderBy(sql`RAND()`)
      .limit(30);

    selectedIds.push(...wordsInRange.map((w) => w.id));
  }

  // 残り10単語を全範囲からランダム選定
  const extraWords = await db
    .select({ id: words.id })
    .from(words)
    .where(notInArray(words.id, selectedIds))
    .orderBy(sql`RAND()`)
    .limit(10);

  selectedIds.push(...extraWords.map((w) => w.id));

  console.log(`[Generate1000] Selected ${selectedIds.length} words`);
  return selectedIds;
}

/**
 * 指定されたword IDsから問題を生成（10単語ずつバッチ処理）
 */
export async function generateQuestionsForWordIds(wordIds: number[]): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  let generatedCount = 0;
  const batchSize = 10;

  for (let i = 0; i < wordIds.length; i += batchSize) {
    const batchIds = wordIds.slice(i, i + batchSize);

    // 単語データを取得
    const batchWords = await db.select().from(words).where(sql`id IN (${sql.join(batchIds.map(id => sql`${id}`), sql`, `)})`);

    if (batchWords.length === 0) {
      console.warn(`[Generate1000] No words found for batch starting at index ${i}`);
      continue;
    }

    try {
      const questions = await generateQuestionsForBatch(batchWords);

      // データベースに保存
      for (let j = 0; j < questions.length; j++) {
        const question = questions[j];
        const word = batchWords[j];

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
        });

        generatedCount++;
      }

      console.log(`[Generate1000] Progress: ${generatedCount}/${wordIds.length} questions generated`);
    } catch (error) {
      console.error(`[Generate1000] Error generating batch:`, error);
    }
  }

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
      "choices": ["正解の訳", "紛らわしい不正解1", "紛らわしい不正解2", "紛らわしい不正解3"]
    }
  ]
}

**重要な要件:**
- **最重要**: 例文には必ず問題単語そのものを含めること（単語が抜けた不完全な文にしないこと）
- **類推しにくい文章**: 文脈から単語の意味を推測できないようにする
- **純粋な単語力を測る**: 単語を知っているかどうかだけで正誤が決まるようにする
- 例文は簡潔で自然な英語（10-15単語程度）
- 例文中の問題単語以外の単語は、問題単語より簡単なものを使用
- 選択肢は正解と紛らわしいが間違っているもの
- 選択肢の順番はランダム（正解が常に最初にならないように）`;

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
