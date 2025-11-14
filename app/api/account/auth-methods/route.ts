import { NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/auth/session";
import { supabaseAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { userId } = await requireSessionUser();
    const { data, error } = await supabaseAdminClient
      .from("auth_methods")
      .select("provider, provider_user_id, email, is_primary, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) {
      throw error;
    }
    return NextResponse.json({ methods: (data ?? []) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "認証情報の取得に失敗しました" },
      { status: 500 },
    );
  }
}
