// app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';

/**
 * Dynamic icon loaders with explicit types to avoid any in the build.
 * Each loader returns a React component typed as an SVG component.
 */
const loadFaUser = () =>
  import('react-icons/fa').then((mod) => {
    const Icon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(mod.FaUser as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>, props);
    return Icon;
  });

const loadFaStore = () =>
  import('react-icons/fa').then((mod) => {
    const Icon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(mod.FaStore as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>, props);
    return Icon;
  });

const loadFaTools = () =>
  import('react-icons/fa').then((mod) => {
    const Icon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(mod.FaTools as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>, props);
    return Icon;
  });

const loadFaBriefcase = () =>
  import('react-icons/fa').then((mod) => {
    const Icon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(mod.FaBriefcase as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>, props);
    return Icon;
  });

const FaUser = dynamic(loadFaUser, { ssr: false }) as React.ComponentType<React.SVGProps<SVGSVGElement>>;
const FaStore = dynamic(loadFaStore, { ssr: false }) as React.ComponentType<React.SVGProps<SVGSVGElement>>;
const FaTools = dynamic(loadFaTools, { ssr: false }) as React.ComponentType<React.SVGProps<SVGSVGElement>>;
const FaBriefcase = dynamic(loadFaBriefcase, { ssr: false }) as React.ComponentType<React.SVGProps<SVGSVGElement>>;

type Toast = { id: number; text: string };

const HomePage: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers: number[] = toasts.map((t) =>
      window.setTimeout(() => {
        setToasts((s) => s.filter((x) => x.id !== t.id));
      }, 3200)
    );
    return () => timers.forEach((id) => clearTimeout(id));
  }, [toasts]);

  const pushToast = (text: string): void => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((s) => [...s, { id, text }]);
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 18,
        background: 'linear-gradient(180deg,#071026,#071a2a)',
        fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      }}
    >
      <style>{`
        .container { max-width:920px; margin:0 auto; display:flex; flex-direction:column; gap:14px; }
        .top { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .brand { display:flex; gap:12px; align-items:center; min-width:0; }
        .badge { width:52px; height:52px; border-radius:12px; overflow:hidden; box-shadow: 0 12px 36px rgba(2,6,23,0.12); background:#fff; flex-shrink:0; }
        .brand-title { font-weight:900; color:#fff; margin:0; font-size:18px; }
        .brand-sub { color:#9aa6b2; font-size:13px; margin-top:6px; }

        .card { border-radius:18px; padding:16px; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); border:1px solid rgba(255,255,255,0.06); box-shadow: 0 30px 90px rgba(2,6,23,0.6); }
        .title { font-size:20px; font-weight:900; color:#fff; margin:0; }
        .subtitle { color:#9aa6b2; margin-top:8px; font-size:14px; }

        .buttons { margin-top:16px; display:grid; grid-template-columns: 1fr; gap:12px; }
        .btn { display:flex; gap:14px; align-items:center; padding:16px; border-radius:14px; color:#fff; font-weight:900; text-decoration:none; min-height:72px; box-shadow: 0 12px 36px rgba(2,6,23,0.18); transition: transform 180ms ease, box-shadow 180ms ease; }
        .btn:hover { transform: translateY(-6px); box-shadow: 0 28px 80px rgba(2,6,23,0.28); }
        .icon { width:64px; height:64px; border-radius:12px; display:flex; align-items:center; justify-content:center; background: rgba(255,255,255,0.08); }
        .text { display:flex; flex-direction:column; align-items:flex-start; gap:6px; }
        .text .main { font-size:18px; }
        .text .sub { font-size:13px; opacity:0.95; font-weight:700; }

        .v { background: linear-gradient(90deg,#2563eb,#60a5fa); }
        .m { background: linear-gradient(90deg,#059669,#34d399); }
        .mem { background: linear-gradient(90deg,#d97706,#f59e0b); }
        .w { background: linear-gradient(90deg,#dc2626,#fb7185); }

        .footer { margin-top:12px; color:#9aa6b2; font-weight:700; text-align:center; }

        @media (max-width:520px) {
          .badge { width:48px; height:48px; }
          .icon { width:56px; height:56px; }
          .btn { min-height:68px; padding:14px; border-radius:12px; }
          .text .main { font-size:16px; }
          .text .sub { font-size:12px; }
        }

        /* Toasts */
        .toasts { position:fixed; left:50%; transform:translateX(-50%); bottom:20px; display:flex; flex-direction:column; gap:8px; z-index:120; width:calc(100% - 40px); max-width:720px; pointer-events:none; }
        .toast { pointer-events:auto; background: rgba(2,6,23,0.9); color:#fff; padding:10px 14px; border-radius:10px; box-shadow: 0 10px 30px rgba(2,6,23,0.6); font-weight:800; text-align:center; }
      `}</style>

      <div className="container">
        <div className="top" role="banner">
          <div className="brand">
            <div className="badge" aria-hidden>
              <Image src="/assets/tojar.png" alt="شعار المنصة" width={52} height={52} style={{ objectFit: 'cover' }} />
            </div>

            <div>
              <div className="brand-title">ENTER SPACE</div>
              <div className="brand-sub"> شركة انتر سبيس للتجارة العالمية  </div>
            </div>
          </div>

          {/* empty placeholder to keep header balanced */}
          <div style={{ width: 44 }} aria-hidden />
        </div>

        <section className="card" aria-labelledby="main-title">
          <h1 id="main-title" className="title">ابدأ الآن</h1>
          <p className="subtitle">اعلانات تجارية. وفرص عمل واسعة .تقنية متطورة وبحث متقدم  .</p>

          <div className="buttons" role="list" aria-label="روابط سريعة">
            <Link href="/search" className="btn v" role="listitem" aria-label="زائر">
              <div className="icon" aria-hidden>
                <FaUser width={28} height={28} />
              </div>
              <div className="text">
                <div className="main">زائر</div>
                <div className="sub">استعرض الإعلانات بدون تسجيل</div>
              </div>
            </Link>

            <Link href="/merchant" className="btn m" role="listitem" aria-label="انشر اعلاناتك">
              <div className="icon" aria-hidden>
                <FaStore width={28} height={28} />
              </div>
              <div className="text">
                <div className="main">انشر إعلاناتك التجارية</div>
                <div className="sub">لوحة نشر مبسطة للتجار</div>
              </div>
            </Link>

            <Link href="/auth/login" className="btn mem" role="listitem" aria-label="عضو منتج">
              <div className="icon" aria-hidden>
                <FaTools width={28} height={28} />
              </div>
              <div className="text">
                <div className="main">عضو منتِج</div>
                <div className="sub">لوحة الأعضاء والمزايا</div>
              </div>
            </Link>

            <Link href="/work" className="btn w" role="listitem" aria-label="العمل">
              <div className="icon" aria-hidden>
                <FaBriefcase width={28} height={28} />
              </div>
              <div className="text">
                <div className="main">انشر لطلب عمل او عمال</div>
                <div className="sub">فرص ومهام متاحة</div>
              </div>
            </Link>
          </div>

          <div className="footer">الشركة العالمية للتجارة واللأعمال· جميع الحقوق محفوظة</div>
        </section>
      </div>

      {/* Toasts */}
      <div className="toasts" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className="toast">
            {t.text}
          </div>
        ))}
      </div>
    </main>
  );
};

export default HomePage;