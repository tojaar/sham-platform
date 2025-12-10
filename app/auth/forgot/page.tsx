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
      {/* خلفية برج زخرفي خفيف */}
      <div className="fp-bg" aria-hidden="true">
        <svg className="fp-bg-svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" focusable="false" aria-hidden="true">
          <defs>
            <linearGradient id="bgGrad" x1="0" x2="1">
              <stop offset="0" stopColor="#071026" />
              <stop offset="1" stopColor="#0f1724" />
            </linearGradient>
            <linearGradient id="edgeGlow" x1="0" x2="1">
              <stop offset="0" stopColor="#06b6d4" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>

          <rect width="100%" height="100%" fill="url(#bgGrad)" />

          {/* برج مبسط مركزي */}
          <g transform="translate(600,420) scale(0.9)" opacity="0.14">
            <rect x="-90" y="-300" width="180" height="560" rx="12" fill="#071026" />
            <rect x="-60" y="-280" width="120" height="520" rx="10" fill="#0b1220" />
            <g fill="#0f1724" opacity="0.95">
              <rect x="-40" y="-260" width="12" height="480" rx="2" />
              <rect x="-12" y="-260" width="12" height="480" rx="2" />
              <rect x="16" y="-260" width="12" height="480" rx="2" />
            </g>
            <polygon points="-40,-300 40,-300 60,-380 -60,-380" fill="#071026" />
            <path d="M-90,-300 L-90,260" stroke="url(#edgeGlow)" strokeWidth="2" opacity="0.06" />
            <path d="M90,-300 L90,260" stroke="#ff6b6b" strokeWidth="2" opacity="0.05" />
          </g>
        </svg>
      </div>

      {/* البطاقة الرئيسية */}
      <section className="fp-wrap" aria-labelledby="fp-title">
        <article className="fp-card" role="article" aria-describedby="fp-desc">
          {/* رأس البطاقة: صورة مصغرة ثلاثية الأبعاد */}
          <div className="fp-thumb-wrap" aria-hidden="false">
            <div className="fp-thumb-3d">
              <Image
                src="@/assets/tojat.png"
                alt="شعار المنصة"
                width={160}
                height={160}
                priority
                style={{ objectFit: 'cover', borderRadius: 14 }}
              />
              <div className="fp-thumb-reflect" />
            </div>

            {/* شريط زخرفي ثلاثي الأبعاد */}
            <div className="fp-strip" aria-hidden="true">
              <span className="fp-strip-layer layer-a" />
              <span className="fp-strip-layer layer-b" />
              <span className="fp-strip-layer layer-c" />
            </div>
          </div>

          {/* محتوى البطاقة */}
          <div className="fp-content">
            <h1 id="fp-title" ref={headingRef} tabIndex={-1} className="fp-heading">
              لا يمكن تغيير كلمة المرور
            </h1>

            <p id="fp-desc" className="fp-body">
              نعتذر، لا يمكن تغيير كلمة المرور في هذه المرحلة لأي سبب كان. هذا الإجراء جزء من سياسة أمان المنصة لحماية الحسابات والمحتوى.
            </p>

            <p className="fp-help">
              إن كنت بحاجة لمساعدة فنية، تواصل مع فريق الدعم وسنقدّم المساعدة المناسبة.
            </p>

            <div className="fp-actions" role="group" aria-label="إجراءات">
              <button
                type="button"
                className="fp-btn fp-btn-back"
                onClick={() => router.back()}
                aria-label="العودة"
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

      {/* أنماط مضمّنة متجاوبة وخالية من أخطاء TypeScript */}
      <style jsx>{`
        :root{
          --bg-1: #071026;
          --bg-2: #0f1724;
          --accent-1: #06b6d4;
          --accent-2: #7c3aed;
          --accent-3: #ff6b6b;
          --card-glass: rgba(255,255,255,0.03);
        }

        .fp-root{
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, var(--bg-1) 0%, var(--bg-2) 100%);
          padding: 20px;
          position: relative;
          overflow: hidden;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          color: #e6eef8;
        }

        .fp-bg{
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: 0.6;
        }

        .fp-bg-svg{
          width: 100%;
          height: 100%;
          display: block;
        }

        .fp-wrap{
          z-index: 2;
          width: 100%;
          max-width: 760px;
          padding: 12px;
          box-sizing: border-box;
        }

        .fp-card{
          width: 100%;
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          align-items: start;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border-radius: 16px;
          padding: 18px;
          box-shadow:
            0 28px 70px rgba(2,6,23,0.6),
            0 6px 18px rgba(124,58,237,0.04),
            inset 0 1px 0 rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.04);
          transform-style: preserve-3d;
          perspective: 1000px;
        }

        /* رأس البطاقة: الصورة والديكور */
        .fp-thumb-wrap{
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
        }

        .fp-thumb-3d{
          width: 120px;
          height: 120px;
          border-radius: 14px;
          overflow: hidden;
          position: relative;
          background: linear-gradient(135deg, rgba(239,68,68,0.06), rgba(6,182,212,0.04));
          box-shadow:
            0 18px 40px rgba(2,6,23,0.6),
            0 8px 24px rgba(6,182,212,0.08),
            inset 0 -8px 18px rgba(0,0,0,0.28);
          transform: translateZ(40px) rotateX(6deg);
          border: 1px solid rgba(255,255,255,0.04);
          flex-shrink: 0;
        }

        .fp-thumb-reflect{
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          mix-blend-mode: overlay;
          pointer-events: none;
        }

        .fp-strip{
          flex: 1;
          height: 12px;
          position: relative;
          transform-style: preserve-3d;
          perspective: 800px;
        }

        .fp-strip-layer{
          position: absolute;
          inset: 0;
          border-radius: 8px;
          background: linear-gradient(90deg, rgba(124,58,237,0.12), rgba(6,182,212,0.08));
          filter: blur(6px);
        }

        .fp-strip-layer.layer-a{ transform: translateZ(-18px) scale(0.98); opacity: 0.6; }
        .fp-strip-layer.layer-b{ transform: translateZ(-8px) scale(0.99); opacity: 0.8; }
        .fp-strip-layer.layer-c{ transform: translateZ(0px) scale(1); opacity: 1; }

        /* المحتوى النصي */
        .fp-content{
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .fp-heading{
          margin: 0;
          font-size: 20px;
          line-height: 1.05;
          color: #ffffff;
          font-weight: 800;
          text-shadow:
            0 2px 0 rgba(0,0,0,0.6),
            0 8px 28px rgba(124,58,237,0.06);
          transform: translateZ(60px) rotateX(2deg);
        }

        .fp-body{
          margin: 0;
          color: rgba(230,238,248,0.95);
          font-size: 14px;
          line-height: 1.6;
          transform: translateZ(40px);
        }

        .fp-help{
          margin: 0;
          color: rgba(230,238,248,0.72);
          font-size: 13px;
          line-height: 1.5;
          transform: translateZ(30px);
        }

        .fp-actions{
          display: flex;
          gap: 10px;
          margin-top: 6px;
          transform: translateZ(20px);
        }

        .fp-btn{
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          border: none;
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .fp-btn:active{ transform: translateY(1px) scale(0.998); }

        .fp-btn-back{
          background: transparent;
          color: #dbeafe;
          border: 1px solid rgba(219,234,254,0.06);
        }

        .fp-btn-primary{
          background: linear-gradient(90deg, var(--accent-1) 0%, var(--accent-2) 100%);
          color: #001219;
          box-shadow: 0 10px 30px rgba(6,182,212,0.12);
        }

        /* تجاوب موبايل أولاً */
        @media (max-width: 520px){
          .fp-card{
            padding: 14px;
            border-radius: 12px;
            gap: 10px;
          }

          .fp-thumb-wrap{
            align-items: center;
            gap: 10px;
          }

          .fp-thumb-3d{
            width: 96px;
            height: 96px;
            border-radius: 12px;
            transform: translateZ(30px) rotateX(4deg);
          }

          .fp-heading{ font-size: 18px; }
          .fp-body{ font-size: 14px; }
          .fp-help{ font-size: 13px; }

          .fp-actions{ gap: 8px; }
          .fp-btn{ padding: 9px 12px; font-size: 13px; border-radius: 10px; }
        }

        /* تحسينات للشاشات الأكبر */
        @media (min-width: 900px){
          .fp-card{
            grid-template-columns: 160px 1fr;
            padding: 22px;
            gap: 18px;
          }

          .fp-thumb-3d{
            width: 160px;
            height: 160px;
            border-radius: 14px;
            transform: translateZ(60px) rotateX(6deg);
          }

          .fp-heading{ font-size: 24px; }
          .fp-body{ font-size: 15px; }
        }
      `}</style>
    </main>
  );
}