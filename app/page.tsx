// app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

/* Dynamic icons (keeps your original pattern) */
const loadFaUser = () => import('react-icons/fa').then((m) => (props: any) => React.createElement(m.FaUser, props));
const loadFaStore = () => import('react-icons/fa').then((m) => (props: any) => React.createElement(m.FaStore, props));
const loadFaTools = () => import('react-icons/fa').then((m) => (props: any) => React.createElement(m.FaTools, props));
const loadFaBriefcase = () => import('react-icons/fa').then((m) => (props: any) => React.createElement(m.FaBriefcase, props));
const loadFaInfo = () => import('react-icons/fa').then((m) => (props: any) => React.createElement(m.FaInfoCircle, props));

const FaUser = dynamic(loadFaUser, { ssr: false }) as React.ComponentType<any>;
const FaStore = dynamic(loadFaStore, { ssr: false }) as React.ComponentType<any>;
const FaTools = dynamic(loadFaTools, { ssr: false }) as React.ComponentType<any>;
const FaBriefcase = dynamic(loadFaBriefcase, { ssr: false }) as React.ComponentType<any>;
const FaInfo = dynamic(loadFaInfo, { ssr: false }) as React.ComponentType<any>;

/**
 * صفحة رئيسية جديدة — تصميم جذاب، حديث، ثلاثي الأبعاد، موجه للهواتف.
 * - لا يوجد مربع عرض إعلانات
 * - لا يوجد حقل بحث
 * - واجهة مركزة على نشر إعلان وإنشاء صفحة
 * - زر معلومات صغير لعرض إشعار المنصة (اختياري، غير مزعج)
 *
 * انسخ هذا الملف واستبدله بملف app/page.tsx في مشروعك.
 */

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const pushToast = (text: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((s) => [...s, { id, text }]);
    setTimeout(() => setToasts((s) => s.filter((t) => t.id !== id)), 3500);
  };

  return (
    <main className="hp-root" aria-label="الصفحة الرئيسية">
      <style>{`
        :root{
          --bg-1: #071026;
          --bg-2: #071a2a;
          --accent-a: #06b6d4;
          --accent-b: #7c3aed;
          --glass: rgba(255,255,255,0.04);
          --muted: #9aa6b2;
          --text: #e6eef8;
        }

        *{ box-sizing:border-box; }
        html,body,#__next{ height:100%; margin:0; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }

        .hp-root{
          min-height:100vh;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:20px;
          background:
            radial-gradient(600px 300px at 10% 10%, rgba(124,58,237,0.06), transparent 8%),
            radial-gradient(600px 300px at 90% 90%, rgba(6,182,212,0.05), transparent 10%),
            linear-gradient(180deg, var(--bg-1), var(--bg-2));
          color:var(--text);
          perspective:1400px;
        }

        /* Container: mobile-first single column, centered */
        .container {
          width:100%;
          max-width:760px;
          display:flex;
          flex-direction:column;
          gap:18px;
          align-items:center;
          padding:18px;
        }

        /* Main 3D hero card */
        .hero-card {
          width:100%;
          border-radius:20px;
          padding:18px;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.04);
          box-shadow: 0 30px 80px rgba(2,6,23,0.6);
          transform-style: preserve-3d;
          overflow:hidden;
          position:relative;
          transition: transform 420ms cubic-bezier(.2,.9,.2,1), box-shadow 420ms;
        }

        /* layered cards for 3D depth */
        .card-layer {
          border-radius:16px;
          padding:16px;
          background: linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.01));
          border: 1px solid rgba(255,255,255,0.02);
          box-shadow: 0 12px 40px rgba(2,6,23,0.45);
          transform-origin: center;
        }

        .layer-top { transform: translateZ(60px) rotateX(1deg); }
        .layer-mid { margin-top:-12px; transform: translateZ(30px) rotateX(.6deg); }
        .layer-base { margin-top:-12px; transform: translateZ(8px) rotateX(.2deg); }

        /* Header row */
        .header-row { display:flex; align-items:center; justify-content:space-between; gap:12px; }
        .brand { display:flex; gap:12px; align-items:center; min-width:0; }
        .logo {
          width:64px; height:64px; border-radius:14px;
          display:flex; align-items:center; justify-content:center;
          background: linear-gradient(90deg,#fff2cc,#ffd6a5);
          color:#071026; font-weight:900; flex-shrink:0;
          box-shadow: 0 12px 36px rgba(124,58,237,0.08);
        }
        .brand-title { font-weight:900; font-size:18px; color:var(--text); margin:0; }
        .brand-sub { color:var(--muted); font-size:13px; margin-top:6px; }

        /* Big headline */
        .headline {
          margin-top:12px;
          font-size:22px;
          font-weight:900;
          line-height:1.02;
          color:var(--text);
        }
        .subline { margin-top:8px; color:var(--muted); font-size:14px; max-width:60ch; }

        /* Primary actions (big circular CTA + small actions) */
        .actions {
          margin-top:16px;
          display:flex;
          gap:12px;
          align-items:center;
          width:100%;
        }

        .cta-circle {
          width:84px;
          height:84px;
          border-radius:999px;
          display:flex;
          align-items:center;
          justify-content:center;
          background: linear-gradient(180deg,var(--accent-a),var(--accent-b));
          color:#001219;
          font-weight:900;
          font-size:14px;
          box-shadow: 0 18px 50px rgba(59,130,246,0.14);
          cursor:pointer;
          border:none;
        }

        .small-actions {
          display:flex;
          gap:10px;
          align-items:center;
          flex:1;
          justify-content:space-around;
        }

        .small-btn {
          display:flex;
          gap:8px;
          align-items:center;
          padding:10px 12px;
          border-radius:12px;
          background: rgba(255,255,255,0.02);
          border:1px solid rgba(255,255,255,0.03);
          color:var(--text);
          font-weight:800;
          cursor:pointer;
          min-width:0;
          justify-content:center;
        }

        /* Action tiles (compact, circular icons) */
        .tiles {
          margin-top:14px;
          display:flex;
          gap:12px;
          width:100%;
          justify-content:space-between;
        }

        .tile {
          flex:1;
          display:flex;
          flex-direction:column;
          align-items:center;
          gap:8px;
          padding:12px;
          border-radius:14px;
          background: linear-gradient(180deg, rgba(255,255,255,0.015), rgba(255,255,255,0.01));
          border:1px solid rgba(255,255,255,0.02);
          cursor:pointer;
          transition: transform 260ms cubic-bezier(.2,.9,.2,1);
        }
        .tile:hover { transform: translateY(-8px); box-shadow: 0 18px 40px rgba(2,6,23,0.35); }

        .tile .icon {
          width:56px; height:56px; border-radius:12px; display:flex; align-items:center; justify-content:center;
          background: linear-gradient(90deg,#fff,#fff); color:#071026; font-weight:900;
          box-shadow: 0 8px 20px rgba(2,6,23,0.08);
        }
        .tile .label { font-weight:800; color:var(--text); font-size:13px; text-align:center; }

        /* Tiny info button (shows platform notice modal) */
        .info-btn {
          width:40px; height:40px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center;
          background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.03); cursor:pointer;
        }

        /* Modal / sheet for platform notice (centered small modal) */
        .modal-backdrop {
          position:fixed; inset:0; background: rgba(2,6,23,0.5); display:flex; align-items:center; justify-content:center; z-index:80;
        }
        .modal {
          width:calc(100% - 40px); max-width:520px; border-radius:14px; padding:16px;
          background: linear-gradient(180deg,#ffffff,#fbfbfb); color:#071026; box-shadow: 0 30px 80px rgba(2,6,23,0.6);
          border:1px solid rgba(2,6,23,0.06);
        }
        .modal h3 { margin:0; font-size:16px; font-weight:900; }
        .modal p { margin-top:8px; color:#6b7280; font-size:14px; }

        /* Toasts */
        .toasts {
          position:fixed; left:50%; transform:translateX(-50%); bottom:20px; display:flex; flex-direction:column; gap:8px; z-index:90; width:calc(100% - 40px); max-width:720px; pointer-events:none;
        }
        .toast {
          pointer-events:auto; background: rgba(2,6,23,0.9); color:#fff; padding:10px 14px; border-radius:10px; box-shadow: 0 10px 30px rgba(2,6,23,0.6); font-weight:700; text-align:center;
        }

        /* Responsive tweaks */
        @media (max-width: 720px) {
          .container { padding:12px; }
          .logo { width:56px; height:56px; }
          .headline { font-size:20px; }
          .cta-circle { width:72px; height:72px; }
          .tile .icon { width:48px; height:48px; }
        }
      `}</style>

      <div className="container" role="main">
        <div className="hero-card" aria-labelledby="hp-headline">
          {/* layered 3D effect */}
          <div className="card-layer layer-top" aria-hidden>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="brand">
                <div className="logo" aria-hidden>SP</div>
                <div style={{ minWidth: 0 }}>
                  <div className="brand-title">منصة تجار للإعلانات</div>
                  <div className="brand-sub">واجهة سريعة ومصممة للهواتف</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="info-btn"
                  aria-label="معلومات المنصة"
                  onClick={() => setShowInfo(true)}
                  title="معلومات المنصة"
                >
                  <FaInfo style={{ width: 18, height: 18, color: '#e6eef8' }} />
                </button>
              </div>
            </div>
          </div>

          <div className="card-layer layer-mid" aria-hidden>
            <h2 id="hp-headline" className="headline">أنشئ إعلانك الآن — سريع، واضح، وفعّال</h2>
            <div className="subline">نظام مُبسّط يركّز على النتيجة: إنشاء صفحة إعلان، إدارة العروض، والتواصل مع المهتمين بسهولة من هاتفك.</div>

            <div className="actions">
              <button
                className="cta-circle"
                aria-label="إنشاء إعلان سريع"
                onClick={() => {
                  pushToast('بدء إنشاء إعلان جديد');
                  // navigate to create page
                  window.location.href = '/create-page';
                }}
              >
                أنشر
              </button>

              <div className="small-actions" role="group" aria-label="إجراءات سريعة">
                <Link href="/create-page" className="small-btn" aria-label="إنشاء صفحة">
                  إنشاء صفحة
                </Link>

                <button
                  className="small-btn"
                  onClick={() => {
                    pushToast('تم نسخ رابط المنصة');
                    navigator.clipboard?.writeText(window.location.origin).catch(() => {});
                  }}
                >
                  مشاركة
                </button>

                <Link href="/work" className="small-btn" aria-label="العمل">
                  العمل
                </Link>
              </div>
            </div>
          </div>

          <div className="card-layer layer-base" aria-hidden>
            <div className="tiles" role="list" aria-label="روابط سريعة">
              <Link href="/search" className="tile" role="listitem" aria-label="زائر">
                <div className="icon"><FaUser /></div>
                <div className="label">زائر</div>
              </Link>

              <Link href="/merchant" className="tile" role="listitem" aria-label="انشر اعلاناتك">
                <div className="icon"><FaStore /></div>
                <div className="label">انشر اعلاناتك</div>
              </Link>

              <Link href="/auth/login" className="tile" role="listitem" aria-label="عضو منتج">
                <div className="icon"><FaTools /></div>
                <div className="label">عضو منتِج</div>
              </Link>

              <Link href="/work" className="tile" role="listitem" aria-label="العمل">
                <div className="icon"><FaBriefcase /></div>
                <div className="label">العمل</div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Info modal (platform notice) */}
      {showInfo && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setShowInfo(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>إشعار المنصة</h3>
            <p>مرحبًا — هذه مساحة لإشعارات المنصة المهمة. يمكنك عرض التنبيهات هنا أو إضافتها عبر لوحة الإدارة.</p>

            <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  pushToast('تم حفظ الإشعار محليًا');
                  setShowInfo(false);
                }}
                style={{ padding: '8px 12px', borderRadius: 10, background: 'linear-gradient(90deg,#06b6d4,#7c3aed)', border: 'none', color: '#001219', fontWeight: 800, cursor: 'pointer' }}
              >
                تم
              </button>

              <button
                onClick={() => setShowInfo(false)}
                style={{ padding: '8px 12px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(2,6,23,0.06)', color: '#071026', fontWeight: 800, cursor: 'pointer' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toasts" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className="toast">{t.text}</div>
        ))}
      </div>
    </main>
  );
}