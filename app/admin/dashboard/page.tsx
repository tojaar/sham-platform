// app/admin/dashboard/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

type Member = {
  id: string;
  full_name: string;
  email?: string | null;
  whatsapp?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  invite_code?: string | null;
  invite_code_self?: string | null;
  usdt_trc20?: string | null;
  sham_cash_link?: string | null;
  sham_payment_code?: string | null;
  usdt_txid?: string | null;
  status?: string | null;
  created_at?: string | null;
};

function StatusBadge({ status }: { status?: string | null }) {
  const map: Record<string, string> = {
    approved: 'bg-emerald-600',
    rejected: 'bg-red-600',
    deleted: 'bg-gray-600',
    pending: 'bg-yellow-600',
  };
  return (
    <span className={`px-2 py-1 rounded text-sm ${map[status || 'pending'] || 'bg-neutral-600'}`}>
      {status || 'pending'}
    </span>
  );
}

export default function AdminDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchMembers(); }, [page, statusFilter]);

  async function fetchMembers() {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('perPage', String(perPage));
      const resp = await fetch('/api/admin/members?' + params.toString());
      const j = await resp.json();
      if (!resp.ok) { setError(j?.message || j?.error || 'فشل التحميل'); setMembers([]); }
      else { setMembers(j.members || []); setCount(j.count || 0); }
    } catch (err: any) { setError(String(err?.message || err)); setMembers([]); }
    finally { setLoading(false); }
  }

  async function quickAction(id: string, action: 'approve' | 'reject' | 'delete') {
    if (!confirm(`هل أنت متأكد من ${action} لهذا العضو؟`)) return;

    try {
      const resp = await fetch(`/api/admin/members/${id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action })
      });
      const j = await resp.json();
      if (!resp.ok) alert(j?.message || j?.error || 'فشل العملية');
      else fetchMembers();
    } catch { alert('خطأ في الشبكة'); }
  }

  return (
    <main className="p-6 bg-gradient-to-b from-[#02121a] to-[#000814] min-h-screen text-white">
      <div className="max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">لوحة الإدارة</h1>
            <p className="text-sm text-neutral-400 mt-1">إدارة طلبات التسجيل، البحث، والفلترة المتقدمة</p>
          </div>
          <div className="flex gap-2 items-center">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="bg-[#07171b] p-2 rounded text-sm">
              <option value="">الحالة: الكل</option>
              <option value="pending">قيد الانتظار</option>
              <option value="approved">مقبول</option>
              <option value="rejected">مرفوض</option>
              <option value="deleted">محذوف</option>
            </select>
            <button onClick={() => { setStatusFilter('pending'); setPage(1); }} className="px-3 py-2 bg-cyan-600 rounded text-sm">قيد الانتظار</button>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث: اسم، بريد، واتساب، رمز" className="p-3 bg-[#07171b] rounded col-span-2" />
          <div className="flex gap-2">
            <button onClick={() => { setPage(1); fetchMembers(); }} className="px-4 py-2 bg-cyan-600 rounded">بحث</button>
            <button onClick={() => { setQuery(''); setStatusFilter(''); setPage(1); fetchMembers(); }} className="px-4 py-2 bg-white/6 rounded">مسح</button>
          </div>
        </section>

        {error && <div className="text-red-400 mb-4">{error}</div>}

        <div className="bg-[#041018] rounded shadow overflow-hidden">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-left border-b border-neutral-800">
                <th className="p-3 text-sm text-neutral-300">#</th>
                <th className="p-3 text-sm text-neutral-300">الاسم</th>
                <th className="p-3 text-sm text-neutral-300">البريد</th>
                <th className="p-3 text-sm text-neutral-300"> رمز الدعوة الذي تم التسجيل به</th>
                <th className="p-3 text-sm text-neutral-300">الموقع</th>
                <th className="p-3 text-sm text-neutral-300">الحالة</th>
                <th className="p-3 text-sm text-neutral-300">رمز الدعوة الخاص</th>
                <th className="p-3 text-sm text-neutral-300">تاريخ الإنشاء</th>
                <th className="p-3 text-sm text-neutral-300">أفعال</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-6 text-center">جاري التحميل...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={9} className="p-6 text-center">لا توجد نتائج</td></tr>
              ) : members.map((m, idx) => (
                <tr key={m.id} className="border-b border-neutral-800 hover:bg-[#05202a]">
                  <td className="p-3">{(page - 1) * perPage + idx + 1}</td>
                  <td className="p-3">
                    <Link href={`/admin/member/${m.id}`} className="font-semibold underline">{m.full_name}</Link>
                    <div className="text-xs text-neutral-400">{m.address ? `${m.city ?? ''} • ${m.province ?? ''}` : ''}</div>
                  </td>
                  <td className="p-3 text-sm">{m.email ?? '-'}</td>
                  <td className="p-3 text-sm">{m.invite_code ?? '-'}</td>
                  <td className="p-3 text-sm">{(m.country ? m.country + ' / ' : '') + (m.city ?? '')}</td>
                  <td className="p-3"><StatusBadge status={m.status} /></td>
                  <td className="p-3 text-sm">{m.invite_code_self ?? '-'}</td>
                  <td className="p-3 text-sm">{m.created_at ? new Date(m.created_at).toLocaleString() : ''}</td>
                  <td className="p-3 flex gap-2">
                    {m.status !== 'approved' && <button onClick={() => quickAction(m.id, 'approve')} className="px-2 py-1 bg-emerald-600 rounded text-sm">قبول</button>}
                    {m.status !== 'rejected' && <button onClick={() => quickAction(m.id, 'reject')} className="px-2 py-1 bg-orange-500 rounded text-sm">رفض</button>}
                    <button onClick={() => quickAction(m.id, 'delete')} className="px-2 py-1 bg-red-600 rounded text-sm">حذف</button>
                    <Link href={`/admin/member/${m.id}`} className="px-2 py-1 bg-white/6 rounded text-sm">تفاصيل</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="mt-4 flex items-center justify-between text-sm">
          <div>إجمالي: {count}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(Math.max(1, page - 1))} className="px-3 py-1 bg-white/6 rounded">السابق</button>
            <div>صفحة {page}</div>
            <button onClick={() => setPage(page + 1)} className="px-3 py-1 bg-white/6 rounded">التالي</button>
          </div>
        </footer>
      </div>
    </main>
  );
}