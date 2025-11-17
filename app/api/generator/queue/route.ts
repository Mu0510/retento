import { NextResponse } from "next/server";
import { addToRegenerationQueue, getRegenerationQueue } from "@/generator/backend/regenerationQueue";

export async function GET() {
  try {
    const rawEntries = await getRegenerationQueue();
    const entries = rawEntries.map((entry) => ({
      id: entry.id,
      wordId: entry.word_id,
      word: entry.word,
      reason: entry.reason,
      status: entry.status,
      sessionId: entry.session_id,
      lastError: entry.last_error,
      updatedAt: entry.updated_at,
    }));
    return NextResponse.json({ success: true, entries });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      entries?: { wordId?: unknown; word?: unknown; reason?: unknown }[];
    };
    const normalized =
      Array.isArray(payload.entries) && payload.entries.length
        ? payload.entries
            .map((entry) => {
              const wordId = entry.wordId;
              if (typeof wordId !== "number" || Number.isNaN(wordId) || wordId <= 0) {
                return null;
              }
              return {
                wordId,
                word: typeof entry.word === "string" && entry.word.trim() ? entry.word.trim() : `word${wordId}`,
                reason: typeof entry.reason === "string" ? entry.reason.trim() : "再生成対象",
              };
            })
            .filter((entry): entry is { wordId: number; word: string; reason: string } => Boolean(entry))
        : [];

    const inserted = await addToRegenerationQueue(normalized);
    return NextResponse.json({ success: true, added: inserted.length });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
