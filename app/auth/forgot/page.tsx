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
      {/* خلفية زخرفية */}
      <div className="fp-bg" aria-hidden="true">
        <div className="fp-grad" />
      </div>

      <section className="fp-card" aria-labelledby="fp-heading">
        <div className="fp-top">
          <div className="fp-badge-3d" aria-hidden="true">
            <div className="fp-badge-face">
              <span className="fp-badge-es">ES</span>
            </div>
            <div className="fp-badge-edge" />
          </div>

          <div className="fp-thumb" aria-hidden="false">
            {/* استخدم مسار من public: تأكد أن الملف موجود في public/assets/tojat.png */}
            <Image
              src="@/assets/tojar.png"
              alt="شعار المنصة"
              width={120}
              height={120}
              priority
              style={{ objectFit: 'cover', borderRadius: 14 }}
            />
            <div className="fp-thumb-gloss" />
          </div>
        </div>

        <h1 id="fp-heading" ref={headingRef} tabIndex={-1} className="fp-title">
          لا يمكن تغيير كلمة المرور
        </h1>

        <p className="fp-message">
          نعتذر، لا يمكن تغيير كلمة المرور في هذه المرحلة لأي سبب كان. هذا إجراء أمني لحماية الحسابات والمحتوى.
        </p>

        <p className="fp-note">
          إن احتجت مساعدة إضافية تواصل مع فريق الدعم الفني وسنقدّم المساعدة المناسبة.
        </p>

        <div className="fp-actions" role="group" aria-label="إجراءات">
          <button
            type="button"
            className="fp-btn fp-btn-ghost"
            onClick={() => router.back()}
            aria-label="العودة"
          >
            ← رجوع
          </button>

          <button
            type="button"
            className="fp-btn fp-btn-primary"
            onClick={() => router.push('/')}
            aria-label="الصفحة الرئيسية"
          >
            الصفحة الرئيسية
          </button>
        </div>
      </section>

      <style jsx>{`
        :root {
          --bg-1: #071026;
          --bg-2: #081426;
          --accent-a: #06b6d4;
          --accent-b: #7c3aed;
          --glass: rgba(255,255,255,0.03);
        }

        .fp-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, var(--bg-1), var(--bg-2));
          padding: 20px;
          position: relative;
          overflow: hidden;
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          color: #e6eef8;
        }

        .fp-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }

        .fp-grad {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 30% 30%, rgba(124,58,237,0.08), transparent 20%),
                      radial-gradient(circle at 70% 70%, rgba(6,182,212,0.06), transparent 20%);
          opacity: 0.9;
        }

        .fp-card {
          z-index: 2;
          width: 100%;
          max-width: 520px;
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 28px 80px rgba(2,6,23,0.6);
          border: 1px solid var(--glass);
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          text-align: center;
        }

        .fp-top {
          width: 100%;
          display: flex;
          gap: 12px;
          align-items: center;
          justify-content: center;
        }

        .fp-badge-3d {
          width: 96px;
          height: 96px;
          border-radius: 14px;
          position: relative;
          transform: translateZ(40px) rotateX(6deg);
          box-shadow: 0 18px 48px rgba(2,6,23,0.6), inset 0 -8px 18px rgba(0,0,0,0.28);
          background: linear-gradient(135deg, rgba(239,68,68,0.95), rgba(6,182,212,0.95));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .fp-badge-face { width: 100%; height: 100%; display:flex; align-items:center; justify-content:center; border-radius:14px; }
        .fp-badge-es { font-weight: 900; color: #fff; font-size: 22px; letter-spacing: 0.02em; }

        .fp-badge-edge {
          position: absolute;
          left: 6px;
          top: 6px;
          right: -6px;
          bottom: -6px;
          border-radius: 16px;
          background: linear-gradient(90deg, rgba(0,0,0,0.08), rgba(255,255,255,0.02));
          transform: translateZ(-12px);
          filter: blur(6px);
          z-index: -1;
        }

        .fp-thumb {
          width: 120px;
          height: 120px;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 12px 30px rgba(6,182,212,0.08);
          border: 1px solid rgba(255,255,255,0.04);
          transform: translateZ(20px) rotateX(4deg);
        }

        .fp-thumb-gloss {
          position: absolute;
          width: 120px;
          height: 120px;
          border-radius: 14px;
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02));
          mix-blend-mode: overlay;
          pointer-events: none;
        }

        .fp-title {
          margin: 0;
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          text-shadow: 0 6px 20px rgba(124,58,237,0.06);
        }

        .fp-message {
          margin: 0;
          color: rgba(230,238,248,0.95);
          font-size: 14px;
          line-height: 1.6;
        }

        .fp-note {
          margin: 0;
          color: rgba(230,238,248,0.72);
          font-size: 13px;
        }

        .fp-actions {
          display: flex;
          gap: 10px;
          margin-top: 6px;
        }

        .fp-btn {
          padding: 10px 14px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          border: none;
          transition: transform 160ms ease, box-shadow 160ms ease;
        }

        .fp-btn-ghost {
          background: transparent;
          color: #dbeafe;
          border: 1px solid rgba(219,234,254,0.06);
        }

        .fp-btn-primary {
          background: linear-gradient(90deg, var(--accent-a) 0%, var(--accent-b) 100%);
          color: #001219;
          box-shadow: 0 10px 30px rgba(6,182,212,0.12);
        }

        @media (max-width: 520px) {
          .fp-card { padding: 14px; border-radius: 12px; gap: 10px; }
          .fp-badge-3d { width: 88px; height: 88px; transform: translateZ(36px) rotateX(4deg); }
          .fp-thumb { width: 96px; height: 96px; transform: translateZ(30px) rotateX(4deg); }
          .fp-title { font-size: 18px; }
          .fp-message { font-size: 14px; }
        }
      `}</style>
    </main>
  );
}