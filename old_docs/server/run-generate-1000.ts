import { generateQuestionsForWordIds } from "./generate-1000-questions";
import * as fs from "fs";

async function main() {
  console.log("[Run] Starting 1000 questions generation...");
  
  const wordIds = JSON.parse(fs.readFileSync("/tmp/word-ids-clean.json", "utf8"));
  console.log(`[Run] Total words to process: ${wordIds.length}`);
  
  const startTime = Date.now();
  const generatedCount = await generateQuestionsForWordIds(wordIds);
  const endTime = Date.now();
  
  const duration = Math.round((endTime - startTime) / 1000);
  console.log(`[Run] Completed! Generated ${generatedCount} questions in ${duration} seconds`);
}

main().catch((error) => {
  console.error("[Run] Fatal error:", error);
  process.exit(1);
});
