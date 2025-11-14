import { NextResponse } from "next/server";

import { UnauthorizedError, requireSessionUser } from "@/lib/auth/session";
import { supabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { userId } = await requireSessionUser();

    const { data, error } = await supabaseAdminClient
      .from("user_profiles")
      .select("word_score")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[score-route] supabase error", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ score: data?.word_score ?? 0 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error("[score-route] failed to load score", error);
    return NextResponse.json({ error: "スコアを取得できませんでした" }, { status: 500 });
  }
}
