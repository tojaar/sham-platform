'use client';

import React from 'react';

export default function HomePage(): JSX.Element {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>مرحبًا بك في منصة شام</h1>
      <p style={{ fontSize: '1.2rem', color: '#555' }}>
        هذه الصفحة مكتوبة بـ TypeScript وتعمل بشكل صحيح.
      </p>
    </main>
  );
}