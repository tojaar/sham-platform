'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * استيراد Supabase ديناميكياً لتجنّب إنشاء العميل أثناء SSR/prerender.
 */
async function getSupabase() {
  const mod = await import('@/lib/supabase');
  return mod.supabase;
}

type Member = {
  id: string;
  full_name?: string | null;
  whatsapp?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  email?: string | null;
  user_id?: string | null;
  invite_code?: string | null;
  referrer_id?: string | null;
  referrer_code?: string | null;
  invitecodeself?: number | null;
  invite_code_self?: number | null;
  status?: string | null; // pending | approved | rejected
  created_at?: string | null;
  usdt_trc20?: string | null;
  shamcashlink?: string | null;
  sham_cash_link?: string | null;
  shampaymentcode?: string | null;
  sham_payment_code?: string | null;
  usdt_txid?: string | null;
  [key: string]: unknown;
};

type ViewMode = 'table' | 'cards' | 'hierarchy';

/* ---------- Helpers ---------- */

function toStringSafe(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return '';
  }
}

/* ---------- CSV helper ---------- */

const toCSV = (rows: Array<Record<string, unknown>>): string => {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const header = keys.join(',');
  const body = rows
    .map((r) =>
      keys
        .map((k) => {
          const v = r[k] ?? '';
          const cell = typeof v === 'string' ? v.replace(/"/g, '""') : String(v ?? '');
          return "${cell}";
        })
        .join(',')
    )
    .join('\n');
  return `${header}\n${body};`
};

/* ---------- Main Component ---------- */

export default function AdminProducerForm() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [referrerFilter, setReferrerFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortBy, setSortBy] = useState<{ key: keyof Member | 'createdat'; dir: 'asc' | 'desc' }>({ key: 'createdat', dir: 'desc' });

  // keep reference to setSortBy so linter doesn't warn about unused variable (no behavioral change)
  useEffect(() => {
    void setSortBy;
  }, [setSortBy]);

  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  const [editing, setEditing] = useState<Member | null>(null);
  const [detail, setDetail] = useState<Member | null>(null);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  /* Fetch members from supabase (client-side) */
  const fetchMembers = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('producer_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Normalize alternate field names so UI remains consistent
      const normalized = (Array.isArray(data) ? data : []).map((r: Record<string, unknown>) => {
        return {
          ...r,
          invite_code_self: r.invite_code_self ?? r.invitecodeself ?? null,
          sham_cash_link: r.sham_cash_link ?? r.shamcashlink ?? null,
          sham_payment_code: r.sham_payment_code ?? r.shampaymentcode ?? null,
        } as Member;
      });
      setMembers(normalized as Member[]);
    } catch (err: unknown) {
      console.error('fetchMembers error', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();

    // Optional realtime subscription; keep if you want live updates
    (async () => {
      try {
        const supabase = await getSupabase();
        const channel = supabase
          .channel('public:producer_members')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'producer_members' }, () => {
            fetchMembers();
          })
          .subscribe();

        // cleanup
        return () => {
          try {
            channel.unsubscribe();
          } catch {
            // ignore unsubscribe errors
          }
        };
      } catch {
        // ignore realtime setup errors
      }
    })();
  }, [fetchMembers]);

  /* Filters, pagination, export */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = members.slice();

    if (statusFilter !== 'all') result = result.filter(r => (r.status ?? 'pending') === statusFilter);
    if (countryFilter) result = result.filter(r => (r.country ?? '').toLowerCase() === countryFilter.toLowerCase());
    if (referrerFilter) result = result.filter(r => r.referrer_id === referrerFilter);

    if (q) {
      result = result.filter(m => {
        const fields = [
          m.full_name, m.email, m.whatsapp, m.country, m.province, m.city, m.address, m.invite_code, m.referrer_code
        ].map(s => toStringSafe(s).toLowerCase());
        return fields.some(f => f.includes(q));
      });
    }

    // sort safely
    result.sort((a: Member, b: Member) => {
      const key = sortBy.key;
      const aRaw = (a as Record<string, unknown>)[key as string];
      const bRaw = (b as Record<string, unknown>)[key as string];
      const aVal = toStringSafe(aRaw).toLowerCase();
      const bVal = toStringSafe(bRaw).toLowerCase();
      if (aVal === bVal) return 0;
      if (sortBy.dir === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return result;
  }, [members, query, statusFilter, countryFilter, referrerFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    setPage(p => Math.min(p, totalPages));
  }, [totalPages]);

  const pageData = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page]);

  const exportCSV = useCallback((rows: Member[]) => {
    const csv = toCSV(rows.map(r => {
      return {
        id: r.id ?? '',
        name: r.full_name ?? '',
        email: r.email ?? '',
        whatsapp: r.whatsapp ?? '',
        country: r.country ?? '',
        province: r.province ?? '',
        city: r.city ?? '',
        invite_code: r.invite_code ?? '',
        referrer_code: r.referrer_code ?? '',
        generation: r.invite_code_self ?? r.invitecodeself ?? '',
        status: r.status ?? '',
        created_at: r.created_at ?? '',
      } as Record<string, unknown>;
    }));
    if (!csv) {
      setError('لا توجد بيانات للتصدير');
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `producer_members_export_${new Date().toISOString()}.csv;`
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  /* Actions */

  const updateStatus = useCallback(async (id: string, status: 'approved' | 'rejected' | 'pending') => {
    try {
      setLoading(true);
      const supabase = await getSupabase();
      const { error } = await supabase.from('producer_members').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      await fetchMembers();
    } catch (err: unknown) {
      console.error('updateStatus error', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fetchMembers]);

  const deleteMember = useCallback(async (id: string) => {
    if (!confirm('هل متأكد من حذف هذا العضو نهائياً؟')) return;
    try {
      setLoading(true);
      const supabase = await getSupabase();
      const { error } = await supabase.from('producer_members').delete().eq('id', id);
      if (error) throw error;
      await fetchMembers();
    } catch (err: unknown) {
      console.error('deleteMember error', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [fetchMembers]);

  const saveEdit = useCallback(async (m: Member | null) => {
    if (!m) return;
    setSavingEdit(true);
    try {
      const supabase = await getSupabase();
      const patch: Record<string, unknown> = { ...m, updated_at: new Date().toISOString() };
      delete patch.id;
      const { error } = await supabase.from('producer_members').update(patch).eq('id', m.id);
      if (error) throw error;
      setEditing(null);
      await fetchMembers();
    } catch (err: unknown) {
      console.error('saveEdit error', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSavingEdit(false);
    }
  }, [fetchMembers]);

  // build 2-level hierarchy
  const hierarchy = useMemo(() => {
    const byId = new Map<string, Member>();
    members.forEach(m => { if (m.id) byId.set(m.id, m); });

    const direct = new Map<string, Member[]>();
    members.forEach(m => {
      const rid = m.referrer_id ?? '__none';
      if (!direct.has(rid)) direct.set(rid, []);
      direct.get(rid)!.push(m);
    });

    const roots: { member: Member; direct: Member[]; indirectMap: Map<string, Member[]> }[] = [];
    members.forEach(m => {
      const recruits = direct.get(m.id) ?? [];
      if (recruits.length === 0) return;
      const indirectMap = new Map<string, Member[]>();
      recruits.forEach(r => {
        indirectMap.set(r.id!, direct.get(r.id!) ?? []);
      });
      roots.push({ member: m, direct: recruits, indirectMap });
    });

    return roots;
  }, [members]);

  /* ---------- Render (UI) ---------- */

  return (
    <main className="min-h-screen bg-[#07121a] text-white p-6">
      <div className="max-w-full mx-auto">
        <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">لوحة إدارة المنتجين</h1>
            <p className="text-sm text-slate-300 mt-1">إدارة الطلبات، البحث، الفلاتر، القبول، الرفض، التعديل، الحذف وتصدير البيانات.</p>
          </div>

          <div className="flex gap-2 items-center">
            <div className="flex items-center gap-2 bg-[#021018] p-2 rounded">
              <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="ابحث بأي حقل..." className="px-3 py-2 rounded bg-[#07171b] border border-white/6 text-white w-72" />
              <button onClick={() => { setQuery(''); setPage(1); }} className="px-3 py-2 bg-[#0b2a2a] rounded text-white">مسح</button>
            </div>

            <div className="flex items-center gap-2">
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected'); setPage(1); }} className="px-3 py-2 border rounded bg-[#021018] text-white">
                <option value="all">كل الحالات</option>
                <option value="pending">قيد المراجعة</option>
                <option value="approved">مقبول</option>
                <option value="rejected">مرفوض</option>
              </select>

              <select value={countryFilter ?? ''} onChange={(e) => { setCountryFilter(e.target.value || null); setPage(1); }} className="px-3 py-2 border rounded bg-[#021018] text-white">
                <option value="">كل الدول</option>
                {Array.from(new Set(members.map(m => m.country).filter(Boolean) as string[])).sort().map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select value={referrerFilter ?? ''} onChange={(e) => { setReferrerFilter(e.target.value || null); setPage(1); }} className="px-3 py-2 border rounded bg-[#021018] text-white">
                <option value="">كل الداعين</option>
                {Array.from(new Map(members.filter(m => m.id && m.invite_code).map(m => [m.id!, `${m.full_name ?? '(no-name)'} — ${m.invite_code}`]))).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>

              <div className="flex items-center gap-1 border rounded bg-[#021018] px-2 text-white">
                <button onClick={() => setViewMode('table')} className={`px-2 py-1 ${viewMode === 'table' ? 'bg-[#08333b] rounded' : ''}`}>جدول</button>
                <button onClick={() => setViewMode('cards')} className={`px-2 py-1 ${viewMode === 'cards' ? 'bg-[#08333b] rounded' : ''}`}>بطاقات</button>
                <button onClick={() => setViewMode('hierarchy')} className={`px-2 py-1 ${viewMode === 'hierarchy' ? 'bg-[#08333b] rounded' : ''}`}>هرمي</button>
              </div>

              <button onClick={() => exportCSV(filtered)} className="px-3 py-2 bg-cyan-600 text-white rounded">تصدير CSV</button>
              <button onClick={() => fetchMembers()} className="px-3 py-2 bg-[#021018] border rounded text-white">تحديث</button>
            </div>
          </div>
        </header>

        <section className="bg-[#041018] rounded shadow p-4">
          {loading && <div className="text-sm text-white mb-2">جارٍ التحميل...</div>}
          {error && <div className="text-sm text-red-400 mb-2">{error}</div>}

          {viewMode === 'table' && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-300">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">الاسم</th>
                    <th className="px-3 py-2">البريد</th>
                    <th className="px-3 py-2">واتساب</th>
                    <th className="px-3 py-2">دولة</th>
                    <th className="px-3 py-2">كود</th>
                    <th className="px-3 py-2">داعي</th>
                    <th className="px-3 py-2">كود الدعوة الخاص</th>
                    <th className="px-3 py-2">حالة</th>
                    <th className="px-3 py-2">انشئت في</th>
                    <th className="px-3 py-2">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((m, idx) => (
                    <tr key={m.id} className="border-t border-[#082226]">
                      <td className="px-3 py-2 align-top">{(page - 1) * pageSize + idx + 1}</td>
                      <td className="px-3 py-2 align-top font-medium">{m.full_name ?? '—'}</td>
                      <td className="px-3 py-2 align-top">{m.email ?? '—'}</td>
                      <td className="px-3 py-2 align-top">{m.whatsapp ?? '—'}</td>
                      <td className="px-3 py-2 align-top">{m.country ?? '—'}</td>
                      <td className="px-3 py-2 align-top"><code className="bg-[#021a1a] px-2 py-1 rounded text-xs">{m.invite_code ?? '—'}</code></td>
                      <td className="px-3 py-2 align-top">{m.referrer_code ?? '-'}</td>
                      <td className="px-3 py-2 align-top">{m.invite_code_self ?? m.invitecodeself ?? '-'}</td>
                      <td className="px-3 py-2 align-top">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            m.status === 'approved'
                              ? 'bg-green-800/20 text-green-300'
                              : m.status === 'rejected'
                              ? 'bg-red-800/20 text-red-300'
                              : 'bg-yellow-800/20 text-yellow-300'
                          }`}
                        >
                          {m.status ?? 'pending'}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top">{m.created_at ? new Date(m.created_at).toLocaleString() : '-'}</td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex items-center gap-2">
                          {m.status !== 'approved' && <button title="قبول" onClick={() => updateStatus(m.id!, 'approved')} className="px-2 py-1 rounded bg-emerald-600 text-white text-xs">قبول</button>}
                          {m.status !== 'rejected' && <button title="رفض" onClick={() => updateStatus(m.id!, 'rejected')} className="px-2 py-1 rounded bg-rose-600 text-white text-xs">رفض</button>}
                          <button title="عرض كافة البيانات" onClick={() => setDetail(m)} className="px-2 py-1 rounded bg-sky-600 text-white text-xs">عرض</button>
                          <button title="تعديل" onClick={() => setEditing(m)} className="px-2 py-1 rounded bg-blue-600 text-white text-xs">تعديل</button>
                          <button title="حذف" onClick={() => deleteMember(m.id!)} className="px-2 py-1 rounded bg-gray-700 text-xs">حذف</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 flex items-center justify-between">
                <div className="text-sm text-slate-300">عرض {pageData.length} من {filtered.length} نتيجة</div>
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-1 border rounded bg-[#021018] text-slate-200">سابق</button>
                  <span className="text-sm">صفحة {page} / {totalPages}</span>
                  <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-1 border rounded bg-[#021018] text-slate-200">التالي</button>
                </div>
              </div>
            </div>
          )}

          {viewMode === 'cards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageData.map(m => (
                <div key={m.id} className="bg-[#021617] border rounded p-4 shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-white">{m.full_name ?? '—'}</div>
                      <div className="text-xs text-slate-300">{m.email ?? '—'}</div>
                      <div className="text-xs text-slate-300">{m.whatsapp ?? '—'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">#{m.invite_code ?? '-'}</div>
                      <div className="text-xs text-slate-400">{m.country ?? '-'}</div>
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-slate-300">{m.address ?? ''}</div>

                  <div className="mt-4 flex items-center gap-2">
                    {m.status !== 'approved' && <button onClick={() => updateStatus(m.id!, 'approved')} className="px-3 py-1 rounded bg-emerald-600 text-white text-sm">قبول</button>}
                    {m.status !== 'rejected' && <button onClick={() => updateStatus(m.id!, 'rejected')} className="px-3 py-1 rounded bg-rose-600 text-white text-sm">رفض</button>}
                    <button onClick={() => setEditing(m)} className="px-3 py-1 rounded bg-blue-600 text-white text-sm">تعديل</button>
                    <button onClick={() => deleteMember(m.id!)} className="px-3 py-1 rounded bg-gray-700 text-slate-200 text-sm">حذف</button>
                    <button onClick={() => setDetail(m)} className="px-3 py-1 rounded bg-sky-600 text-white text-sm">عرض</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'hierarchy' && (
            <div className="space-y-4">
              {hierarchy.length === 0 && <div className="text-sm text-slate-300">لا يوجد داعون لديهم أعضاء مرتبطون بعد.</div>}
              {hierarchy.map(root => (
                <div key={root.member.id} className="bg-[#021617] p-4 border rounded shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-white">{root.member.full_name ?? '—'} <span className="text-xs text-slate-400 ml-2">({root.member.invite_code ?? '-'})</span></div>
                      <div className="text-sm text-slate-300">{root.member.country ?? '-'}</div>
                    </div>
                    <div className="text-sm text-slate-300">Direct: {root.direct.length} • Indirect: {Array.from(root.indirectMap.values()).reduce((s, arr) => s + arr.length, 0)}</div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {root.direct.map(d => (
                      <div key={d.id} className="border rounded p-3 bg-[#071e1a]">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white">{d.full_name ?? '—'} <span className="text-xs text-slate-400">({d.invite_code ?? '-'})</span></div>
                            <div className="text-xs text-slate-300">{d.country ?? '-'}</div>
                          </div>
                          <div className="text-xs text-slate-300">Gen {d.invite_code_self ?? d.invitecodeself ?? '-'}</div>
                        </div>

                        <div className="mt-2 text-sm text-slate-300">Recruits:
                          <ul className="mt-2 list-disc pl-5 text-sm text-slate-300">
                            {(root.indirectMap.get(d.id) ?? []).map(ii => (
                              <li key={ii.id}>{ii.full_name ?? '—'} — {ii.country ?? '-'} <span className="text-xs text-slate-400">({ii.invite_code ?? '-'})</span></li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

        </section>

        <section className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-400">الصفحة {page} من {totalPages}</div>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} className="px-3 py-2 bg-gray-800 rounded">السابق</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="px-3 py-2 bg-gray-800 rounded">التالي</button>
          </div>
        </section>

        {/* Detail modal */}
        {detail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setDetail(null)} />
            <div className="relative max-w-3xl w-full bg-[#041018] border border-white/6 rounded-xl p-6 z-10 text-slate-100">
              <h2 className="text-xl font-bold mb-2">تفاصيل الطلب</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><div className="text-xs text-slate-300">الاسم</div><div className="font-medium">{detail.full_name ?? '-'}</div></div>
                <div><div className="text-xs text-slate-300">البريد</div><div className="font-medium">{detail.email ?? '-'}</div></div>
                <div><div className="text-xs text-slate-300">واتساب</div><div className="font-medium">{detail.whatsapp ?? '-'}</div></div>
                <div><div className="text-xs text-slate-300">الدولة</div><div className="font-medium">{detail.country ?? '-'}</div></div>
                <div><div className="text-xs text-slate-300">المحافظة</div><div className="font-medium">{detail.province ?? '-'}</div></div>
                <div><div className="text-xs text-slate-300">المدينة</div><div className="font-medium">{detail.city ?? '-'}</div></div>
                <div className="md:col-span-2"><div className="text-xs text-slate-300">العنوان</div><div className="font-medium">{detail.address ?? '-'}</div></div>

                <div><div className="text-xs text-slate-300">USDT TRC20</div><div className="font-medium">{detail.usdt_trc20 ?? '-'}</div></div>
                <div><div className="text-xs text-slate-300">شام كاش رابط</div><div className="font-medium">{detail.sham_cash_link ?? detail.shamcashlink ?? '-'}</div></div>
                <div><div className="text-xs text-slate-300">رمز شام كاش</div><div className="font-medium">{detail.sham_payment_code ?? detail.shampaymentcode ?? '-'}</div></div>
                <div><div className="text-xs text-slate-300">TXID</div><div className="font-medium">{detail.usdt_txid ?? '-'}</div></div>

                <div><div className="text-xs text-slate-300">كود الدعوة</div><div className="font-medium">{detail.invite_code ?? '-'}</div></div>
                <div><div className="text-xs text-slate-300">داعي (كود)</div><div className="font-medium">{detail.referrer_code ?? '-'}</div></div>
                <div><div className="text-xs text-slate-300">رمز الدعوة الخاص</div><div className="font-medium">{detail.invite_code_self ?? detail.invitecodeself ?? '-'}</div></div>
                <div><div className="text-xs text-slate-300">الحالة</div><div className="font-medium">{detail.status ?? 'pending'}</div></div>
                <div><div className="text-xs text-slate-300">معرف المستخدم</div><div className="font-medium">{detail.user_id ?? '-'}</div></div>
                <div><div className="text-xs text-slate-300">تاريخ الإنشاء</div><div className="font-medium">{detail.created_at ? new Date(detail.created_at).toLocaleString() : '-'}</div></div>
              </div>

              <div className="mt-5 flex items-center gap-2 justify-end">
                <button onClick={() => { setDetail(null); setEditing(detail); }} className="px-4 py-2 rounded bg-blue-600 text-white">تعديل</button>
                <button onClick={() => setDetail(null)} className="px-4 py-2 border rounded text-slate-200">إغلاق</button>
              </div>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setEditing(null)} />
            <div className="relative max-w-3xl w-full bg-[#041018] border border-white/6 rounded-xl p-6 z-10 text-slate-100">
              <h2 className="text-xl font-bold mb-3">تعديل العضو</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={editing.full_name ?? ''} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} className="px-3 py-2 bg-[#021617] border border-white/6 rounded text-slate-100" />
                <input value={editing.email ?? ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} className="px-3 py-2 bg-[#021617] border border-white/6 rounded text-slate-100" />
                <input value={editing.whatsapp ?? ''} onChange={(e) => setEditing({ ...editing, whatsapp: e.target.value })} className="px-3 py-2 bg-[#021617] border border-white/6 rounded text-slate-100" />
                <input value={editing.invite_code ?? ''} onChange={(e) => setEditing({ ...editing, invite_code: e.target.value })} className="px-3 py-2 bg-[#021617] border border-white/6 rounded text-slate-100" />
                <input value={editing.country ?? ''} onChange={(e) => setEditing({ ...editing, country: e.target.value })} className="px-3 py-2 bg-[#021617] border border-white/6 rounded text-slate-100" />
                <input value={editing.province ?? ''} onChange={(e) => setEditing({ ...editing, province: e.target.value })} className="px-3 py-2 bg-[#021617] border border-white/6 rounded text-slate-100" />
                <input value={editing.city ?? ''} onChange={(e) => setEditing({ ...editing, city: e.target.value })} className="px-3 py-2 bg-[#021617] border border-white/6 rounded text-slate-100" />
                <select value={editing.status ?? 'pending'} onChange={(e) => setEditing({ ...editing, status: e.target.value as 'pending' | 'approved' | 'rejected' })} className="px-3 py-2 bg-[#021617] border border-white/6 rounded text-slate-100">
                  <option value="pending">قيد المراجعة</option>
                  <option value="approved">مقبول</option>
                  <option value="rejected">مرفوض</option>
                </select>

                <textarea value={editing.address ?? ''} onChange={(e) => setEditing({ ...editing, address: e.target.value })} className="col-span-1 md:col-span-2 px-3 py-2 bg-[#021617] border border-white/6 rounded text-slate-100" />
                <input value={editing.usdt_trc20 ?? ''} onChange={(e) => setEditing({ ...editing, usdt_trc20: e.target.value })} className="px-3 py-2 bg-[#021617] border border-white/6 rounded text-slate-100" />
                <input value={editing.sham_cash_link ?? editing.shamcashlink ?? ''} onChange={(e) => setEditing({ ...editing, sham_cash_link: e.target.value })} className="px-3 py-2 bg-[#021617] border border-white/6 rounded text-slate-100" />
                <input value={editing.sham_payment_code ?? editing.shampaymentcode ?? ''} onChange={(e) => setEditing({ ...editing, sham_payment_code: e.target.value })} className="px-3 py-2 bg-[#021617] border border-white/6 rounded text-slate-100" />
                <input value={editing.usdt_txid ?? ''} onChange={(e) => setEditing({ ...editing, usdt_txid: e.target.value })} className="px-3 py-2 bg-[#021617] border border-white/6 rounded text-slate-100" />
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setEditing(null)} className="px-4 py-2 border rounded">إلغاء</button>
                <button onClick={() => saveEdit(editing)} disabled={savingEdit} className="px-4 py-2 bg-emerald-600 text-white rounded">{savingEdit ? 'جاري الحفظ...' : 'حفظ'}</button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8 text-center text-xs text-slate-400">© {new Date().getFullYear()} المنصة</footer>
      </div>
    </main>
  );
}