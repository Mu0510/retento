/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const VOCABULARY_PATH = path.join(__dirname, "../data/vocabulary.json");
const SOURCE_CSV = path.join(__dirname, "../initial_test_questions_20251114_112817.csv");
const OUTPUT_JSON = path.join(__dirname, "../data/initial-test-questions.json");

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  function flushField() {
    row.push(current);
    current = "";
  }

  function flushRow() {
    if (row.length) {
      rows.push(row);
      row = [];
    }
  }

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && (char === '\r' || char === '\n')) {
      flushField();
      flushRow();
      if (char === '\r' && text[i + 1] === '\n') {
        i += 1;
      }
      continue;
    }

    if (!inQuotes && char === ',') {
      flushField();
      continue;
    }

    current += char;
  }

  if (current !== "" || inQuotes) {
    flushField();
  }
  flushRow();
  return rows;
}

function normalizeWord(word) {
  return word.replace(/[^a-zA-Z']/g, "").toLowerCase();
}

function extractWordFromSentence(sentence) {
  if (!sentence) return null;
  const underMatch = sentence.match(/<u>(.*?)<\/u>/i);
  if (underMatch) {
    return underMatch[1].trim();
  }
  const genericMatch = sentence.match(/<([^>]+)>/);
  if (genericMatch) {
    return genericMatch[1].trim();
  }
  return null;
}

function buildVocabularyMap(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    if (!entry.word) return;
    const key = normalizeWord(entry.word);
    if (!map.has(key)) {
      map.set(key, entry);
    }
  });
  return map;
}

function generateCandidates(normalized) {
  const candidates = new Set();
  if (!normalized) return candidates;
  candidates.add(normalized);
  if (normalized.endsWith("s")) {
    candidates.add(normalized.slice(0, -1));
  }
  if (normalized.endsWith("ies")) {
    candidates.add(`${normalized.slice(0, -3)}y`);
  }
  if (normalized.endsWith("es") && normalized.length > 2) {
    candidates.add(normalized.slice(0, -2));
  }
  if (normalized.endsWith("ed")) {
    candidates.add(normalized.slice(0, -2));
  }
  if (normalized.endsWith("ing")) {
    candidates.add(normalized.slice(0, -3));
  }
  candidates.add(`${normalized}e`);
  return candidates;
}

function resolveVocabularyEntry(word, map) {
  if (!word) return null;
  const normalized = normalizeWord(word);
  const candidates = generateCandidates(normalized);
  for (const candidate of candidates) {
    if (map.has(candidate)) {
      return map.get(candidate);
    }
  }
  return null;
}

function main() {
  const vocabularyRaw = fs.readFileSync(VOCABULARY_PATH, "utf-8");
  const vocabularyEntries = JSON.parse(vocabularyRaw);
  const vocabMap = buildVocabularyMap(vocabularyEntries);

  const csvRaw = fs.readFileSync(SOURCE_CSV, "utf-8");
  const parsed = parseCsv(csvRaw);
  const header = parsed[0].map((value) => value.trim());
  const rows = parsed.slice(1).filter((row) => row.length === header.length);

  const processed = [];
  const missing = [];

  rows.forEach((row) => {
    const record = Object.fromEntries(row.map((value, index) => [header[index], value]));
    const englishWord = extractWordFromSentence(record.sentenceContext ?? "") || "";
    const matched = resolveVocabularyEntry(englishWord, vocabMap);

    if (!matched) {
      missing.push({ id: record.id, englishWord, correctAnswer: record.correctAnswer });
      return;
    }

    processed.push({
      id: Number(record.id) || undefined,
      word_id: Number(matched.id),
      difficulty_score: Number(matched.difficulty_score ?? record.difficultyScore ?? 0),
      sentence_context: record.sentenceContext,
      sentence_japanese: record.sentenceJapanese,
      correct_answer: record.correctAnswer,
      choice_1: record.choice1,
      choice_2: record.choice2,
      choice_3: record.choice3,
      choice_4: record.choice4,
      feedback_for_choice_1: record.feedbackForChoice1 || "",
      feedback_for_choice_2: record.feedbackForChoice2 || "",
      feedback_for_choice_3: record.feedbackForChoice3 || "",
      feedback_for_choice_4: record.feedbackForChoice4 || "",
      created_at: record.createdAt,
    });
  });

  if (missing.length) {
    console.warn("未マッチの単語がありました（手動対応が必要です）");
    console.table(missing.slice(0, 10));
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(processed, null, 2));
  console.log(`processed ${processed.length} questions → ${OUTPUT_JSON}`);
}

main();
