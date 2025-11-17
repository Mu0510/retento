import { NextResponse } from "next/server";
import { supabase } from "@/generator/backend/supabaseClient";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function insertUnderline(sentence: string, target: string) {
  const pattern = new RegExp(`\\b${escapeRegExp(target)}\\b`, "i");
  const match = pattern.exec(sentence);
  if (!match) {
    return sentence;
  }
  const before = sentence.slice(0, match.index);
  const after = sentence.slice(match.index + match[0].length);
  return `${before}<u>${match[0]}</u>${after}`;
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json().catch(() => null)) as { ids?: unknown } | null;
    const ids = Array.isArray(payload?.ids)
      ? payload.ids.filter((item): item is string => typeof item === "string" && item.length > 0)
      : [];

    if (!ids.length) {
      return NextResponse.json(
        { success: false, error: "有効な ID を含む id 配列を送信してください。" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("generated_questions")
      .select("id, sentence_en, word")
      .in("id", ids);

    if (error) {
      throw error;
    }

    let updatedCount = 0;
    for (const row of data ?? []) {
      if (!row?.id || typeof row?.sentence_en !== "string") {
        continue;
      }
      const originalWord = (row.word ?? "").trim();
      const cleanedWord = originalWord.replace(/<\/?u>/gi, "").trim();
      const targetWord = cleanedWord || originalWord;
      if (!targetWord) {
        continue;
      }
      const updatedSentence = insertUnderline(row.sentence_en, targetWord);
      if (updatedSentence === row.sentence_en) {
        if (cleanedWord && cleanedWord !== originalWord) {
          const wordUpdate = await supabase
            .from("generated_questions")
            .update({ word: cleanedWord })
            .eq("id", row.id);
          if (wordUpdate.error) {
            throw wordUpdate.error;
          }
          updatedCount += 1;
        }
        continue;
      }
      const updatePayload: Record<string, string> = { sentence_en: updatedSentence };
      if (cleanedWord && cleanedWord !== originalWord) {
        updatePayload.word = cleanedWord;
      }
      const updateResult = await supabase
        .from("generated_questions")
        .update(updatePayload)
        .eq("id", row.id);
      if (updateResult.error) {
        throw updateResult.error;
      }
      updatedCount += 1;
    }

    return NextResponse.json({ success: true, updated: updatedCount });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
