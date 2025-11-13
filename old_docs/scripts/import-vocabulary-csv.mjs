import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { words } from "../drizzle/schema.js";
import fs from "fs";
import { parse } from "csv-parse/sync";

async function main() {
  console.log("Connecting to database...");
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  console.log("Reading CSV file...");
  const csvContent = fs.readFileSync("/home/ubuntu/retento-docs/data/vocabulary_latest.csv", "utf-8");
  
  // CSVをパース（ヘッダー付き）
  const records = parse(csvContent, {
    columns: true, // 最初の行をヘッダーとして使用
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Found ${records.length} words in CSV`);

  let inserted = 0;
  let skipped = 0;
  const batchSize = 100;
  const batches = [];
  const seenWords = new Set();

  for (const record of records) {
    const word = record.word;
    const partOfSpeech = record.part_of_speech;
    const difficultyScore = parseInt(record.difficulty_score);
    const meaning1 = record.meaning_1;
    const meaning2 = record.meaning_2;
    const meaning3 = record.meaning_3;

    if (!word || !partOfSpeech || !difficultyScore || !meaning1) {
      console.warn(`Skipping invalid record:`, record);
      skipped++;
      continue;
    }

    // 重複をスキップ
    if (seenWords.has(word)) {
      console.warn(`Skipping duplicate word: ${word}`);
      skipped++;
      continue;
    }
    seenWords.add(word);

    batches.push({
      word: word,
      partOfSpeech: partOfSpeech,
      difficultyScore: difficultyScore,
      commonMeaning1: meaning1,
      commonMeaning2: meaning2 || null,
      commonMeaning3: meaning3 || null,
    });

    // バッチサイズに達したら挿入
    if (batches.length >= batchSize) {
      try {
        await db.insert(words).values(batches);
        inserted += batches.length;
        console.log(`Inserted ${inserted}/${records.length} words...`);
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
      console.log(`Inserted ${inserted}/${records.length} words...`);
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
