import { drizzle } from "drizzle-orm/mysql2";
import { words } from "../drizzle/schema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importWords() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);

  // CSVファイルを読み込む
  const csvPath = path.join(__dirname, "../data/vocabulary.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const lines = csvContent.split("\n").filter(line => line.trim());

  // ヘッダー行をスキップ
  const dataLines = lines.slice(1);

  console.log(`Found ${dataLines.length} words to import`);

  const wordsToInsert = [];

  for (const line of dataLines) {
    // CSVパース（カンマで分割）
    const parts = line.split(",");
    
    if (parts.length < 5) {
      console.warn(`Skipping invalid line: ${line}`);
      continue;
    }

    const [id, word, partOfSpeech, difficultyScore, commonMeaning1, commonMeaning2, commonMeaning3] = parts;

    wordsToInsert.push({
      word: word.trim(),
      partOfSpeech: partOfSpeech.trim(),
      difficultyScore: parseInt(difficultyScore.trim(), 10),
      commonMeaning1: commonMeaning1.trim(),
      commonMeaning2: commonMeaning2 ? commonMeaning2.trim() : null,
      commonMeaning3: commonMeaning3 ? commonMeaning3.trim() : null,
    });
  }

  console.log(`Prepared ${wordsToInsert.length} words for insertion`);

  // バッチで挿入（100件ずつ）
  const batchSize = 100;
  for (let i = 0; i < wordsToInsert.length; i += batchSize) {
    const batch = wordsToInsert.slice(i, i + batchSize);
    try {
      await db.insert(words).values(batch);
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(wordsToInsert.length / batchSize)}`);
    } catch (error) {
      console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
    }
  }

  console.log("Import completed!");
  process.exit(0);
}

importWords();
