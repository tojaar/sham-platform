// components/CopyInvite.tsx
'use client';
import React from 'react';

function showToast(message: string, duration = 3000) {
  try {
    // إذا لم يكن المستعرض يدعم DOM (نظريًا) نتراجع إلى alert كاحتياط
    if (typeof document === 'undefined') {
      // eslint-disable-next-line no-alert
      alert(message);
      return;
    }

    const id = `copy-invite-toast-${Date.now()};`
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement('div');
    toast.id = id;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.style.position = 'fixed';
    toast.style.zIndex = '9999';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.bottom = '24px';
    toast.style.padding = '10px 14px';
    toast.style.background = 'rgba(0,0,0,0.85)';
    toast.style.color = '#fff';
    toast.style.borderRadius = '8px';
    toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.3)';
    toast.style.fontSize = '14px';
    toast.style.fontWeight = '600';
    toast.style.maxWidth = '90%';
    toast.style.textAlign = 'center';
    toast.style.pointerEvents = 'auto';
    toast.style.backdropFilter = 'blur(4px)';
    toast.textContent = message;

    document.body.appendChild(toast);

    // إزالة بعد المدة المحددة
    setTimeout(() => {
      try {
        toast.style.transition = 'opacity 220ms ease';
        toast.style.opacity = '0';
        setTimeout(() => {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 220);
      } catch {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }
    }, duration);
  } catch {
    // كاحتياط أخير، نستخدم alert إن فشل أي شيء أعلاه
    // eslint-disable-next-line no-alert
    alert(message);
  }
}

export default function CopyInvite({ code }: { code?: string | null }) {
  const copy = async () => {
    if (!code) {
      showToast('لا يوجد رمز دعوة');
      return;
    }
    try {
      await navigator.clipboard.writeText(code);
      // رسالة واضحة ومباشرة بدون أي رابط أو عنوان موقع
      showToast('تم نسخ رمز الدعوة الخاصة بك');
    } catch {
      // عند الفشل نعرض رسالة تحتوي فقط النص المطلوب مع تعليمات نسخ يدوي
      showToast('تعذر النسخ، انسخ رمز الدعوة يدويًا');
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