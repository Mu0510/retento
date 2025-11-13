import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { words } from "../drizzle/schema.js";
import fs from "fs";

async function main() {
  console.log("Connecting to database...");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("Reading CSV file...");
  const csvContent = fs.readFileSync("/home/ubuntu/retento-docs/data/vocabulary_new.csv", "utf-8");
  const lines = csvContent.split("\n").filter((line) => line.trim());

  // ヘッダーをスキップ
  const dataLines = lines.slice(1);
  console.log(`Found ${dataLines.length} words in CSV`);

  let inserted = 0;
  let skipped = 0;
  const batchSize = 100;
  const batches = [];
  const seenWords = new Set();

  for (const line of dataLines) {
    const [id, word, partOfSpeech, difficultyScore, meaning1, meaning2, meaning3] = line.split(",");

    if (!word || !partOfSpeech || !difficultyScore || !meaning1) {
      console.warn(`Skipping invalid line: ${line}`);
      skipped++;
      continue;
    }

    // 重複をスキップ
    if (seenWords.has(word.trim())) {
      console.warn(`Skipping duplicate word: ${word.trim()}`);
      skipped++;
      continue;
    }
    seenWords.add(word.trim());

    batches.push({
      word: word.trim(),
      partOfSpeech: partOfSpeech.trim(),
      difficultyScore: parseInt(difficultyScore) || 1,
      commonMeaning1: meaning1.trim(),
      commonMeaning2: meaning2?.trim() || null,
      commonMeaning3: meaning3?.trim() || null,
    });

    // バッチサイズに達したら挿入
    if (batches.length >= batchSize) {
      try {
        await db.insert(words).values(batches);
        inserted += batches.length;
        console.log(`Inserted ${inserted}/${dataLines.length} words...`);
      } catch (error) {
        console.error(`Failed to insert batch:`, error.message);
        // 個別に挿入を試みる
        for (const batch of batches) {
          try {
            await db.insert(words).values([batch]);
            inserted++;
          } catch (e) {
            console.error(`Failed to insert word "${batch.word}":`, e.message);
            skipped++;
          }
        }
      }
      batches.length = 0; // バッチをクリア
    }
  }

  // 残りのバッチを挿入
  if (batches.length > 0) {
    try {
      await db.insert(words).values(batches);
      inserted += batches.length;
      console.log(`Inserted ${inserted}/${dataLines.length} words...`);
    } catch (error) {
      console.error(`Failed to insert final batch:`, error.message);
      // 個別に挿入を試みる
      for (const batch of batches) {
        try {
          await db.insert(words).values([batch]);
          inserted++;
        } catch (e) {
          console.error(`Failed to insert word "${batch.word}":`, e.message);
          skipped++;
        }
      }
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Total words inserted: ${inserted}`);
  console.log(`Skipped (invalid or duplicate): ${skipped}`);
  console.log("Done!");

  await connection.end();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
