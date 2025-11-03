'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  if (!user) return <p>جاري تحميل البيانات...</p>;

  return (
    <main style={{ padding: '2rem' }}>
      <h1>👤 معلومات المستخدم</h1>
      <p><strong>البريد الإلكتروني:</strong> {user.email}</p>
      <p><strong>الدور:</strong> {user.user_metadata?.role || 'غير محدد'}</p>
      <p><strong>المعرف:</strong> {user.id}</p>
    </main>
  );
}