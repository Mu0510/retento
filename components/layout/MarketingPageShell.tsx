"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { SiteHeader, type SiteNavigationItem } from "./SiteHeader";
import { SiteFooter, type SiteFooterLink } from "./SiteFooter";

const navigationItems: SiteNavigationItem[] = [
  { id: "concept", label: "コンセプト", href: "/#concept" },
  { id: "features", label: "機能", href: "/#features" },
];

const productLinks: SiteFooterLink[] = navigationItems.map((item) => ({
  label: item.label,
  href: item.href,
}));

const supportLinks: SiteFooterLink[] = [
  { label: "ヘルプセンター", href: "/support/help-center" },
  { label: "よくある質問", href: "/support/faq" },
  { label: "お問い合わせ", href: "/support/contact" },
];

const legalLinks: SiteFooterLink[] = [
  { label: "利用規約", href: "/terms" },
  { label: "プライバシーポリシー", href: "/privacy" },
  { label: "特定商取引法に基づく表記", href: "/legal/commerce" },
];

interface MarketingPageShellProps {
  children: ReactNode;
}

export function MarketingPageShell({ children }: MarketingPageShellProps) {
  const router = useRouter();

  const goHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const goToLogin = useCallback(() => {
    router.push("/auth/login");
  }, [router]);

  const goToSignup = useCallback(() => {
    router.push("/auth/signup");
  }, [router]);

  const goToApp = useCallback(() => {
    router.push("/app");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#fdfdfd] flex flex-col">
      <SiteHeader
        navItems={navigationItems}
        onNavigateHome={goHome}
        onLogoClick={goHome}
        onLogin={goToLogin}
        onSignup={goToSignup}
        onNavigateToApp={goToApp}
        isAuthenticated={false}
      />
      <main className="flex-1 pt-24">{children}</main>
      <SiteFooter
        productLinks={productLinks}
        supportLinks={supportLinks}
        legalLinks={legalLinks}
      />
    </div>
  );
}
