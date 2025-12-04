// app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';

/* Dynamic icons (keeps your original pattern) */
const loadFaUser = () => import('react-icons/fa').then((m) => (props: any) => React.createElement(m.FaUser, props));
const loadFaStore = () => import('react-icons/fa').then((m) => (props: any) => React.createElement(m.FaStore, props));
const loadFaTools = () => import('react-icons/fa').then((m) => (props: any) => React.createElement(m.FaTools, props));
const loadFaBriefcase = () => import('react-icons/fa').then((m) => (props: any) => React.createElement(m.FaBriefcase, props));

const FaUser = dynamic(loadFaUser, { ssr: false }) as React.ComponentType<any>;
const FaStore = dynamic(loadFaStore, { ssr: false }) as React.ComponentType<any>;
const FaTools = dynamic(loadFaTools, { ssr: false }) as React.ComponentType<any>;
const FaBriefcase = dynamic(loadFaBriefcase, { ssr: false }) as React.ComponentType<any>;

export default function HomePage() {
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      setTimeout(() => setToasts((s) => s.filter((x) => x.id !== t.id)), 3200)
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts]);

  const pushToast = (text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((s) => [...s, { id, text }]);
  };

  return (
    <main className="hp-root" aria-label="الصفحة الرئيسية">
      <style>{`
        :root{
          --bg-1: #071026;
          --bg-2: #071a2a;
          --muted: #9aa6b2;
          --card-bg: rgba(255,255,255,0.03);
          --glass-border: rgba(255,255,255,0.06);
          --text-light: #ffffff;
          --text-dark: #071026;
          --radius: 14px;
        }

        *{ box-sizing:border-box; }
        html,body,#__next{ height:100%; margin:0; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }

        .hp-root{
          min-height:100vh;
          padding:18px;
          display:flex;
          align-items:flex-start;
          justify-content:center;
          background:
            radial-gradient(600px 300px at 10% 10%, rgba(124,58,237,0.06), transparent 8%),
            radial-gradient(600px 300px at 90% 90%, rgba(6,182,212,0.05), transparent 10%),
            linear-gradient(180deg, var(--bg-1), var(--bg-2));
          color:var(--text-light);
        }

        .wrap {
          width:100%;
          max-width:720px;
          display:flex;
          flex-direction:column;
          gap:14px;
        }

        /* Header with small platform badge */
        .header {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
        }

        .brand {
          display:flex;
          gap:12px;
          align-items:center;
          min-width:0;
        }

        .badge {
          width:48px;
          height:48px;
          border-radius:12px;
          overflow:hidden;
          flex-shrink:0;
          display:inline-block;
          box-shadow: 0 12px 36px rgba(2,6,23,0.12);
          background: linear-gradient(90deg,#fff,#fff);
        }

        .brand-title {
          font-weight:900;
          font-size:18px;
          margin:0;
          color:var(--text-light);
        }
        .brand-sub {
          color:var(--muted);
          font-size:13px;
          margin-top:6px;
        }

        /* Main card */
        .card {
          border-radius:18px;
          padding:16px;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border: 1px solid var(--glass-border);
          box-shadow: 0 30px 90px rgba(2,6,23,0.6);
        }

        .intro {
          display:flex;
          flex-direction:column;
          gap:8px;
        }

        .title {
          font-size:20px;
          font-weight:900;
          margin:0;
          color:var(--text-light);
        }
        .subtitle {
          color:var(--muted);
          font-size:14px;
          margin:0;
        }

        /* Buttons area — vertical stack for mobile */
        .buttons {
          margin-top:16px;
          display:grid;
          grid-template-columns: 1fr;
          gap:12px;
        }

        /* Elegant button style */
        .nav-btn {
          display:flex;
          gap:14px;
          align-items:center;
          padding:16px;
          border-radius: var(--radius);
          color: var(--text-light);
          font-weight:800;
          text-decoration:none;
          border:none;
          cursor:pointer;
          transition: transform 180ms cubic-bezier(.2,.9,.2,1), box-shadow 180ms ease;
          min-height:72px;
          box-shadow: 0 12px 36px rgba(2,6,23,0.18);
        }
        .nav-btn:active { transform: translateY(1px) scale(.998); }
        .nav-btn:hover { transform: translateY(-6px); box-shadow: 0 28px 80px rgba(2,6,23,0.28); }

        .nav-icon {
          width:64px;
          height:64px;
          border-radius:12px;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:22px;
          flex-shrink:0;
          background: rgba(255,255,255,0.12);
          box-shadow: inset 0 -6px 18px rgba(0,0,0,0.06);
        }

        .nav-text {
          display:flex;
          flex-direction:column;
          align-items:flex-start;
          gap:6px;
        }
        .nav-title { font-size:18px; color:var(--text-light); letter-spacing: -0.01em; }
        .nav-sub { font-size:13px; color: rgba(255,255,255,0.85); font-weight:700; }

        /* Color variants with stronger contrast and white text */
        .visitor {
          background: linear-gradient(90deg,#2563eb,#60a5fa); /* blue */
        }
        .merchant {
          background: linear-gradient(90deg,#059669,#34d399); /* green */
        }
        .member {
          background: linear-gradient(90deg,#d97706,#f59e0b); /* amber */
        }
        .work {
          background: linear-gradient(90deg,#dc2626,#fb7185); /* red/pink */
        }

        /* Icon color: white for contrast */
        .nav-icon > svg { width:28px; height:28px; color: #fff; }

        /* Footer small note */
        .footer {
          margin-top:12px;
          display:flex;
          justify-content:center;
          color:var(--muted);
          font-weight:700;
          font-size:13px;
        }

        /* Toasts */
        .toasts {
          position:fixed; left:50%; transform:translateX(-50%); bottom:20px; display:flex; flex-direction:column; gap:8px; z-index:90; width:calc(100% - 40px); max-width:720px; pointer-events:none;
        }
        .toast {
          pointer-events:auto; background: rgba(2,6,23,0.9); color:#fff; padding:10px 14px; border-radius:10px; box-shadow: 0 10px 30px rgba(2,6,23,0.6); font-weight:800; text-align:center;
        }

        /* Responsive tweaks */
        @media (max-width: 520px) {
          .badge { width:44px; height:44px; }
          .nav-icon { width:56px; height:56px; }
          .nav-btn { min-height:68px; padding:14px; border-radius:12px; }
          .nav-title { font-size:16px; }
          .nav-sub { font-size:12px; }
        }
      `}</style>

      <div className="wrap">
        <div className="header" role="banner">
          <div className="brand">
            <div className="badge" aria-hidden>
              {/* small platform image from public/assets/tojar.png */}
              <Image src="/assets/tojar.png" alt="شعار المنصة" width={48} height={48} style={{ objectFit: 'cover' }} />
            </div>

            <div>
              <div className="brand-title">منصة تجار للإعلانات</div>
              <div className="brand-sub">واجهة مُبسطة ومناسبة للهواتف</div>
            </div>
          </div>

          {/* removed bell as requested — nothing on the right */}
          <div style={{ width: 44 }} aria-hidden />
        </div>

        <section className="card" aria-labelledby="main-title">
          <div className="intro">
            <h1 id="main-title" className="title">ابدأ الآن</h1>
            <p className="subtitle">أزرار واضحة، نص مقروء، ومساحات لمس واسعة لتجربة مريحة على الهاتف.</p>
          </div>

          <div className="buttons" role="list" aria-label="روابط سريعة">
            <Link href="/search" className="nav-btn visitor" role="listitem" aria-label="زائر">
              <div className="nav-icon" aria-hidden><FaUser /></div>
              <div className="nav-text">
                <div className="nav-title">زائر</div>
                <div className="nav-sub">استعرض الإعلانات بدون تسجيل</div>
              </div>
            </Link>

            <Link href="/merchant" className="nav-btn merchant" role="listitem" aria-label="انشر اعلاناتك">
              <div className="nav-icon" aria-hidden><FaStore /></div>
              <div className="nav-text">
                <div className="nav-title">انشر إعلاناتك</div>
                <div className="nav-sub">لوحة نشر مبسطة للتجار</div>
              </div>
            </Link>

            <Link href="/auth/login" className="nav-btn member" role="listitem" aria-label="عضو منتج">
              <div className="nav-icon" aria-hidden><FaTools /></div>
              <div className="nav-text">
                <div className="nav-title">عضو منتِج</div>
                <div className="nav-sub">لوحة الأعضاء والمزايا</div>
              </div>
            </Link>

            <Link href="/work" className="nav-btn work" role="listitem" aria-label="العمل">
              <div className="nav-icon" aria-hidden><FaBriefcase /></div>
              <div className="nav-text">
                <div className="nav-title">العمل</div>
                <div className="nav-sub">فرص ومهام متاحة</div>
              </div>
            </Link>
          </div>

          <div className="footer">نسخة تجريبية · دعم الهاتف</div>
        </section>
      </div>

      {/* Toasts */}
      <div className="toasts" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.text}</div>
        ))}
      </div>
    </main>
  );
}