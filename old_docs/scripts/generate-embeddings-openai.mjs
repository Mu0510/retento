import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { words } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BATCH_SIZE = 100; // 一度に処理する単語数

if (!OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is not set");
  process.exit(1);
}

async function generateEmbedding(text) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function main() {
  console.log("Connecting to database...");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("Fetching all words...");
  const allWords = await db.select().from(words);
  console.log(`Found ${allWords.length} words`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;

  for (const word of allWords) {
    processed++;

    // 既にベクトルがある場合はスキップ
    if (word.embedding) {
      skipped++;
      if (processed % 100 === 0) {
        console.log(`Progress: ${processed}/${allWords.length} (${updated} updated, ${skipped} skipped)`);
      }
      continue;
    }

    try {
      // ベクトルを生成
      const embedding = await generateEmbedding(word.word);
      const embeddingJson = JSON.stringify(embedding);

      // データベースに保存
      await db
        .update(words)
        .set({ embedding: embeddingJson })
        .where(eq(words.id, word.id));

      updated++;

      if (processed % 10 === 0) {
        console.log(`Progress: ${processed}/${allWords.length} (${updated} updated, ${skipped} skipped)`);
      }

      // レート制限を避けるため少し待機
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Failed to generate embedding for word "${word.word}":`, error);
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total words: ${allWords.length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped: ${skipped}`);
  console.log("Done!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
