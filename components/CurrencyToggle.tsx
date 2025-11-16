// components/CurrencyToggle.tsx
'use client';
import React, { useState } from 'react';

export default function CurrencyToggle({ initial = 'syp', onChange }: { initial?: 'syp' | 'usd'; onChange?: (c: 'syp' | 'usd') => void }) {
  const [cur, setCur] = useState<'syp' | 'usd'>(initial);
  const handle = (c: 'syp' | 'usd') => {
    setCur(c);
    onChange?.(c);
  };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <button
        onClick={() => handle('syp')}
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: cur === 'syp' ? '2px solid #0b5cff' : '1px solid #e0e0e0',
          background: cur === 'syp' ? '#eef6ff' : '#fff',
          cursor: 'pointer'
        }}
      >
        ل.س
      </button>
      <button
        onClick={() => handle('usd')}
        style={{
          padding: '8px 12px',
          borderRadius: 8,
          border: cur === 'usd' ? '2px solid #0b5cff' : '1px solid #e0e0e0',
          background: cur === 'usd' ? '#eef6ff' : '#fff',
          cursor: 'pointer'
        }}
      >
        $
      </button>
    </div>
  );
}