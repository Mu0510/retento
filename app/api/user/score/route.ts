import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { supabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    console.log("[score-route] no session");
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }
  console.log("[score-route] session", session);
  console.log("[score-route] session userId", session.user?.id);
  let userId = session.user?.id;
  if (!userId && session.user?.email) {
    const { data: userRecord, error: userError } = await supabaseAdminClient.auth.getUserByEmail(
      session.user.email,
    );
    if (userError) {
      console.log("[score-route] getUserByEmail error", userError.message);
    }
    userId = userRecord?.user?.id ?? null;
    console.log("[score-route] fallback userId", userId);
  }
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { data, error } = await supabaseAdminClient
    .from("user_profiles")
    .select("word_score")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.log("[score-route] supabase error", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ score: data?.word_score ?? 0 });
}
