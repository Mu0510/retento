'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useScroll, useTransform } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import {
  Brain,
  Sparkles,
  Gauge,
  ChevronRight,
  ArrowRight,
  CheckCircle2,
  Zap,
  Target,
  TrendingUp,
} from 'lucide-react';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import { useSession, signOut } from 'next-auth/react';

export default function Page() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
  });
  const headerOpacity = useTransform(scrollYProgress, [0, 0.1], [0.95, 1]);
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [thumbVisible, setThumbVisible] = useState(false);
  const dragStartYRef = useRef(0);
  const scrollStartRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const pointerTargetRef = useRef<HTMLElement | null>(null);
  const topOffset = 67;
  const bottomOffset = 3;
  const rankingRows = [
    { rank: 1, name: '田中 太郎', score: '9,850' },
    { rank: 2, name: '佐藤 花子', score: '9,720' },
    { rank: 3, name: 'あなた', score: '9,680', highlight: true },
  ];
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const thumbMetricsRef = useRef({ height: 0, top: 0 });

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const updateThumb = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight <= clientHeight) {
        thumbMetricsRef.current = { height: 0, top: 0 };
        setThumbVisible(false);
        if (thumbRef.current) {
          thumbRef.current.style.height = "0px";
          thumbRef.current.style.transform = "translate3d(0, 0, 0)";
        }
        return;
      }
      const trackHeight = Math.max(clientHeight - topOffset - bottomOffset, 0);
      const rawHeight = (clientHeight / scrollHeight) * trackHeight;
      const thumbSize = Math.max(rawHeight, 48);
      const maxThumbTop = trackHeight - thumbSize;
      const progress = scrollTop / (scrollHeight - clientHeight);
      const targetTop = Math.min(maxThumbTop, progress * maxThumbTop);
      thumbMetricsRef.current = { height: thumbSize, top: targetTop };
      setThumbVisible(true);
      if (thumbRef.current) {
        thumbRef.current.style.height = `${thumbSize}px`;
        thumbRef.current.style.transform = `translate3d(0, ${targetTop}px, 0)`;
      }
    };

    const handleScroll = () => {
      updateThumb();
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        updateThumb();
      });
    };

    const handleResize = () => {
      updateThumb();
    };

    handleScroll();
    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [scrollContainerRef, topOffset, bottomOffset]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handlePointerMove = (event: PointerEvent) => {
      if (!isDragging) return;
      const thumbHeightValue = thumbMetricsRef.current.height;
      const trackHeight = Math.max(container.clientHeight - topOffset - bottomOffset - thumbHeightValue, 0);
      if (trackHeight <= 0) return;
      const deltaY = event.clientY - dragStartYRef.current;
      const scrollableHeight = container.scrollHeight - container.clientHeight;
      const thumbDeltaPercent = deltaY / trackHeight;
      const nextScrollTop = Math.min(
        scrollableHeight,
        Math.max(0, scrollStartRef.current + thumbDeltaPercent * scrollableHeight),
      );
      container.scrollTop = nextScrollTop;
      dragStartYRef.current = event.clientY;
      scrollStartRef.current = nextScrollTop;
      dragStartYRef.current = event.clientY;
      scrollStartRef.current = nextScrollTop;
    };

    const handlePointerUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (pointerIdRef.current !== null) {
          pointerTargetRef.current?.releasePointerCapture(pointerIdRef.current);
          pointerIdRef.current = null;
          pointerTargetRef.current = null;
        }
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, topOffset, bottomOffset]);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const goToLogin = useCallback(() => {
    router.push('/auth/login');
  }, [router]);

  const goToSignup = useCallback(() => {
    router.push('/auth/signup');
  }, [router]);

  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const goToApp = useCallback(() => {
    router.push(isAuthenticated ? '/app' : '/auth/login');
  }, [isAuthenticated, router]);

  const handleSignOut = useCallback(() => {
    void signOut({ callbackUrl: '/' });
  }, []);

  const goToAccountSettings = useCallback(() => {
    router.push('/account');
  }, [router]);

  const goHome = useCallback(() => {
    router.push('/');
  }, [router]);

  const navigationItems = useMemo(
    () => [
      {
        id: 'concept',
        label: 'コンセプト',
        onClick: () => scrollToSection('concept'),
      },
      {
        id: 'features',
        label: '機能',
        onClick: () => scrollToSection('features'),
      },
    ],
    [scrollToSection],
  );

  const productLinks = useMemo(
    () =>
      navigationItems.map((item) => ({
        label: item.label,
        href: item.href,
        onClick: item.onClick,
      })),
    [navigationItems],
  );

  const supportLinks = useMemo(
    () => [
      { label: 'ヘルプセンター', href: '/support/help-center' },
      { label: 'よくある質問', href: '/support/faq' },
      { label: 'お問い合わせ', href: '/support/contact' },
    ],
    [],
  );

  const legalLinks = useMemo(
    () => [
      { label: '利用規約', href: '/terms' },
      { label: 'プライバシーポリシー', href: '/privacy' },
      { label: '特定商取引法に基づく表記', href: '/legal/commerce' },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-white relative">
      <div
        ref={scrollContainerRef}
        className="scroll-wrapper h-screen w-full overflow-y-auto scroll-smooth"
      >
        <SiteHeader
          style={{ opacity: headerOpacity }}
          navItems={navigationItems}
          isAuthenticated={isAuthenticated}
          user={session?.user ?? null}
          onLogin={goToLogin}
          onSignup={goToSignup}
          onNavigateToApp={goToApp}
          onAccountSettings={goToAccountSettings}
          onSignOut={handleSignOut}
          onNavigateHome={goHome}
          onLogoClick={goHome}
        />

        {/* Hero Section */}
        <section className="relative pt-16 sm:pt-20 pb-16 sm:pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white -z-10" />
          <div className="mx-auto w-[90vw] max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="secondary" className="mb-6 bg-gray-100">
                大学受験向け英単語学習アプリ
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl tracking-tight mb-6 leading-[1.1]">
                ミニマルかつ<br />
                ストレスフリーな<br />
                <span className="bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  英単語学習体験を
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-gray-600 mb-8 leading-relaxed">
                Retentoは、最上級のUXを追求した英単語学習アプリです。ストレスなく自然に学び続けられる体験設計と、忘却曲線・AI活用による学習効果の最適化を両立します。
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  className="bg-[#c2255d] hover:bg-[#a01d4d] text-white group"
                  onClick={goToApp}
                >
                  アプリに移動
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => scrollToSection('concept')}>
                  詳しく見る
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <Card className="p-8 border-0 shadow-xl bg-gradient-to-br from-gray-50 to-white">
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm text-gray-500">問題 1 / 5</span>
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="w-1/5 h-full bg-[#c2255d]" />
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-6 border border-gray-200">
                    <p className="text-gray-700 mb-6">
                      The scientist&rsquo;s research was <span className="border-b-2 border-[#c2255d]">comprehensive</span> and well-documented.
                    </p>
                    <div className="space-y-3">
                      {['包括的な', '競争的な', '複雑な', '比較的な'].map((option, i) => (
                        <button
                          key={i}
                          className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
              <div className="absolute -bottom-6 -right-6 w-64 h-64 bg-gradient-to-br from-[#c2255d]/10 to-transparent rounded-full blur-3xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>


      {/* Core Concept Section */}
      <section id="concept" className="py-16 sm:py-24 bg-gray-50">
        <div className="mx-auto w-[90vw] max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl tracking-tight mb-4">
              コアコンセプト
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              3つの柱が支える、最高の学習体験
            </p>
          </motion.div>

          <div className="space-y-24">
            {/* Concept 1 - Scientific Evidence */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              <div className="order-2 lg:order-1">
                <Badge variant="secondary" className="mb-4 bg-gray-100">
                  <Brain className="w-3 h-3 mr-1" />
                  科学的根拠
                </Badge>
                <h3 className="text-2xl sm:text-3xl tracking-tight mb-4">
                  忘却曲線に基づく、記憶の科学
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  人間の記憶は時間とともに薄れていきます。Retentoは、エビングハウスの忘却曲線理論に基づき、忘れかけた最適なタイミングで復習を提示。記憶の定着を科学的に最大化します。
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">間隔反復学習アルゴリズムで最適な復習タイミングを自動計算</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">回答速度と自信度を考慮した高度なスケジューリング</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">個人の記憶パターンに適応する学習モデル</span>
                  </li>
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative">
                  <ImageWithFallback 
                    src="/memory-science.png" 
                    alt="Neuroscience and learning"
                    className="w-full h-[340px] object-cover object-bottom rounded-2xl shadow-xl"
                    width={1080}
                    height={400}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent rounded-2xl" />
                  <Card className="absolute bottom-6 left-6 right-6 p-4 bg-white/85 backdrop-blur-sm border-0 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">記憶定着率</span>
                      <span className="text-sm text-gray-900">+87%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: '87%' }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full bg-gradient-to-r from-gray-800 to-gray-900" 
                      />
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>

            {/* Concept 2 - AI Personalization */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              <div>
                <div className="relative">
                  <ImageWithFallback 
                    src="/ai-personalization.png" 
                    alt="AI personalization concept artwork"
                    className="w-full h-[340px] object-cover object-bottom rounded-2xl shadow-xl"
                    width={1080}
                    height={400}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent rounded-2xl" />
                  <Card className="absolute bottom-6 left-6 right-6 p-4 bg-white/85 backdrop-blur-sm border-0 shadow-lg">
                          <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 mb-1">AIが生成中...</p>
                        <p className="text-sm text-gray-900">語源解説と記憶術を作成</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
              <div>
                <Badge variant="secondary" className="mb-4 bg-gray-100">
                  <Sparkles className="w-3 h-3 mr-1" />
                  生成AI活用
                </Badge>
                <h3 className="text-2xl sm:text-3xl tracking-tight mb-4">
                  深い学びと実用性を両立
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  問題や解説は全てAIが作成。同じ問題が出題されることはありません。例文中で単語の意味を類推するという形式は、共通テスト等での出題を意識しています。
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">GPT-4による語源・類義語・記憶術の自動生成</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">テーマ別セッションで文脈的な学習を実現</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">実際のテストに即した単語力育成</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Concept 3 - Exceptional UX */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              <div className="order-2 lg:order-1">
                <Badge variant="secondary" className="mb-4 bg-gray-100">
                  <Gauge className="w-3 h-3 mr-1" />
                  卓越したUX
                </Badge>
                <h3 className="text-2xl sm:text-3xl tracking-tight mb-4">
                  学習の抵抗感をゼロに、継続を当たり前に
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  モダンで洗練されたミニマルデザイン。無駄を削ぎ落とし、学習に集中できる環境を提供。直感的な操作と即座のフィードバックで、ストレスフリーな学習体験を実現します。
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">アプリ起動から0.5秒で学習開始できる設計</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">スワイプ操作による直感的な自信度入力</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">待ち時間ゼロを実現する事前生成システム</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">ランク・ランキングでモチベーション維持</span>
                  </li>
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative">
                  <ImageWithFallback 
                    src="/hero-ux-2025.png" 
                    alt="学習の抵抗感をゼロにするデザイン"
                    className="w-full h-[380px] object-cover object-[center_95%] rounded-2xl shadow-xl"
                    width={1080}
                    height={400}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent rounded-2xl" />
                  <Card className="absolute bottom-6 left-6 right-6 p-4 bg-white/85 backdrop-blur-sm border-0 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600">継続日数</span>
                          <span className="text-lg text-gray-900">42日</span>
                        </div>
                        <div className="flex gap-1">
                          {[...Array(7)].map((_, i) => (
                            <div key={i} className={`w-6 h-6 rounded ${i < 6 ? 'bg-[#27282e]/85' : 'bg-gray-400/85'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* UX Design Features */}
      <section id="features" className="py-16 sm:py-24">
        <div className="mx-auto w-[90vw] max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl tracking-tight mb-4">
              UX設計の核心
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              学習体験のすべてを、徹底的に考え抜きました
            </p>
          </motion.div>

          <div className="space-y-24">
            {/* Feature 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              <div className="order-2 lg:order-1">
                <Badge variant="secondary" className="mb-4 bg-gray-100">
                  <Zap className="w-3 h-3 mr-1" />
                  即座に学習開始
                </Badge>
                <h3 className="text-2xl sm:text-3xl tracking-tight mb-4">
                  学習を邪魔するノイズをゼロに
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  アプリを開いた瞬間から学習が始まる。メニューを経由せず、即座に問題が表示されるデフォルト設計。スマホでは縦積み、PCでは左右分割レイアウトで、デバイスに最適化された体験を提供します。
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">下線部の英単語の意味を問う4択問題</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">モノトーン基調に、アクセントカラーを効果的に使用</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">プログレスバーで進捗を可視化</span>
                  </li>
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <Card className="p-8 border-0 shadow-xl bg-gradient-to-br from-gray-50 to-white">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-sm text-gray-500">問題 1 / 5</span>
                      <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="w-1/5 h-full bg-[#c2255d]" />
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <p className="text-gray-700 mb-6">
                        The scientist&rsquo;s research was <span className="border-b-2 border-[#c2255d]">comprehensive</span> and well-documented.
                      </p>
                      <div className="space-y-3">
                        {['包括的な', '競争的な', '複雑な', '比較的な'].map((option, i) => (
                          <button
                            key={i}
                            className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </motion.div>

            {/* Feature 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              <div>
                <Card className="p-8 border-0 shadow-xl bg-gradient-to-br from-gray-50 to-white">
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="space-y-3">
                        <button className="w-full text-left p-4 rounded-lg bg-green-50 border border-green-200">
                          <span className="text-gray-700">包括的な</span>
                          <CheckCircle2 className="w-4 h-4 text-green-600 float-right mt-1" />
                        </button>
                        <button className="w-full text-left p-4 rounded-lg border border-gray-200 opacity-50">
                          競争的な
                        </button>
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-6 border border-gray-200">
                      <div className="flex items-start gap-3 mb-1">
                        <Sparkles className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm mb-2">
                            <span className="text-gray-900">正解について</span>
                          </p>
                          <p className="text-sm text-gray-600">
                          「comprehensive」は「包括的な」という意味です。語源はラテン語の com-（共に）と prehendere（つかむ）で、「すべてを一緒につかむ」、つまり「全体を漏れなく理解する」イメージです。
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
              <div>
                <Badge variant="secondary" className="mb-4 bg-gray-100">
                  <Sparkles className="w-3 h-3 mr-1" />
                  洗練されたフィードバック
                </Badge>
                <h3 className="text-2xl sm:text-3xl tracking-tight mb-4">
                  色で示す、静かな正誤判定
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  回答後、選択肢の背景色が緑（正解）または赤（不正解）に変化。派手なアニメーションは一切使わず、洗練された静かなフィードバックで学習のテンポを維持します。
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">問題とフィードバックの分割表示</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">AIによる語源、類義語、記憶術の解説</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">スワイプで自信度を入力</span>
                  </li>
                </ul>
              </div>
            </motion.div>

            {/* Feature 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              <div className="order-2 lg:order-1">
                <Badge variant="secondary" className="mb-4 bg-gray-100">
                  <Target className="w-3 h-3 mr-1" />
                  テーマ別学習
                </Badge>
                <h3 className="text-2xl sm:text-3xl tracking-tight mb-4">
                  関連単語で深い学びを
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  1セッション5問は、類義語、語源、カテゴリなど、関連性の高い単語でグループ化。セッション終了後、AIがテーマ全体を踏まえた総合フィードバックを生成し、学習の文脈を明確にします。
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">忘却曲線に基づく復習を最優先しつつテーマ性を付与</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">バックグラウンド処理による事前生成で、待ち時間ゼロ</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">ユーザーが能動的にテーマをリクエスト可能（1日3回まで）</span>
                  </li>
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative">
                  <ImageWithFallback 
                    src="https://images.unsplash.com/photo-1719550371336-7bb64b5cacfa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmFpbiUyMG5ldXJhbCUyMG5ldHdvcmt8ZW58MXx8fHwxNzYyNzcxNTY0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral" 
                    alt="AI Neural Network"
                    className="w-full h-[340px] object-cover rounded-2xl shadow-xl"
                    width={1080}
                    height={400}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 to-transparent rounded-2xl" />
                  <div className="absolute bottom-6 left-6 right-6">
                    <Badge className="bg-white/90 text-gray-900">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AIが関連単語を自動グループ
                    </Badge>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Feature 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid lg:grid-cols-2 gap-12 items-center"
            >
              <div>
                <Card className="rounded-[32px] border-0 bg-gradient-to-br from-gray-50 to-white p-8 shadow-xl">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="text-[3.1rem] font-black tracking-tight text-gray-900">S+</div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">あなたのランク</p>
                        <p className="text-base font-semibold text-gray-900">英検準1級レベル</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
                      {rankingRows.map((row) => (
                        <div
                          key={row.rank}
                          className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                            row.highlight
                              ? 'border-[#ffe0e6] bg-[#fff7f8] text-gray-900'
                              : 'border-gray-100 bg-white text-gray-900'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-semibold ${
                                row.highlight
                                  ? 'border-[#c2255d] text-[#c2255d]'
                                  : 'border-gray-200 text-gray-600'
                              }`}
                            >
                              {row.rank}
                            </div>
                            <span className="text-sm font-medium text-gray-900">{row.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{row.score}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-xs font-semibold tracking-[0.3em] text-gray-500 text-right">
                      上位 5% • 週間ランキング
                    </div>
                  </div>
                </Card>
              </div>
              <div>
                <Badge variant="secondary" className="mb-4 bg-gray-100">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  モチベーション維持
                </Badge>
                <h3 className="text-2xl sm:text-3xl tracking-tight mb-4">
                  健全な競争と成長実感
                </h3>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  ランク（S+, S, A...）とランキング（全国/学校/グループ、週間/総合）で、ユーザーの学習意欲を刺激。ランキングはオプトイン方式で、プレッシャーを感じたくないユーザーは不参加を選択できます。
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">絶対評価のランクシステムで、次の目標を明確化</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">「上位〇%」表示で、全てのユーザーにモチベーションを</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#c2255d] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">週間ランキングで、学習量を競う新たな軸を提供</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-gray-900 to-gray-800 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#c2255d] rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-20 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl tracking-tight mb-6">
              今すぐRetentoで<br className="sm:hidden" />学習を始めよう
            </h2>
            <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              最高の英単語学習体験を無料でお試しいただけます
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="bg-[#c2255d] hover:bg-[#a01d4d] text-white group"
                onClick={goToApp}
              >
                アプリに移動
                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                詳しく見る
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <SiteFooter
        productLinks={productLinks}
        supportLinks={supportLinks}
        legalLinks={legalLinks}
      />
    </div>
    {/* Custom scrollbar overlay */}
    <div
      className="fixed z-30 flex items-start justify-center"
      style={{ top: "calc(4rem + 3px)", right: "3px", bottom: "3px" }}
    >
    {thumbVisible && (
      <div
        ref={thumbRef}
        className={`w-1.5 cursor-default rounded-full bg-gray-400/70 backdrop-blur-2xl shadow-[0_0_12px_rgba(0,0,0,0.15)] transition-opacity duration-150 ${isDragging ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
        style={{ transform: 'translate3d(0, 0, 0)', height: '0px' }}
        onPointerDown={(event) => {
          event.preventDefault();
          setIsDragging(true);
          dragStartYRef.current = event.clientY;
          scrollStartRef.current = scrollContainerRef.current?.scrollTop ?? 0;
          pointerIdRef.current = event.pointerId;
          pointerTargetRef.current = event.target as HTMLElement;
          pointerTargetRef.current?.setPointerCapture(event.pointerId);
        }}
      />
    )}
    </div>
  </div>
);
}
