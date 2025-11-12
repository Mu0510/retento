import { NextResponse } from "next/server";
import { supabaseAdminClient } from "@/lib/supabase-admin";

const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  const cleanedEmail = email?.trim();

  if (!cleanedEmail || !password) {
    return NextResponse.json(
      { error: "メールアドレスとパスワードを両方入力してください" },
      { status: 400 },
    );
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `パスワードは${MIN_PASSWORD_LENGTH}文字以上である必要があります` },
      { status: 400 },
    );
  }

  const { error } = await supabaseAdminClient.auth.admin.createUser({
    email: cleanedEmail,
    password,
    email_confirm: true,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
