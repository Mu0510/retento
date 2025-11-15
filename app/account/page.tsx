"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type AuthMethod = {
  provider: string;
  provider_user_id: string;
  email: string;
  is_primary: boolean;
  created_at: string;
};

export default function AccountSettingsPage() {
  const { data: session } = useSession();
  const [methods, setMethods] = useState<AuthMethod[]>([]);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadMethods = async () => {
    try {
      const res = await fetch("/api/account/auth-methods");
      if (!res.ok) throw new Error("認証情報が取得できません");
      const json = await res.json();
      setMethods(json.methods ?? []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    void loadMethods();
  }, []);

  const handlePasswordUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password || password.length < 8) {
      setStatus("パスワードは8文字以上で入力してください");
      return;
    }
    setUpdating(true);
    setStatus(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "更新に失敗しました");
      }
      setStatus("パスワードを更新しました");
      setPassword("");
      await loadMethods();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-[90vw] max-w-4xl px-4 py-16 sm:py-20">
        <div className="space-y-10">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-400">Account</p>
            <h1 className="text-4xl font-semibold text-gray-900 leading-tight">
              アカウント設定
            </h1>
            <p className="text-sm text-gray-600 leading-relaxed">
              メールアドレスとパスワードで安全にログインできるように、認証情報を整理してあります。
            </p>
            {session?.user?.email && (
              <p className="text-sm text-slate-500">ログイン中のメール: {session.user.email}</p>
            )}
          </div>

          <div className="space-y-6 rounded-2xl border border-gray-100 bg-white/90 p-6">
            <h2 className="text-lg font-semibold text-slate-900">認証情報</h2>
            <p className="text-sm text-slate-500">
              現在のログイン方法と、追加された認証プロバイダーを確認できます。
            </p>
            <div className="space-y-3">
              {methods.map((method) => (
                <div key={`${method.provider}-${method.provider_user_id}`} className="p-4 rounded-2xl border border-gray-200 bg-slate-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      {method.provider === "credentials" ? "メール / パスワード" : method.provider}
                    </p>
                    {method.is_primary && (
                      <span className="text-xs font-semibold text-emerald-600">主要</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{method.email}</p>
                  <p className="text-xs text-slate-400">登録: {new Date(method.created_at).toLocaleString()}</p>
                </div>
              ))}
              {methods.length === 0 && (
                <p className="text-sm text-slate-500">認証方法を取得中です…</p>
              )}
            </div>
          </div>

          <form
            onSubmit={handlePasswordUpdate}
            className="space-y-4 rounded-2xl border border-gray-100 bg-white/90 p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-slate-900">パスワードの設定</h2>
            <p className="text-sm text-slate-500">
              Google などの OAuth で作成したアカウントにも、ここからパスワードを設定できます。
            </p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500">新しいパスワード</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm"
                placeholder="8文字以上のパスワード"
              />
            </div>
            <button
              type="submit"
              disabled={updating}
              className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {updating ? "更新中…" : "パスワードを保存"}
            </button>
            {status && <p className="text-sm text-rose-500">{status}</p>}
          </form>

          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white/90 p-6">
            <p className="text-sm text-gray-600">
              ご希望の設定がすぐに反映されるよう、必要な情報をそっと整えています。
            </p>
            <Link
              href="/"
              className="text-sm font-semibold text-[#c2255d] underline underline-offset-4 decoration-[#c2255d]/60"
            >
              ランディングページに戻る
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
