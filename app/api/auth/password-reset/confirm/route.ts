import { NextRequest, NextResponse } from "next/server";

import { consumePasswordResetToken, updatePassword } from "@/lib/services/password-reset";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!token || !password) {
      return NextResponse.json({ error: "トークンとパスワードを指定してください" }, { status: 400 });
    }
    const userId = await consumePasswordResetToken(token);
    await updatePassword(userId, password);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "更新に失敗しました" }, { status: 400 });
  }
}
