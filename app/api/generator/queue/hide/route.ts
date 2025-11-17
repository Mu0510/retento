import { NextResponse } from "next/server";
import { hideRegenerationQueueEntries } from "@/generator/backend/supabaseClient";

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as { ids?: unknown[] };
    const ids =
      Array.isArray(payload.ids) && payload.ids.length
        ? payload.ids.filter((id): id is string => typeof id === "string" && id.trim())
        : [];
    if (!ids.length) {
      return NextResponse.json(
        { success: false, error: "非表示にするキューIDが見つかりません。" },
        { status: 400 }
      );
    }
    await hideRegenerationQueueEntries(ids);
    return NextResponse.json({ success: true, hidden: ids.length });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
