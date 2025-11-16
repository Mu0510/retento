import { NextResponse } from "next/server";
import { supabase } from "@/generator/backend/supabaseClient";

type QuestionRow = {
  id: string | null;
  word_id: number | null;
  word: string | null;
  sentence_en: string | null;
};

type WordCountEntry = {
  wordId: number | null;
  word: string;
  count: number;
};

type DbCheckSummary = {
  totalQuestions: number;
  uniqueWords: number;
  wordIdRange: { min: number | null; max: number | null };
  questionIdRange: { min: string | null; max: string | null };
};

type DbCountIssue = {
  wordId: number | null;
  word: string;
  count: number;
};

type DbTagIssue = {
  id: string | null;
  wordId: number | null;
  word: string;
  sentence: string;
  reason: string;
};

const CHUNK_SIZE = 500;
const ISSUE_LIMIT = 30;

export async function GET() {
  try {
    const rows = await fetchAllQuestions();
    const summary = buildSummary(rows);
    const countIssues = buildCountIssues(rows).slice(0, ISSUE_LIMIT);
    const tagIssues = buildTagIssues(rows).slice(0, ISSUE_LIMIT);

    return NextResponse.json({
      success: true,
      summary,
      issues: {
        underCount: countIssues,
        tagIssues,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

async function fetchAllQuestions(): Promise<QuestionRow[]> {
  const rows: QuestionRow[] = [];
  let rangeStart = 0;
  while (true) {
    const { data, error } = await supabase
      .from("generated_questions")
      .select("id, word_id, word, sentence_en")
      .order("word_id", { ascending: true })
      .range(rangeStart, rangeStart + CHUNK_SIZE - 1);
    if (error) {
      throw error;
    }
    if (!data || data.length === 0) {
      break;
    }
    rows.push(...data);
    if (data.length < CHUNK_SIZE) {
      break;
    }
    rangeStart += CHUNK_SIZE;
  }
  return rows;
}

function buildSummary(rows: QuestionRow[]): DbCheckSummary {
  const wordIdValues = rows
    .map((row) => row.word_id)
    .filter((value): value is number => typeof value === "number");
  const minWordId = wordIdValues.length ? Math.min(...wordIdValues) : null;
  const maxWordId = wordIdValues.length ? Math.max(...wordIdValues) : null;

  const questionIds = rows
    .map((row) => row.id)
    .filter((value): value is string => typeof value === "string")
    .sort();
  const minQuestionId = questionIds.length ? questionIds[0] : null;
  const maxQuestionId = questionIds.length ? questionIds[questionIds.length - 1] : null;

  const allWords = collapseWordCounts(rows);
  return {
    totalQuestions: rows.length,
    uniqueWords: allWords.length,
    wordIdRange: { min: minWordId, max: maxWordId },
    questionIdRange: { min: minQuestionId, max: maxQuestionId },
  };
}

function collapseWordCounts(rows: QuestionRow[]): WordCountEntry[] {
  const map = new Map<string, WordCountEntry>();
  for (const row of rows) {
    const key = row.word_id !== null ? `wordId:${row.word_id}` : `word:${(row.word ?? "").trim()}`;
    const wordText = (row.word ?? "（不明な語）").trim() || "（不明な語）";
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { wordId: row.word_id ?? null, word: wordText, count: 1 });
    }
  }
  return [...map.values()];
}

function buildCountIssues(rows: QuestionRow[]): WordCountEntry[] {
  return collapseWordCounts(rows).filter((entry) => entry.count < 10).sort((a, b) => a.word.localeCompare(b.word));
}

function buildTagIssues(rows: QuestionRow[]): DbTagIssue[] {
  const problems: DbTagIssue[] = [];
  for (const row of rows) {
    const reason = validateUnderline(row.sentence_en, row.word);
    if (reason) {
      problems.push({
        id: row.id ?? null,
        wordId: row.word_id ?? null,
        word: (row.word ?? "（不明な語）").trim() || "（不明な語）",
        sentence: row.sentence_en ?? "",
        reason,
      });
    }
  }
  return problems;
}

function validateUnderline(sentence: string | null, word: string | null): string | null {
  if (!sentence) {
    return "英文が空です";
  }
  const openIndex = sentence.indexOf("<u>");
  if (openIndex === -1) {
    return "<u> タグが見つかりません";
  }
  const closeIndex = sentence.indexOf("</u>", openIndex + 3);
  if (closeIndex === -1) {
    return "</u> タグが見つかりません";
  }
  const inner = sentence.slice(openIndex + 3, closeIndex).trim().toLowerCase();
  const target = (word ?? "").trim().toLowerCase();
  if (target && !inner.includes(target)) {
    return `<u> タグ内の語 (${inner}) が単語 (${target}) と一致しません`;
  }
  return null;
}
