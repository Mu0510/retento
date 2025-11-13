/**
 * 全単語のベクトル埋め込みを生成してデータベースに保存するスクリプト
 * 
 * 使用方法: node scripts/generate-embeddings.mjs
 */

import { drizzle } from "drizzle-orm/mysql2";
import { words } from "../drizzle/schema.js";
import { eq, isNull } from "drizzle-orm";
import OpenAI from "openai";
import dotenv from "dotenv";

// 環境変数を読み込み
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.BUILT_IN_FORGE_API_KEY,
  baseURL: `${process.env.BUILT_IN_FORGE_API_URL}/v1`,
});

const db = drizzle(process.env.DATABASE_URL);

/**
 * 単語のベクトル埋め込みを生成
 */
async function generateEmbedding(word) {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: word,
      encoding_format: "float",
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error(`Error generating embedding for "${word}":`, error.message);
    return null;
  }
}

/**
 * バッチ処理で全単語のベクトルを生成
 */
async function generateAllEmbeddings() {
  console.log("Starting embedding generation...");
  
  // embeddingがnullの単語を取得
  const wordsToProcess = await db
    .select()
    .from(words)
    .where(isNull(words.embedding))
    .execute();
  
  console.log(`Found ${wordsToProcess.length} words without embeddings`);
  
  let processed = 0;
  let failed = 0;
  
  for (const wordRow of wordsToProcess) {
    const embedding = await generateEmbedding(wordRow.word);
    
    if (embedding) {
      // ベクトルをJSON文字列として保存
      await db
        .update(words)
        .set({ embedding: JSON.stringify(embedding) })
        .where(eq(words.id, wordRow.id))
        .execute();
      
      processed++;
      
      if (processed % 10 === 0) {
        console.log(`Progress: ${processed}/${wordsToProcess.length} (${failed} failed)`);
      }
    } else {
      failed++;
    }
    
    // APIレート制限を考慮して少し待機
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\nCompleted! Processed: ${processed}, Failed: ${failed}`);
}

// スクリプト実行
generateAllEmbeddings()
  .then(() => {
    console.log("Embedding generation finished successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
