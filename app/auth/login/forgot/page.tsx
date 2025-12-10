// app/auth/forgot/page.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPage() {
  const router = useRouter();
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    // ضع التركيز على العنوان لتحسين الوصولية عند فتح الصفحة
    headingRef.current?.focus();
  }, []);

  return (
    <main style={styles.page}>
      {/* خلفية برج مبسطة باستخدام SVG */}
      <div aria-hidden="true" style={styles.towerBackdrop}>
        <svg viewBox="0 0 600 600" preserveAspectRatio="xMidYMid slice" style={styles.towerSvg}>
          <defs>
            <linearGradient id="bgGrad" x1="0" x2="1">
              <stop offset="0" stopColor="#071026" />
              <stop offset="1" stopColor="#0f1724" />
            </linearGradient>
            <linearGradient id="neon" x1="0" x2="1">
              <stop offset="0" stopColor="#06b6d4" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>

          <rect width="100%" height="100%" fill="url(#bgGrad)" />

          {/* برج ستايل */}
          <g transform="translate(300,320) scale(0.9)">
            <rect x="-60" y="-220" width="120" height="420" rx="8" fill="#071026" opacity="0.85" />
            <rect x="-40" y="-200" width="80" height="380" rx="6" fill="#0b1220" opacity="0.9" />
            <g fill="#0f1724" opacity="0.95">
              <rect x="-28" y="-180" width="12" height="340" rx="2" />
              <rect x="-8" y="-180" width="12" height="340" rx="2" />
              <rect x="12" y="-180" width="12" height="340" rx="2" />
            </g>
            <polygon points="-20,-220 20,-220 40,-300 -40,-300" fill="#071026" />
            <path d="M-60,-220 L-60,200" stroke="url(#neon)" strokeWidth="1.5" opacity="0.08" />
            <path d="M60,-220 L60,200" stroke="#ff6b6b" strokeWidth="1.5" opacity="0.06" />
          </g>
        </svg>
      </div>

      {/* بطاقة الرسالة */}
      <section style={styles.cardWrapper} aria-labelledby="forgot-heading">
        <div style={styles.card}>
          <div style={styles.logoBox} aria-hidden="true">
            <div style={styles.logoInner}>
              <span style={styles.logoES}>ES</span>
            </div>
          </div>

          <h1
            id="forgot-heading"
            ref={headingRef}
            tabIndex={-1}
            style={styles.heading}
          >
            لا يمكن تغيير كلمة المرور
          </h1>

          <p style={styles.message}>
            نأسف لإبلاغك أنه لا يمكن تغيير كلمة المرور في هذه المرحلة لأي سبب كان.
            هذا القرار جزء من سياسة أمان المنصة للحفاظ على سلامة الحسابات والمحتوى.
          </p>

          <p style={styles.subMessage}>
            إن كنت تواجه مشكلة في الوصول إلى حسابك، تواصل مع فريق الدعم الفني لتقديم المساعدة المناسبة.
          </p>

          <div style={styles.actions}>
            <button
              type="button"
              onClick={() => router.back()}
              style={styles.backButton}
              aria-label="العودة إلى الصفحة السابقة"
            >
              ← رجوع
            </button>

            <button
              type="button"
              onClick={() => router.push('/')}
              style={styles.homeButton}
              aria-label="الذهاب إلى الصفحة الرئيسية"
            >
              الصفحة الرئيسية
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

/* أنماط مضمّنة آمنة وخالية من أي أخطاء TypeScript */
const styles: { [k: string]: React.CSSProperties } = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, rgba(7,16,38,1) 0%, rgba(15,23,36,1) 100%)',
    padding: '48px 24px',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    color: '#e6eef8',
  },
  towerBackdrop: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
    opacity: 0.55,
    pointerEvents: 'none',
  },
  towerSvg: {
    width: '100%',
    height: '100%',
    display: 'block',
  },
  cardWrapper: {
    zIndex: 2,
    width: '100%',
    maxWidth: 920,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    width: '100%',
    background:
      'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.02))',
    borderRadius: 20,
    padding: '36px',
    boxShadow: '0 20px 60px rgba(2,6,23,0.6)',
    border: '1px solid rgba(255,255,255,0.04)',
    display: 'grid',
    gridTemplateColumns: '120px 1fr',
    gap: 24,
    alignItems: 'center',
    backdropFilter: 'blur(6px)',
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), linear-gradient(180deg, rgba(12,18,30,0.9), rgba(6,10,18,0.8))',
    boxShadow: 'inset 0 2px 8px rgba(255,255,255,0.02), 0 12px 30px rgba(2,6,23,0.6)',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  logoInner: {
    width: 88,
    height: 88,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background:
      'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(6,182,212,0.95))',
    boxShadow: '0 8px 24px rgba(6,182,212,0.12), inset 0 -6px 18px rgba(0,0,0,0.25)',
    transform: 'translateZ(0)',
  },
  logoES: {
    fontSize: 34,
    fontWeight: 900,
    color: '#fff',
    letterSpacing: '0.02em',
    textShadow:
      '0 2px 0 rgba(0,0,0,0.6), 0 8px 24px rgba(6,182,212,0.12), 0 1px 0 rgba(255,255,255,0.06)',
    transform: 'translateZ(0)',
  },
  heading: {
    margin: 0,
    fontSize: 28,
    lineHeight: 1.05,
    color: '#ffffff',
    fontWeight: 800,
    textShadow:
      '0 2px 0 rgba(0,0,0,0.6), 0 6px 18px rgba(124,58,237,0.12), 0 1px 0 rgba(255,255,255,0.04)',
    transform: 'translateZ(0)',
  },
  message: {
    marginTop: 8,
    marginBottom: 6,
    color: 'rgba(230,238,248,0.95)',
    fontSize: 15,
    lineHeight: 1.6,
    maxWidth: '100%',
  },
  subMessage: {
    marginTop: 6,
    marginBottom: 0,
    color: 'rgba(230,238,248,0.75)',
    fontSize: 13,
    lineHeight: 1.5,
  },
  actions: {
    marginTop: 18,
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  backButton: {
    background: 'transparent',
    color: '#dbeafe',
    border: '1px solid rgba(219,234,254,0.08)',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
    transition: 'all 160ms ease',
  },
  homeButton: {
    background:
      'linear-gradient(90deg, rgba(6,182,212,1) 0%, rgba(124,58,237,1) 100%)',
    color: '#001219',
    border: 'none',
    padding: '10px 14px',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 800,
    fontSize: 14,
    boxShadow: '0 8px 24px rgba(6,182,212,0.12)',
    transition: 'transform 160ms ease, box-shadow 160ms ease',
  },
};