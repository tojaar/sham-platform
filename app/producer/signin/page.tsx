'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function ProducerSignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // تسجيل الدخول عبر Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // إذا نجح الدخول → اربط المستخدم مع صفه في producer_members
    const token = data.session?.access_token;
    if (token) {
      await fetch('/api/producer/link-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auth_token: token }),
      });
    }

    router.replace('/producer/dashboard');
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#021014] text-white">
      <form onSubmit={handleSignIn} className="bg-[#041018] p-6 rounded-xl w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold">تسجيل دخول المنتج</h1>

        <div>
          <label>البريد الإلكتروني</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full mt-1 p-2 rounded bg-[#021617] text-white"
          />
        </div>

        <div>
          <label>كلمة السر</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full mt-1 p-2 rounded bg-[#021617] text-white"
          />
        </div>

        {error && <div className="text-red-400">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-cyan-600 rounded font-semibold"
        >
          {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
        </button>
      </form>
    </main>
  );
}