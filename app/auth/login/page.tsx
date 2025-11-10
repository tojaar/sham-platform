// app/auth/login/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('أدخل البريد وكلمة السر');
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const j = await resp.json();
      if (!resp.ok) {
        setError(j?.message || j?.error || 'فشل تسجيل الدخول');
        setLoading(false);
        return;
      }
      // خزن الجلسة مؤقتاً (اختياري) ثم وجه المستخدم
      if (j?.session?.access_token) {
        localStorage.setItem('sb_access_token', j.session.access_token);
      }
      router.push('/account/earnings');
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#020718] text-white">
      <form onSubmit={handleSubmit} className="w-full max-w-md bg-[#041018] p-6 rounded space-y-4">
        <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="البريد الإلكتروني" type="email" className="w-full p-2 bg-[#07171b] rounded" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="كلمة السر" type="password" className="w-full p-2 bg-[#07171b] rounded" />
        {error && <div className="text-red-400">{error}</div>}
        <div className="flex gap-3">
          <button disabled={loading} className="px-4 py-2 bg-cyan-600 rounded">
            {loading ? 'جاري...' : 'تسجيل الدخول'}
          </button>
        </div>
      </form>
    </main>
  );
}