import { NextRequest, NextResponse } from "next/server";

import { requireSessionUser } from "@/lib/auth/session";
import { updatePassword } from "@/lib/services/password-reset";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireSessionUser();
    const body = await request.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password.trim() : "";
    if (!password || password.length < 8) {
      return NextResponse.json({ error: "パスワードは8文字以上で入力してください" }, { status: 400 });
    }
    await updatePassword(userId, password);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "パスワード更新に失敗しました" },
      { status: 400 },
    );
  }
}
