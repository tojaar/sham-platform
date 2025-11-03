'use client';

import { useRouter } from 'next/navigation';

export default function WorkPage() {
  const router = useRouter();

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #fef9f5, #fde68a)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2rem',
      fontFamily: 'sans-serif',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '2rem', color: '#92400e' }}>📋 اختر نوع الإعلان</h1>
      <button onClick={() => router.push('/work/seeker')} style={buttonStyle}>🔍 أنا أبحث عن عمل</button>
      <button onClick={() => router.push('/work/hire')} style={{ ...buttonStyle, backgroundColor: '#10b981' }}>🧑‍💼 أبحث عن موظف أو عمال</button>
    </main>
  );
}

const buttonStyle = {
  padding: '1rem 2rem',
  fontSize: '1.1rem',
  backgroundColor: '#f59e0b',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
};