// app/auth/forgot/page.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function ForgotPage() {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="fp-root" role="main">
      <div className="fp-scene" aria-hidden="true">
        <div className="fp-sky" />
        <svg className="fp-tower" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" focusable="false" aria-hidden="true">
          <defs>
            <linearGradient id="gA" x1="0" x2="1">
              <stop offset="0" stopColor="#071026" />
              <stop offset="1" stopColor="#0f1724" />
            </linearGradient>
            <linearGradient id="gB" x1="0" x2="1">
              <stop offset="0" stopColor="#06b6d4" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>

          <rect width="100%" height="100%" fill="url(#gA)" />

          <g transform="translate(300,360) scale(0.95)" opacity="0.12">
            <rect x="-80" y="-260" width="160" height="520" rx="12" fill="#071026" />
            <rect x="-48" y="-240" width="96" height="480" rx="10" fill="#0b1220" />
            <g fill="#0f1724" opacity="0.95">
              <rect x="-32" y="-220" width="12" height="440" rx="2" />
              <rect x="-4" y="-220" width="12" height="440" rx="2" />
              <rect x="24" y="-220" width="12" height="440" rx="2" />
            </g>
            <polygon points="-36,-260 36,-260 56,-340 -56,-340" fill="#071026" />
            <path d="M-80,-260 L-80,260" stroke="url(#gB)" strokeWidth="2" opacity="0.06" />
            <path d="M80,-260 L80,260" stroke="#ff6b6b" strokeWidth="2" opacity="0.05" />
          </g>
        </svg>
      </div>

      <section className="fp-wrap" aria-labelledby="fp-heading">
        <article className="fp-card" role="article" aria-describedby="fp-desc">
          <div className="fp-left">
            <div className="fp-avatar-3d" aria-hidden="false">
              <div className="fp-avatar-inner">
                <Image
                  src="@/assets/tojat.png"
                  alt="شعار المنصة"
                  width={160}
                  height={160}
                  priority
                  style={{ objectFit: 'cover', borderRadius: 14 }}
                />
                <div className="fp-avatar-gloss" />
              </div>

              <div className="fp-avatar-shadow" aria-hidden="true" />
            </div>

            <div className="fp-badge" aria-hidden="true">
              <span className="fp-badge-left" />
              <span className="fp-badge-center">ES</span>
              <span className="fp-badge-right" />
            </div>
          </div>

          <div className="fp-right">
            <h1 id="fp-heading" ref={headingRef} tabIndex={-1} className="fp-title">
              لا يمكن تغيير كلمة المرور
            </h1>

            <p id="fp-desc" className="fp-text">
              نأسف لإبلاغك أنه لا يمكن تغيير كلمة المرور في هذه المرحلة لأي سبب كان. هذا الإجراء جزء من سياسة أمان المنصة لحماية الحسابات والمحتوى.
            </p>

            <p className="fp-advice">
              إن واجهت مشكلة في الوصول، تواصل مع فريق الدعم وسنقدّم المساعدة المناسبة بأسرع وقت.
            </p>

            <div className="fp-actions" role="group" aria-label="إجراءات">
              <button
                type="button"
                className="fp-btn fp-btn-ghost"
                onClick={() => router.back()}
                aria-label="العودة إلى الصفحة السابقة"
              >
                ← رجوع
              </button>

              <button
                type="button"
                className="fp-btn fp-btn-primary"
                onClick={() => router.push('/')}
                aria-label="الذهاب إلى الصفحة الرئيسية"
              >
                الصفحة الرئيسية
              </button>
            </div>
          </div>
        </article>
      </section>

      <style jsx>{`
        :root {
          --bg-1: #071026;
          --bg-2: #081426;
          --accent-1: #06b6d4;
          --accent-2: #7c3aed;
          --accent-3: #ff6b6b;
          --glass: rgba(255,255,255,0.03);
          --muted: rgba(230,238,248,0.78);
        }

        /* Page root */
        .fp-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(1200px 600px at 10% 10%, rgba(124,58,237,0.06), transparent 10%),
                      linear-gradient(180deg, var(--bg-1) 0%, var(--bg-2) 100%);
          padding: 18px;
          position: relative;
          overflow: hidden;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          color: #e6eef8;
        }

        /* Decorative scene */
        .fp-scene {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: 0.6;
        }

        .fp-sky {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(12,18,30,0.6), rgba(6,10,18,0.4));
          mix-blend-mode: overlay;
        }

        .fp-tower {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* Wrapper */
        .fp-wrap {
          z-index: 2;
          width: 100%;
          max-width: 720px;
          padding: 12px;
          box-sizing: border-box;
        }

        /* Card - mobile-first single column */
        .fp-card {
          width: 100%;
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          align-items: start;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border-radius: 16px;
          padding: 16px;
          box-shadow:
            0 28px 80px rgba(2,6,23,0.6),
            0 8px 28px rgba(124,58,237,0.04),
            inset 0 1px 0 rgba(255,255,255,0.02);
          border: 1px solid var(--glass);
          transform-style: preserve-3d;
          perspective: 1100px;
          overflow: hidden;
        }

        /* Left column: avatar and badge */
        .fp-left {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .fp-avatar-3d {
          width: 108px;
          height: 108px;
          border-radius: 14px;
          position: relative;
          transform: translateZ(48px) rotateX(6deg);
          box-shadow:
            0 18px 48px rgba(2,6,23,0.6),
            0 8px 24px rgba(6,182,212,0.08),
            inset 0 -8px 18px rgba(0,0,0,0.28);
          border: 1px solid rgba(255,255,255,0.04);
          background: linear-gradient(135deg, rgba(239,68,68,0.06), rgba(6,182,212,0.04));
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fp-avatar-inner {
          width: 96px;
          height: 96px;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          transform: translateZ(18px);
        }

        .fp-avatar-gloss {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          mix-blend-mode: overlay;
          pointer-events: none;
        }

        .fp-avatar-shadow {
          position: absolute;
          left: 50%;
          bottom: -8px;
          transform: translateX(-50%) scaleX(1.6);
          width: 60%;
          height: 18px;
          background: radial-gradient(closest-side, rgba(2,6,23,0.6), transparent);
          filter: blur(10px);
          border-radius: 50%;
          z-index: -1;
        }

        .fp-badge {
          display: inline-grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 8px;
          width: 100%;
          max-width: 220px;
        }

        .fp-badge-left,
        .fp-badge-right {
          height: 10px;
          border-radius: 6px;
          background: linear-gradient(90deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08));
          filter: blur(6px);
        }

        .fp-badge-center {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 56px;
          height: 28px;
          border-radius: 8px;
          background: linear-gradient(90deg, var(--accent-1), var(--accent-2));
          color: #001219;
          font-weight: 800;
          font-size: 13px;
          box-shadow: 0 8px 20px rgba(6,182,212,0.08);
          transform: translateZ(28px);
        }

        /* Right column: content */
        .fp-right {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .fp-title {
          margin: 0;
          font-size: 18px;
          line-height: 1.05;
          color: #ffffff;
          font-weight: 800;
          text-shadow: 0 6px 20px rgba(124,58,237,0.06);
          transform: translateZ(60px) rotateX(2deg);
        }

        .fp-text {
          margin: 0;
          color: var(--muted);
          font-size: 14px;
          line-height: 1.6;
          transform: translateZ(40px);
        }

        .fp-advice {
          margin: 0;
          color: rgba(230,238,248,0.72);
          font-size: 13px;
          line-height: 1.5;
          transform: translateZ(30px);
        }

        .fp-actions {
          display: flex;
          gap: 10px;
          margin-top: 6px;
          transform: translateZ(20px);
        }

        .fp-btn {
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          border: none;
          transition: transform 180ms cubic-bezier(.2,.9,.2,1), box-shadow 180ms;
        }

        .fp-btn:active { transform: translateY(1px) scale(0.998); }

        .fp-btn-ghost {
          background: transparent;
          color: #dbeafe;
          border: 1px solid rgba(219,234,254,0.06);
          box-shadow: none;
        }

        .fp-btn-primary {
          background: linear-gradient(90deg, var(--accent-1) 0%, var(--accent-2) 100%);
          color: #001219;
          box-shadow: 0 12px 36px rgba(6,182,212,0.12);
        }

        /* Micro interactions */
        .fp-btn-primary:hover { transform: translateY(-3px); box-shadow: 0 18px 48px rgba(6,182,212,0.16); }
        .fp-btn-ghost:hover { transform: translateY(-2px); }

        /* Responsive: mobile-first adjustments */
        @media (max-width: 520px) {
          .fp-card {
            padding: 14px;
            border-radius: 12px;
            gap: 10px;
          }

          .fp-left {
            gap: 10px;
          }

          .fp-avatar-3d { width: 88px; height: 88px; transform: translateZ(36px) rotateX(4deg); }
          .fp-avatar-inner { width: 76px; height: 76px; border-radius: 10px; }

          .fp-badge { max-width: 160px; }
          .fp-title { font-size: 16px; }
          .fp-text { font-size: 14px; }
          .fp-advice { font-size: 13px; }

          .fp-actions { gap: 8px; }
          .fp-btn { padding: 9px 12px; font-size: 13px; border-radius: 10px; }
        }

        /* Larger screens: two-column layout */
        @media (min-width: 900px) {
          .fp-card {
            grid-template-columns: 160px 1fr;
            padding: 22px;
            gap: 18px;
          }

          .fp-avatar-3d { width: 160px; height: 160px; transform: translateZ(60px) rotateX(6deg); }
          .fp-avatar-inner { width: 140px; height: 140px; border-radius: 14px; }

          .fp-title { font-size: 22px; }
          .fp-text { font-size: 15px; }
        }
      `}</style>
    </main>
  );
}