'use client';

import React from 'react';

export default function TestPage(): JSX.Element {
  return (
    <main style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>صفحة اختبار</h1>
      <p style={{ fontSize: '1.2rem', color: '#555' }}>
        هذه الصفحة تعمل الآن بشكل صحيح، وتم حل مشكلة البناء.
      </p>
    </main>
  );
}