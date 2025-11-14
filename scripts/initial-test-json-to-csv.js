/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const INPUT_PATH = path.join(__dirname, "../data/initial-test-questions.json");
const OUTPUT_PATH = path.join(__dirname, "../initial_test_questions_for_supabase.csv");

const HEADERS = [
  "word_id",
  "difficulty_score",
  "sentence_context",
  "sentence_japanese",
  "correct_answer",
  "choice_1",
  "choice_2",
  "choice_3",
  "choice_4",
  "created_at",
  "feedback_for_choice_1",
  "feedback_for_choice_2",
  "feedback_for_choice_3",
  "feedback_for_choice_4",
];

function escapeCsv(value) {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (text.includes("\n") || text.includes(",") || text.includes('"')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function main() {
  const raw = fs.readFileSync(INPUT_PATH, "utf-8");
  const records = JSON.parse(raw);
  const lines = [HEADERS.join(",")];

  records.forEach((record) => {
    const row = HEADERS.map((column) => escapeCsv(record[column] ?? ""));
    lines.push(row.join(","));
  });

  fs.writeFileSync(OUTPUT_PATH, lines.join("\n"), "utf-8");
  console.log(`wrote ${lines.length - 1} rows to ${OUTPUT_PATH}`);
}

main();
