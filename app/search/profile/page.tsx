// app/profile/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import type { FC } from 'react';

/**
 * IMPORTANT:
 * لا تستورد supabase على مستوى الوحدة لتجنّب خطأ prerender ("supabaseKey is required").
 * استورد العميل ديناميكياً داخل الدوال التي تعمل على جهة العميل فقط.
 */
async function getSupabase() {
  const mod = await import('@/lib/supabase');
  return mod.supabase;
}

type SupabaseUserLike = {
  email?: string | null;
  user_metadata?: { role?: string } | Record<string, unknown> | null;
  id?: string;
  [key: string]: unknown;
};

const ProfilePage: FC = () => {
  const [user, setUser] = useState<SupabaseUserLike | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchUser = async () => {
      try {
        const supabase = await getSupabase();
        const res = await supabase.auth.getUser();
        const data = res?.data as unknown;

        // data may be { user: User } or { user: null } or something else.
        // Use safe runtime checks to extract the user object.
        let extracted: SupabaseUserLike | null = null;

        if (data && typeof data === 'object' && 'user' in (data as Record<string, unknown>)) {
          const maybeUser = (data as Record<string, unknown>)['user'];
          if (maybeUser && typeof maybeUser === 'object') {
            const mu = maybeUser as Record<string, unknown>;
            extracted = {
              email: typeof mu.email === 'string' ? mu.email : undefined,
              user_metadata: typeof mu.user_metadata === 'object' ? (mu.user_metadata as Record<string, unknown>) : undefined,
              id: typeof mu.id === 'string' ? mu.id : undefined,
              ...mu,
            };
          } else {
            extracted = null;
          }
        } else {
          extracted = null;
        }

        if (mounted) setUser(extracted);
      } catch (err) {
        console.error('Failed to get user from supabase', err);
        if (mounted) setUser(null);
      }
    };

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []);

  if (!user) return <p>جاري تحميل البيانات...</p>;

  // compute role safely without using any
  const role =
    user.user_metadata &&
    typeof user.user_metadata === 'object' &&
    'role' in user.user_metadata &&
    typeof (user.user_metadata as Record<string, unknown>).role === 'string'
      ? ((user.user_metadata as Record<string, unknown>).role as string)
      : 'غير محدد';

  return (
    <main style={{ padding: '2rem' }}>
      <h1>👤 معلومات المستخدم</h1>
      <p>
        <strong>البريد الإلكتروني:</strong> {user.email ?? '—'}
      </p>
      <p>
        <strong>الدورة:</strong> {role}
      </p>
      <p>
        <strong>المعرف:</strong> {user.id ?? '—'}
      </p>
    </main>
  );
};

export default ProfilePage;