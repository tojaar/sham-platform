// app/auth/forgot/page.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPage() {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <main className="forgot-root">
      {/* خلفية إعلامية حديثة */}
      <div className="forgot-bg" aria-hidden="true">
        <div className="forgot-gradient" />
        <div className="forgot-grid" />
      </div>

      {/* البطاقة الرئيسية */}
      <section className="forgot-card" aria-labelledby="forgot-heading">
        {/* شعار المنصة ثلاثي الأبعاد */}
        <div className="forgot-logo">
          <div className="logo-3d">
            {/* استخدمت وسم img بمسار ثابت من public لضمان العرض بدون أخطاء تحسين next/image */}
            <img
              src="/assets/tojar.png"
              alt="شعار المنصة"
              width={120}
              height={120}
              style={{ objectFit: 'cover', borderRadius: '50%', display: 'block' }}
            />
          </div>
          <div className="logo-glow" />
        </div>

        {/* النصوص */}
        <h1
          id="forgot-heading"
          ref={headingRef}
          tabIndex={-1}
          className="forgot-title"
        >
          🚫 لا يمكن تغيير كلمة المرور
        </h1>

        <p className="forgot-message">
          لأسباب أمنية وسياسات المنصة، لا يمكن تعديل كلمة المرور مهما كانت الظروف.
        </p>

        <p className="forgot-note">
          إذا واجهت مشكلة في الدخول، يرجى التواصل مع فريق الدعم الفني.
        </p>

        {/* الأزرار */}
        <div className="forgot-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => router.back()}
            aria-label="العودة"
          >
            ← رجوع
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => router.push('/')}
            aria-label="الصفحة الرئيسية"
          >
            الصفحة الرئيسية
          </button>
        </div>
      </section>

      {/* أنماط حديثة ومتجاوبة */}
      <style jsx>{`
        .forgot-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0a0a0a;
          font-family: 'Inter', system-ui, sans-serif;
          color: #fff;
          position: relative;
          overflow: hidden;
          padding: 20px;
        }

        /* خلفية إعلامية */
        .forgot-bg {
          position: absolute;
          inset: 0;
          z-index: 0;
        }
        .forgot-gradient {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 30% 30%, #7c3aed, transparent 60%),
                      radial-gradient(circle at 70% 70%, #06b6d4, transparent 60%);
          opacity: 0.4;
        }
        .forgot-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(#ffffff0a 1px, transparent 1px),
                            linear-gradient(90deg, #ffffff0a 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.2;
        }

        /* البطاقة */
        .forgot-card {
          z-index: 2;
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(12px);
          border-radius: 20px;
          padding: 24px;
          max-width: 420px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0,0,0,0.6);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transform: translateZ(0);
        }

        /* الشعار */
        .forgot-logo {
          position: relative;
          margin-bottom: 16px;
        }
        .logo-3d {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          overflow: hidden;
          box-shadow: 0 12px 30px rgba(124,58,237,0.4),
                      0 -6px 20px rgba(6,182,212,0.3);
          transform: rotateY(10deg) rotateX(6deg);
          display: inline-block;
        }
        .logo-glow {
          position: absolute;
          inset: -10px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(124,58,237,0.4), transparent 70%);
          filter: blur(20px);
          z-index: -1;
        }

        /* النصوص */
        .forgot-title {
          font-size: 20px;
          font-weight: 800;
          margin: 0;
          text-shadow: 0 4px 12px rgba(6,182,212,0.4);
        }
        .forgot-message {
          margin-top: 12px;
          font-size: 15px;
          line-height: 1.6;
          color: #e5e7eb;
        }
        .forgot-note {
          margin-top: 8px;
          font-size: 13px;
          color: #9ca3af;
        }

        /* الأزرار */
        .forgot-actions {
          margin-top: 20px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .btn {
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:active {
          transform: scale(0.97);
        }
        .btn-ghost {
          background: transparent;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.2);
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,0.1);
        }
        .btn-primary {
          background: linear-gradient(90deg, #06b6d4, #7c3aed);
          color: #001219;
          border: none;
          box-shadow: 0 8px 24px rgba(124,58,237,0.4);
        }
        .btn-primary:hover {
          box-shadow: 0 12px 30px rgba(6,182,212,0.5);
          transform: translateY(-2px);
        }

        /* تجاوب للهاتف */
        @media (max-width: 480px) {
          .forgot-card {
            padding: 18px;
            border-radius: 16px;
          }
          .forgot-title {
            font-size: 18px;
          }
          .forgot-message {
            font-size: 14px;
          }
        }
      `}</style>
    </main>
  );
}