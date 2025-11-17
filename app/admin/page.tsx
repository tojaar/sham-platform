'use client';

import React from 'react';
import Link from 'next/link';

export default function adminForm() {
  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,#000000_0%,#071018_25%,_#03040a_60%)] text-white antialiased flex items-center justify-center p-6">
      <div className="relative w-full max-w-5xl">
        {/* تأثيرات خلفية ضوئية وضباب */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -left-40 -top-40 w-[560px] h-[560px] rounded-full bg-gradient-to-br from-[#00101a] via-[#002634] to-transparent opacity-40 blur-3xl transform rotate-45" />
          <div className="absolute -right-40 -bottom-40 w-[640px] h-[640px] rounded-full bg-gradient-to-tr from-[#170009] via-[#3a0016] to-transparent opacity-30 blur-3xl transform -rotate-12" />
          <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="g1" x1="0" x2="1">
                <stop stopColor="#00E5FF" offset="0" stopOpacity="0.06" />
                <stop stopColor="#7C3AED" offset="1" stopOpacity="0.03" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#g1)" />
          </svg>
        </div>

        <div className="relative z-10 bg-gradient-to-b from-[#061018] via-[#07121a] to-[#041018] border border-white/6 rounded-2xl shadow-2xl p-8">
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">لوحة الادارة</h1>
              <p className="mt-2 text-sm text-white/70 max-w-xl">اختَر لوحة الإدارة التي تريد الدخول إليها. سهولة، سرعة، وتحكم كامل.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-black/40 border border-white/6 flex items-center justify-center text-cyan-300 font-bold text-lg shadow-inner">ADM</div>
              <div className="text-right">
                <div className="text-xs text-white/60">مرحباً، مسؤول</div>
                <div className="text-sm text-white/80">وصول سريع إلى صفحات الإدارة</div>
              </div>
            </div>
          </header>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <AdminButton href="/admin/producer" title="Producer" subtitle="إدارة أعضاء المنتج" accentStart="#06b6d4" accentEnd="#7c3aed" icon="🛠️" />
            <AdminButton href="/admin/hire" title="Hire" subtitle="إدارة منشورات التوظيف" accentStart="#06b6d4" accentEnd="#ef4444" icon="🧑‍💼" />
            <AdminButton href="/admin/seeker" title="Seeker" subtitle="إدارة الباحثين عن عمل" accentStart="#06b6d4" accentEnd="#10b981" icon="🔍" />
            <AdminButton href="/admin/post" title="Post" subtitle="إدارة الإعلانات التجارية" accentStart="#06b6d4" accentEnd="#f97316" icon="📣" />
          </section>

          <footer className="mt-8 flex items-center justify-between text-xs text-white/60">
            <div>نظام الإدارة — وصول آمن للمشرفين فقط</div>
            <div className="flex items-center gap-3">
              <span className="text-white/50">نسخة</span>
              <span className="font-mono text-white/70 text-sm">v1.0</span>
            </div>
          </footer>
        </div>

        {/* تأثيرات إضافية مرئية */}
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="absolute -left-20 top-1/2 w-[420px] h-[420px] bg-gradient-to-r from-[#0ff] to-transparent opacity-6 blur-2xl transform -translate-y-1/2 rotate-12" />
        </div>
      </div>
    </main>
  );
}

function AdminButton({
  href,
  title,
  subtitle,
  accentStart,
  accentEnd,
  icon,
}: {
  href: string;
  title: string;
  subtitle: string;
  accentStart: string;
  accentEnd: string;
  icon: string;
}) {
  const gradient = `linear-gradient(90deg, ${accentStart}, ${accentEnd});`

  return (
    <Link href={href} className="group">
      <div
        role="button"
        aria-label={`فتح ${title} admin`}
        className="relative rounded-xl overflow-hidden border border-white/6 p-5 h-36 flex flex-col justify-between transition-transform transform hover:-translate-y-1 hover:scale-[1.01] bg-black/20"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-lg text-white"
              style={{ background: 'linear-gradient(135deg,#07262b 0%, #071b2a 100%)' }}
            >
              <span>{icon}</span>
            </div>

            <div>
              <div className="text-sm text-white/60">لوحة</div>
              <div className="text-lg font-bold">{title}</div>
              <div className="text-xs text-white/60 mt-1">{subtitle}</div>
            </div>
          </div>

          <div className="text-xs text-white/60 hidden md:block">دخول الإدارة</div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-white/60">الوصول السريع</div>
          <div
            className="px-3 py-1 rounded-md text-sm font-semibold text-white"
            style={{ background: gradient }}
          >
            افتح
          </div>
        </div>
      </div>
    </Link>
  );
}