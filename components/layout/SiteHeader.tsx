'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, type MotionStyle } from 'motion/react';
import { Menu, X, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { cn } from '@/lib/utils';

export type SiteNavigationItem = {
  id: string;
  label: string;
  href?: string;
  onClick?: () => void;
};

export type SiteHeaderUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export type SiteHeaderAction = () => void | Promise<void>;

export interface SiteHeaderProps {
  navItems?: SiteNavigationItem[];
  isAuthenticated?: boolean;
  user?: SiteHeaderUser | null;
  onLogin?: SiteHeaderAction;
  onSignup?: SiteHeaderAction;
  onNavigateToApp?: SiteHeaderAction;
  onAccountSettings?: SiteHeaderAction;
  onSignOut?: SiteHeaderAction;
  onNavigateHome?: SiteHeaderAction;
  onLogoClick?: SiteHeaderAction;
  className?: string;
  containerClassName?: string;
  style?: MotionStyle;
}

const DEFAULT_CONTAINER_CLASS = 'mx-auto w-[90vw] max-w-[1600px] px-4 sm:px-6 lg:px-8';
const DEFAULT_HEADER_CLASS =
  'fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100';

const noop: SiteHeaderAction = () => undefined;

export function SiteHeader({
  navItems = [],
  isAuthenticated = false,
  user = null,
  onLogin = noop,
  onSignup = noop,
  onNavigateToApp = noop,
  onAccountSettings = noop,
  onSignOut = noop,
  onNavigateHome,
  onLogoClick,
  className,
  containerClassName,
  style,
}: SiteHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isAuthenticated && isUserMenuOpen) {
      queueMicrotask(() => {
        setIsUserMenuOpen(false);
      });
    }
  }, [isAuthenticated, isUserMenuOpen]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!isUserMenuOpen) return;
      const target = event.target as Node;
      if (
        userMenuButtonRef.current?.contains(target) ||
        userMenuRef.current?.contains(target)
      ) {
        return;
      }
      setIsUserMenuOpen(false);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isUserMenuOpen]);

  const userInitial = useMemo(() => {
    const seed = user?.name ?? user?.email ?? 'R';
    return seed.charAt(0).toUpperCase();
  }, [user?.email, user?.name]);

  const navigateHome = onNavigateHome ?? onNavigateToApp;

  const handleAction = (action: SiteHeaderAction | undefined) => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
    if (action) {
      void action();
    }
  };

  const handleNavItemSelect = (item: SiteNavigationItem) => {
    setIsMenuOpen(false);
    item.onClick?.();
  };

  const availableUserMenuActions = [
    {
      id: 'app',
      label: 'アプリに移動',
      description: '学習セッションを開く',
      action: onNavigateToApp,
    },
    {
      id: 'settings',
      label: 'アカウント設定',
      description: 'プロフィール・通知を管理',
      action: onAccountSettings,
    },
    {
      id: 'logout',
      label: 'ログアウト',
      description: 'Retentoからサインアウトする',
      action: onSignOut,
    },
  ].filter((menuItem) => Boolean(menuItem.action));

  const isUserMenuActive = isAuthenticated && isUserMenuOpen;

  return (
    <motion.header
      style={style}
      className={cn(DEFAULT_HEADER_CLASS, className)}
    >
      <div className={cn(DEFAULT_CONTAINER_CLASS, containerClassName)}>
        <div className="flex items-center justify-between h-16">
          <button
            type="button"
            className="flex items-center gap-2"
            onClick={() => handleAction(onLogoClick)}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
              <span className="text-white">R</span>
            </div>
            <span className="text-xl tracking-tight">Retento</span>
          </button>

          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) =>
              item.onClick ? (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavItemSelect(item)}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {item.label}
                </button>
              ) : (
                <a
                  key={item.id}
                  href={item.href ?? '#'}
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {item.label}
                </a>
              ),
            )}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="relative group">
                <span className="pointer-events-none absolute -inset-2 rounded-full bg-gray-200/60 opacity-0 transition duration-200 group-hover:opacity-80" />
                <button
                  ref={userMenuButtonRef}
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  aria-label="ユーザーメニューを開く"
                  aria-expanded={isUserMenuActive}
                  className="relative z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400"
                >
                  {user?.image ? (
                    <ImageWithFallback
                      src={user.image}
                      width={34}
                      height={34}
                      alt="ユーザーアイコン"
                      className="h-[34px] w-[34px] rounded-full"
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </button>
                {isUserMenuActive && (
                  <div
                    ref={userMenuRef}
                    className="absolute right-0 top-full mt-3 w-56 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
                  >
                    <div className="px-1 pb-2">
                      <p className="text-[10px] uppercase tracking-[0.4em] text-gray-400">Account</p>
                      <p className="mt-1 truncate text-sm font-semibold text-gray-900">
                        {user?.name ?? user?.email ?? 'Retento'}
                      </p>
                    </div>
                    <div className="mt-1 space-y-1">
                      {availableUserMenuActions.map((menuItem) => (
                        <button
                          key={menuItem.id}
                          type="button"
                          onClick={() => handleAction(menuItem.action)}
                          className={cn(
                            'flex w-full items-center justify-between rounded-2xl px-3 py-2 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c2255d]/60',
                            menuItem.id === 'logout'
                              ? 'text-[#c2255d] hover:bg-[#c2255d]/5'
                              : 'text-gray-700 hover:bg-gray-50',
                          )}
                        >
                          <div className="flex flex-col text-left">
                            <span className="text-sm font-semibold leading-snug">{menuItem.label}</span>
                            <span className="text-[11px] text-gray-500 leading-tight">{menuItem.description}</span>
                          </div>
                          <ChevronRight
                            className={cn(
                              'h-4 w-4 transition',
                              menuItem.id === 'logout' ? 'text-[#c2255d]' : 'text-gray-400',
                            )}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Button variant="ghost" onClick={() => handleAction(onLogin)}>
                  ログイン
                </Button>
                <Button
                  className="bg-[#c2255d] hover:bg-[#a01d4d] text-white"
                  onClick={() => handleAction(onSignup)}
                >
                  今すぐ始める
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label="メニューを開閉する"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg"
        >
          <div className={cn(DEFAULT_CONTAINER_CLASS, containerClassName)}>
            <div className="py-6 space-y-4">
              {navItems.map((item) =>
                item.onClick ? (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavItemSelect(item)}
                    className="block w-full text-left px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {item.label}
                  </button>
                ) : (
                  <a
                    key={item.id}
                    href={item.href ?? '#'}
                    className="block w-full px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    {item.label}
                  </a>
                ),
              )}
              <div className="pt-4 border-t border-gray-100 space-y-2">
                {isAuthenticated ? (
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      onClick={() => handleAction(onSignOut)}
                      className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                    >
                      <span className="h-6 w-6 rounded-full bg-gray-100 text-center text-xs leading-6">
                        {userInitial}
                      </span>
                      サインアウト
                    </button>
                    {navigateHome && (
                      <Button
                        className="w-full bg-[#c2255d] hover:bg-[#a01d4d] text-white"
                        onClick={() => handleAction(navigateHome)}
                      >
                        ホームへ戻る
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <Button variant="outline" className="w-full" onClick={() => handleAction(onLogin)}>
                      ログイン
                    </Button>
                    <Button
                      className="w-full bg-[#c2255d] hover:bg-[#a01d4d] text-white"
                      onClick={() => handleAction(onSignup)}
                    >
                      今すぐ始める
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
