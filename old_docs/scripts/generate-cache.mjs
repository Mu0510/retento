import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { config } = require("dotenv");
config();

import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { words } from "../drizzle/schema.ts";
import { eq, isNull } from "drizzle-orm";

const ENV = {
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY,
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL,
  databaseUrl: process.env.DATABASE_URL,
};

/**
 * OpenAI APIを使用して例文と選択肢を生成する
 */
async function generateQuestionContent(word, partOfSpeech, correctAnswer, otherMeanings) {
  const apiKey = ENV.forgeApiKey;
  const apiUrl = ENV.forgeApiUrl;

  if (!apiKey || !apiUrl) {
    throw new Error("OpenAI API configuration is missing");
  }

  const prompt = `あなたは大学受験向け英単語学習アプリの問題作成AIです。以下の単語について、自然で適切な例文と紛らわしい選択肢を生成してください。

**単語情報:**
- 単語: ${word}
- 品詞: ${partOfSpeech}
- 正解の日本語訳: ${correctAnswer}
${otherMeanings.length > 0 ? `- その他の意味: ${otherMeanings.join(", ")}` : ""}

**要件:**
1. 例文は大学受験レベルの自然な英文で、単語の意味が文脈から推測できるようにしてください
2. 例文内の対象単語は<u>タグで囲んでください（例: <u>${word}</u>）
3. 不正解の選択肢は、正解と紛らわしいが明確に間違っている日本語訳を3つ生成してください
4. 選択肢は単語の他の意味や、類義語、関連語の意味などを使って紛らわしくしてください

**出力形式（JSON）:**
{
  "sentence": "例文（単語を<u>タグで囲む）",
  "wrongChoices": ["不正解の選択肢1", "不正解の選択肢2", "不正解の選択肢3"]
}

JSONのみを出力してください。説明や追加のテキストは不要です。`;

  try {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "あなたは大学受験向け英単語学習アプリの問題作成AIです。指示に従って、自然で適切な例文と紛らわしい選択肢を生成してください。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
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

    const parsed = JSON.parse(content);

    return {
      sentence: parsed.sentence,
      wrongChoices: parsed.wrongChoices,
    };
  } catch (error) {
    console.error(`[AI] Failed to generate question content for ${word}:`, error);
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  console.log("[Cache Generator] Starting cache generation...");

  // データベース接続
  const connection = await mysql.createConnection(ENV.databaseUrl);
  const db = drizzle(connection);

  // キャッシュがない単語を取得
  const wordsToCache = await db
    .select()
    .from(words)
    .where(isNull(words.cachedSentence))
    .limit(100); // 一度に100語ずつ処理

  console.log(`[Cache Generator] Found ${wordsToCache.length} words without cache`);

  let successCount = 0;
  let failCount = 0;

  for (const word of wordsToCache) {
    try {
      console.log(`[Cache Generator] Generating cache for: ${word.word}`);

      const otherMeanings = [word.commonMeaning2, word.commonMeaning3].filter(
        (m) => m !== null && m !== ""
      );

      const generated = await generateQuestionContent(
        word.word,
        word.partOfSpeech,
        word.commonMeaning1,
        otherMeanings
      );

      // データベースを更新
      await db
        .update(words)
        .set({
          cachedSentence: generated.sentence,
          cachedChoice1: generated.wrongChoices[0],
          cachedChoice2: generated.wrongChoices[1],
          cachedChoice3: generated.wrongChoices[2],
          cacheGeneratedAt: new Date(),
        })
        .where(eq(words.id, word.id));

      successCount++;
      console.log(`[Cache Generator] ✓ Success (${successCount}/${wordsToCache.length})`);

      // レート制限を避けるため、少し待機
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      failCount++;
      console.error(`[Cache Generator] ✗ Failed for ${word.word}:`, error.message);
    }
  }

  console.log(`[Cache Generator] Completed: ${successCount} success, ${failCount} failed`);

  await connection.end();
}

main().catch((error) => {
  console.error("[Cache Generator] Fatal error:", error);
  process.exit(1);
});
