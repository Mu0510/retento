"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function PasswordResetRequestPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email) {
      setStatus("メールアドレスを入力してください");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "送信に失敗しました");
      }
      setStatus("メールを送信しました。受信トレイを確認してください。");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f6fb] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-slate-900">パスワードを再設定</h1>
        <p className="text-sm text-slate-500 mt-2">
          メールアドレスをご入力いただくと、リンクを送付します。
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1 text-sm">
            <label className="font-semibold text-slate-600">メールアドレス</label>
            <input
              type="email"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "送信中…" : "パスワード再設定メールを送る"}
          </Button>
          {status && <p className="text-sm text-slate-600">{status}</p>}
        </form>
      </div>
    </div>
  );
}
