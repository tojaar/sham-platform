'use client';

import { useCallback } from 'react';
import Link from 'next/link';

export default function VisitorPage() {
  const handleChoice = useCallback((path: string) => {
    // تنقّل برمجياً — عدّل المسارات حسب تطبيقك
    window.location.href = path;
  }, []);

  return (
    <main className="min-h-screen relative bg-cover bg-center bg-fixed text-white antialiased">
      {/* الخلفية الصورة الغامقة */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[url('/images/visitor-bg.jpg')] bg-cover bg-center filter brightness-50"
      />

      {/* تراكب داكن لنقاء النص */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/45 to-black/60" />

      {/* زر رجوع أعلى يسار */}
      <div className="relative z-10">
        <header className="max-w-6xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => history.back()}
            aria-label="رجوع"
            className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 active:scale-95 transition-transform rounded-lg px-3 py-2 text-sm backdrop-blur-sm border border-white/10"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M12 15L7 10l5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            رجوع للخلف
          </button>
        </header>
      </div>

      {/* المحتوى المركزي */}
      <section className="relative z-10 flex flex-col items-center justify-center text-center px-6 pb-12 pt-8 min-h-[calc(100vh-4rem)]">
        <div className="max-w-3xl">
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight text-white drop-shadow-lg">
            مرحبا بك في منصة التجارة العالمية
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/80 max-w-2xl mx-auto">
            اكتشف فرص العمل، أو اعثر على موظف/عامل مناسب، أو تصفّح أحدث الإعلانات التجارية. اختَر ما تريد للبدء بسرعة وأمان.
          </p>

          {/* بطاقات الخيارات */}
          <div className="mt-8 grid gap-5 sm:gap-8 grid-cols-1 sm:grid-cols-3">
            {/* زر 1 */}
            <button
              onClick={() => handleChoice('/search/seeker')}
              className="relative group bg-gradient-to-b from-cyan-500/80 to-blue-700/80 hover:from-cyan-500/95 hover:to-blue-700/95 focus:outline-none focus:ring-4 focus:ring-cyan-400/40 rounded-xl p-6 shadow-xl transform transition hover:-translate-y-1"
              aria-label="البحث عن عمل"
            >
              <div className="flex flex-col items-start">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-white/12 mb-3">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 7h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 7v10a1 1 0 001 1h6a1 1 0 001-1V7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 3h6v4H9z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">البحث عن عمل</h3>
                <p className="mt-2 text-sm text-white/85">اعثر على وظائف مناسبة لقدراتك وموقعك.</p>
              </div>
              <span className="absolute -bottom-3 right-4 text-xs text-white/60 group-hover:text-white transition">ابدأ الآن →</span>
            </button>

            {/* زر 2 */}
            <button
              onClick={() => handleChoice('/search/hire')}
              className="relative group bg-gradient-to-b from-rose-500/80 to-pink-700/80 hover:from-rose-500/95 hover:to-pink-700/95 focus:outline-none focus:ring-4 focus:ring-rose-400/30 rounded-xl p-6 shadow-xl transform transition hover:-translate-y-1"
              aria-label="البحث عن موظف أو عامل"
            >
              <div className="flex flex-col items-start">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-white/12 mb-3">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M3 20v-2a4 4 0 014-4h10a4 4 0 014 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">البحث عن موظف أو عامل</h3>
                <p className="mt-2 text-sm text-white/85">انشر متطلباتك واطّلع على السير الذاتية مباشرة.</p>
              </div>
              <span className="absolute -bottom-3 right-4 text-xs text-white/60 group-hover:text-white transition">انشر طلبك →</span>
            </button>

            {/* زر 3 */}
            <button
              onClick={() => handleChoice('/search/comm')}
              className="relative group bg-gradient-to-b from-amber-500/80 to-yellow-700/80 hover:from-amber-500/95 hover:to-yellow-700/95 focus:outline-none focus:ring-4 focus:ring-amber-400/30 rounded-xl p-6 shadow-xl transform transition hover:-translate-y-1"
              aria-label="الإعلانات التجارية"
            >
              <div className="flex flex-col items-start">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-white/12 mb-3">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M3 7h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="3" y="7" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.6"/>
                    <path d="M7 10h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold">الإعلانات التجارية</h3>
                <p className="mt-2 text-sm text-white/85">تصفح عروض الشركات والخدمات والمنتجات المميزة.</p>
              </div>
              <span className="absolute -bottom-3 right-4 text-xs text-white/60 group-hover:text-white transition">تصفح الإعلانات →</span>
            </button>
          </div>

          {/* ميزات إضافية اختيارية */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <a
              href="/about"
              className="text-sm text-white/80 underline hover:text-white transition"
            >
              من نحن
            </a>
            <div className="h-px w-6 bg-white/10 hidden sm:block" />
            <a
              href="/contact"
              className="text-sm text-white/80 underline hover:text-white transition"
            >
              تواصل معنا
            </a>
          </div>
        </div>
      </section>

      {/* زر ثابت بأسفل الصفحة للانتقال السريع للأعلى مع لمسة جمالية */}
      <div className="relative z-10 pointer-events-none">
        <div className="fixed left-4 bottom-6 sm:bottom-8 pointer-events-auto">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="الانتقال للأعلى"
            className="inline-flex items-center gap-2 bg-white/8 hover:bg-white/16 text-white px-3 py-2 rounded-full shadow-lg transition focus:outline-none focus:ring-4 focus:ring-cyan-300/20"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" aria-hidden>
              <path d="M4 12l6-6 6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            أعلى
          </button>
        </div>
      </div>

      {/* Footer بسيط متوافق مع الهواتف */}
      <footer className="relative z-10 mt-auto py-6">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/60">
          <div>© {new Date().getFullYear()} منصة التجارة العالمية</div>
          <div>النسخة التجريبية — تصميم متجاوب</div>
        </div>
      </footer>

      {/* تحسينات الوصول: تخطي للرئيسية */}
      <a href="#main" className="sr-only focus:not-sr-only">تخطي إلى المحتوى</a>
    </main>
  );
}