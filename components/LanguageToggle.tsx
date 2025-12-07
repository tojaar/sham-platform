// components/LanguageToggle.tsx
'use client';

import React, { useEffect, useState, KeyboardEvent } from 'react';

type Locale = 'ar' | 'en' | 'fr' | 'zh' | 'hi' | 'tr';

const LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: 'ar', label: 'Arabic', native: 'العربية' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'fr', label: 'Français', native: 'Français' },
  { code: 'zh', label: '中文', native: '中文' },
  { code: 'hi', label: 'हिन्दी', native: 'हिन्दी' },
  { code: 'tr', label: 'Türkçe', native: 'Türkçe' },
];

/* Extend global Window to include debug hook for locale */
declare global {
  interface Window {
    __app_locale?: Locale;
  }
}

export default function LanguageToggle({ defaultLocale = 'ar' }: { defaultLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === 'undefined') return defaultLocale;
    const saved = (localStorage.getItem('locale') as Locale | null) ?? null;
    return (saved ?? defaultLocale) as Locale;
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      document.documentElement.lang = locale;
      document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
      localStorage.setItem('locale', locale);
    } catch {
      /* ignore DOM/storage errors */
    }
  }, [locale]);

  // Expose a small API on window for debugging or other scripts (optional, safe)
  useEffect(() => {
    window.__app_locale = locale;
  }, [locale]);

  const handleOptionKey = (e: KeyboardEvent, code: Locale) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setLocale(code);
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: 800,
          fontSize: 13,
        }}
        title="تغيير لغة الواجهة"
        aria-label="Toggle language"
      >
        <span style={{ fontWeight: 900, minWidth: 18, textAlign: 'center' }}>{locale.toUpperCase()}</span>
        <span style={{ opacity: 0.9 }}>
          {LOCALES.find((l) => l.code === locale)?.native ?? locale}
        </span>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="اختر اللغة"
          onBlur={() => setOpen(false)}
          style={{
            position: 'absolute',
            right: 0,
            marginTop: 8,
            listStyle: 'none',
            padding: 8,
            display: 'grid',
            gap: 6,
            background: 'rgba(255,255,255,0.98)',
            color: '#071026',
            borderRadius: 10,
            boxShadow: '0 12px 40px rgba(2,6,23,0.2)',
            minWidth: 160,
            zIndex: 120,
          }}
        >
          {LOCALES.map((l) => (
            <li key={l.code} role="presentation">
              <button
                role="option"
                aria-selected={l.code === locale}
                onClick={() => {
                  setLocale(l.code);
                  setOpen(false);
                }}
                onKeyDown={(e) => handleOptionKey(e, l.code)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 8,background: l.code === locale ? 'linear-gradient(90deg,#06b6d4,#7c3aed)' : 'transparent',
                  color: l.code === locale ? '#001219' : '#071026',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{l.native}</span>
                  <span style={{ opacity: 0.7, fontSize: 12 }}>{l.label}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}