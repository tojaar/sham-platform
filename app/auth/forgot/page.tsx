
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
    <main className="fp-page" role="main">
      <div className="fp-backdrop" aria-hidden="true">

        <svg className="fp-tower" viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="g1" x1="0" x2="1">
              <stop offset="0" stopColor="#071026" />
              <stop offset="1" stopColor="#0f1724" />
            </linearGradient>
            <linearGradient id="g2" x1="0" x2="1">
              <stop offset="0" stopColor="#06b6d4" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>

          <rect width="100%" height="100%" fill="url(#g1)" />

          <g transform="translate(300,320) scale(0.9)" opacity="0.18">
            <rect x="-80" y="-240" width="160" height="520" rx="10" fill="#071026" />
            <rect x="-50" y="-220" width="100" height="480" rx="8" fill="#0b1220" />
            <g fill="#0f1724" opacity="0.95">
              <rect x="-36" y="-200" width="14" height="440" rx="2" />
              <rect x="-8" y="-200" width="14" height="440" rx="2" />
              <rect x="20" y="-200" width="14" height="440" rx="2" />
            </g>
            <polygon points="-30,-240 30,-240 50,-340 -50,-340" fill="#071026" />
            <path d="M-80,-240 L-80,240" stroke="url(#g2)" strokeWidth="2" opacity="0.06" />
            <path d="M80,-240 L80,240" stroke="#ff6b6b" strokeWidth="2" opacity="0.05" />
          </g>
        </svg>
      </div>

      <section className="fp-card-wrap" aria-labelledby="fp-heading">
        <article className="fp-card" role="article" aria-describedby="fp-desc">
          <div className="fp-left">
            
            <div className="fp-thumb" aria-hidden="true">
              <Image
                src="/assets/tojat.png"
                alt="شعار المنصة"
                width={160}
                height={160}
                priority
                style={{ objectFit: 'cover', borderRadius: 16 }}
              />
              <div className="fp-thumb-gloss" />
            </div>

            
            <div className="fp-decor" aria-hidden="true">
              <div className="fp-decor-layer layer-back" />
              <div className="fp-decor-layer layer-mid" />
              <div className="fp-decor-layer layer-front" />
            </div>
          </div>

          <div className="fp-right">
            <h1 id="fp-heading" ref={headingRef} tabIndex={-1} className="fp-title">
              لا يمكن تغيير كلمة المرور
            </h1>

            <p id="fp-desc" className="fp-text">
              نعتذر، لا يمكن تغيير كلمة المرور في هذه المرحلة لأي سبب كان. هذا الإجراء جزء من سياسة أمان المنصة للحفاظ على سلامة الحسابات والمحتوى.
            </p>

            <p className="fp-note">
              إن كنت بحاجة لمساعدة إضافية، تواصل مع فريق الدعم الفني وسنساعدك بأسرع وقت ممكن.
            </p>

            <div className="fp-actions">
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
          --bg-2: #0f1724;
          --accent-a: #06b6d4;
          --accent-b: #7c3aed;
          --accent-c: #ff6b6b;
          --card-bg: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02));
          --glass: rgba(255,255,255,0.04);
        }

        .fp-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, var(--bg-1) 0%, var(--bg-2) 100%);
          padding: 28px;
          position: relative;
          overflow: hidden;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          color: #e6eef8;
        }

        .fp-backdrop {
          position: absolute;
          inset: 0;
          z-index: 0;
          opacity: 0.6;
          pointer-events: none;
        }

        .fp-tower {
          width: 100%;
          height: 100%;
          display: block;
        }

        .fp-card-wrap {
          z-index: 2;
          width: 100%;
          max-width: 980px;
          padding: 18px;
          box-sizing: border-box;
        }

        .fp-card {
          display: grid;
          grid-template-columns: 160px 1fr;
          gap: 20px;
          align-items: center;
          background: var(--card-bg);
          border-radius: 18px;
          padding: 22px;
          box-shadow:
            0 30px 80px rgba(2,6,23,0.6),
            0 6px 18px rgba(124,58,237,0.06),
            inset 0 1px 0 rgba(255,255,255,0.02);
          border: 1px solid var(--glass);
          transform: translateZ(0);
          perspective: 1200px;
        }

        / اليسار: الصورة المصغرة والديكور /
        .fp-left {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        .fp-thumb {
          width: 160px;
          height: 160px;
          border-radius: 16px;
          overflow: hidden;
          position: relative;
          transform: translateZ(40px) rotateX(6deg);
          box-shadow:
            0 18px 40px rgba(2,6,23,0.6),
            0 6px 18px rgba(6,182,212,0.08);
          border: 1px solid rgba(255,255,255,0.04);
          background: linear-gradient(135deg, rgba(239,68,68,0.06), rgba(6,182,212,0.04));
        }

        .fp-thumb-gloss {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          mix-blend-mode: overlay;
          pointer-events: none;
        }

        .fp-decor {
          width: 160px;
          height: 36px;
          position: relative;
          transform-style: preserve-3d;
          perspective: 800px;
        }

        .fp-decor-layer {
          position: absolute;
          inset: 0;
          border-radius: 10px;
          background: linear-gradient(90deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08));
          filter: blur(6px);
          transform-origin: center;
        }

        .fp-decor-layer.layer-back {
          transform: translateZ(-18px) scale(0.98);
          opacity: 0.6;
        }
        .fp-decor-layer.layer-mid {
          transform: translateZ(-8px) scale(0.99);
          opacity: 0.8;
        }
        .fp-decor-layer.layer-front {
          transform: translateZ(0px) scale(1);
          opacity: 1;
        }

        / اليمين: النص والأزرار /
        .fp-right {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .fp-title {
          margin: 0;
          font-size: 22px;
          line-height: 1.05;
          color: #ffffff;
          font-weight: 800;
          text-shadow:
            0 2px 0 rgba(0,0,0,0.6),
            0 8px 28px rgba(124,58,237,0.08);
          transform: translateZ(60px) rotateX(2deg);
        }

        .fp-text {
          margin: 6px 0 0 0;
          color: rgba(230,238,248,0.95);
          font-size: 14px;
          line-height: 1.6;
          max-width: 100%;
          transform: translateZ(40px);
        }

        .fp-note {
          margin: 6px 0 0 0;
          color: rgba(230,238,248,0.72);
          font-size: 13px;
          line-height: 1.5;
          transform: translateZ(30px);
        }

        .fp-actions {
          margin-top: 12px;
          display: flex;
          gap: 10px;
          align-items: center;
          transform: translateZ(20px);
        }

        .fp-btn {
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          border: none;
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .fp-btn:active {
          transform: translateY(1px) scale(0.998);
        }

        .fp-btn-ghost {
          background: transparent;
          color: #dbeafe;
          border: 1px solid rgba(219,234,254,0.06);
          box-shadow: none;
        }

        .fp-btn-primary {
          background: linear-gradient(90deg, var(--accent-a) 0%, var(--accent-b) 100%);
          color: #001219;
          box-shadow: 0 10px 30px rgba(6,182,212,0.12);
        }

        / تجاوب للهاتف /
        @media (max-width: 720px) {
          .fp-card {
            grid-template-columns: 1fr;
            padding: 18px;
            gap: 14px;
            border-radius: 14px;
          }

          .fp-left {
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
          }

          .fp-thumb {
            width: 96px;
            height: 96px;
            transform: translateZ(30px) rotateX(4deg);
          }

          .fp-decor {
            width: 96px;
            height: 28px;
          }

          .fp-title {
            font-size: 18px;
          }

          .fp-text {
            font-size: 14px;
          }

          .fp-actions {
            justify-content: flex-start;
            gap: 8px;
          }

          .fp-btn {
            padding: 9px 12px;
            font-size: 13px;
            border-radius: 10px;
          }
        }

        / تحسينات بصرية إضافية على الشاشات الكبيرة /
        @media (min-width: 1024px) {
          .fp-card {
            padding: 32px;
            gap: 28px;
          }

          .fp-thumb {
            width: 180px;
            height: 180px;
            transform: translateZ(60px) rotateX(6deg);
          }

          .fp-title {
            font-size: 28px;
          }

          .fp-text {
            font-size: 15px;
          }
        }
      `}</style>
    </main>
  );
}
