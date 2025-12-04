// components/CopyInvite.tsx
'use client';
import React from 'react';

export default function CopyInvite({ code }: { code?: string | null }) {
  const copy = async () => {
    if (!code) return alert('لا يوجد رمز دعوة');
    try {
      await navigator.clipboard.writeText(code);
      
    } catch {
      alert('تعذر النسخ، انسخ يدويًا: ' + code);
    }
  };
  return (
    <button
      onClick={copy}
      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
      aria-label="نسخ رمز الدعوة"
      title="نسخ رمز الدعوة"
    >
      نسخ رمز الدعوة
    </button>
  );
}