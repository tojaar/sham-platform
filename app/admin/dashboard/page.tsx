// app/admin/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';

type Member = {
  id: string;
  full_name: string;
  email?: string | null;
  whatsapp?: string | null;
  invite_code?: string | null;
  invite_code_self?: string | null;
  created_at?: string | null;
};

export default function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);
    setError(null);
    try {
      const q = query ? `?q=${encodeURIComponent(query)}` : '';
      const resp = await fetch('/api/admin/members' + q);
      const j = await resp.json();
      if (!resp.ok) {
        setError(j?.message || j?.error || 'فشل تحميل الأعضاء');
        setMembers([]);
      } else if (Array.isArray(j?.members)) {
        setMembers(j.members);
      } else {
        setMembers([]);
      }
    } catch (err: any) {
      console.error('fetchMembers error', err);
      setError(String(err?.message || err));
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 bg-[#020718] min-h-screen text-white">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">لوحة الإدارة — الأعضاء</h1>

        <div className="flex gap-2 mb-4">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث باسم أو رمز أو بريد" className="p-2 bg-[#07171b] rounded flex-1" />
          <button onClick={fetchMembers} className="px-4 py-2 bg-cyan-600 rounded">بحث</button>
        </div>

        {error && <div className="text-red-400 mb-4">{error}</div>}

        {loading ? (
          <div>جاري التحميل...</div>
        ) : (
          <div className="overflow-x-auto bg-[#041018] rounded">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left">
                  <th className="p-2">الاسم</th>
                  <th className="p-2">البريد</th>
                  <th className="p-2">واتساب</th>
                  <th className="p-2">invite_code</th>
                  <th className="p-2">invite_code_self</th>
                  <th className="p-2">تاريخ</th>
                  <th className="p-2">أفعال</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center">لا يوجد أعضاء لعرضهم</td>
                  </tr>
                ) : members.map(m => (
                  <tr key={m.id} className="border-t border-neutral-800">
                    <td className="p-2">{m.full_name}</td>
                    <td className="p-2">{m.email ?? '-'}</td>
                    <td className="p-2">{m.whatsapp ?? '-'}</td>
                    <td className="p-2">{m.invite_code ?? '-'}</td>
                    <td className="p-2">{m.invite_code_self ?? '-'}</td>
                    <td className="p-2">{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</td>
                    <td className="p-2">
                      <button className="px-2 py-1 bg-white/6 rounded mr-2">عرض</button>
                      <button className="px-2 py-1 bg-red-600 rounded">حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}