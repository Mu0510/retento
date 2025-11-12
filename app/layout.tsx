import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Retento — 英単語学習アプリ",
  description:
    "Retentoは忘却曲線とAIを組み合わせたUXを中心とする英単語学習アプリです。コアコンセプト、UX設計、AI活用、技術スタックをまとめた紹介ページです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${inter.variable} antialiased bg-[#fdfdfd]`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
