import { NextResponse } from "next/server";
import { supabase } from "@/generator/backend/supabaseClient";

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
      .select("id, sentence_en")
      .in("id", ids);

    if (error) {
      throw error;
    }

    const closingTagRegex = /<\/u(?!>)/g;
    let updatedCount = 0;
    for (const row of data ?? []) {
      if (!row?.id || typeof row.sentence_en !== "string") {
        continue;
      }
      const normalized = row.sentence_en.replace(closingTagRegex, "</u>");
      if (normalized === row.sentence_en) {
        continue;
      }
      const updateResult = await supabase
        .from("generated_questions")
        .update({ sentence_en: normalized })
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
