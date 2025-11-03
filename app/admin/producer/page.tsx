'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Producer = {
  id: string;
  full_name: string;
  whatsapp: string;
  country: string;
  province: string;
  city: string;
  address: string;
  usdt_trc20_link?: string | null;
  sham_cash_link?: string | null;
  sham_payment_code?: string | null;
  usdt_txid?: string | null;
  status?: string | null; // pending | approved | rejected
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: any;
};

export default function AdminProducerPage(): JSX.Element {
  const [rows, setRows] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & search & sort & pagination
  const [query, setQuery] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'country' | 'full_name'>('created_at');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [pageSize, setPageSize] = useState(15);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Selection and UI
  const [selected, setSelected] = useState<Producer | null>(null);
  const [editing, setEditing] = useState<Producer | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Producer | null>(null);
  const [batchSelection, setBatchSelection] = useState<Record<string, boolean>>({});
  const [showNotes, setShowNotes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filterCountry, filterStatus, sortBy, sortDir, page, pageSize]);

  async function fetchRows() {
    setLoading(true);
    setError(null);
    try {
      const offset = page * pageSize;
      // build base query
      let qb = supabase
        .from<Producer>('producer_members')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: sortDir === 'asc' })
        .range(offset, offset + pageSize - 1);

      // apply status filter
      if (filterStatus !== 'all') qb = qb.eq('status', filterStatus);

      // apply country filter server-side if provided
      if (filterCountry) qb = qb.eq('country', filterCountry);

      // server-side text filtering on full_name/whatsapp/city/province
      if (query && query.trim()) {
        const q = query.trim();
        // use ilike for basic text search on multiple columns; fallback to client-side if not supported
        qb = qb.or(`full_name.ilike.%${q}%,whatsapp.ilike.%${q}%,city.ilike.%${q}%,province.ilike.%${q}%`);
      }

      const { data, error, count } = await qb;
      if (error) throw error;
      setRows(data || []);
      setTotalCount(count ?? null);
    } catch (err: any) {
      console.error('fetchRows', err);
      setError(err.message || String(err));
      setRows([]);
      setTotalCount(null);
    } finally {
      setLoading(false);
    }
  }

  const countries = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => { if (r.country) s.add(r.country); });
    return Array.from(s).sort();
  }, [rows]);

  // Actions
  async function updateStatus(row: Producer, status: 'approved' | 'rejected' | 'pending') {
    try {
      const { error } = await supabase.from('producer_members').update({ status }).eq('id', row.id);
      if (error) throw error;
      setRows(prev => prev.map(p => p.id === row.id ? { ...p, status } : p));
    } catch (err: any) {
      console.error('updateStatus', err);
      setError('فشل تحديث الحالة: ' + (err.message || String(err)));
    }
  }

  async function deleteRow(row: Producer) {
    try {
      const { error } = await supabase.from('producer_members').delete().eq('id', row.id);
      if (error) throw error;
      setRows(prev => prev.filter(p => p.id !== row.id));
      setConfirmDelete(null);
    } catch (err: any) {
      console.error('deleteRow', err);
      setError('فشل حذف السجل: ' + (err.message || String(err)));
    }
  }

  async function saveEdit(edited: Producer) {
    try {
      const payload = {
        full_name: edited.full_name,
        whatsapp: edited.whatsapp,
        country: edited.country,
        province: edited.province,
        city: edited.city,
        address: edited.address,
        usdt_trc20_link: edited.usdt_trc20_link ?? null,
        sham_cash_link: edited.sham_cash_link ?? null,
        sham_payment_code: edited.sham_payment_code ?? null,
        usdt_txid: edited.usdt_txid ?? null,
        status: edited.status ?? 'pending',
        notes: edited.notes ?? null,
      };
      const { error } = await supabase.from('producer_members').update(payload).eq('id', edited.id);
      if (error) throw error;
      setRows(prev => prev.map(p => p.id === edited.id ? { ...p, ...payload } as Producer : p));
      setEditing(null);
    } catch (err: any) {
      console.error('saveEdit', err);
      setError('فشل حفظ التعديل: ' + (err.message || String(err)));
    }
  }

  // Batch actions
  function toggleSelect(id: string) {
    setBatchSelection(s => ({ ...s, [id]: !s[id] }));
  }

  async function batchApprove() {
    const ids = Object.keys(batchSelection).filter(id => batchSelection[id]);
    if (ids.length === 0) return setError('لم يتم اختيار أي عناصر');
    setLoading(true);
    try {
      const { error } = await supabase.from('producer_members').update({ status: 'approved' }).in('id', ids);
      if (error) throw error;
      setRows(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'approved' } : p));
      setBatchSelection({});
    } catch (err: any) {
      console.error('batchApprove', err);
      setError('فشل تنفيذ العملية: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  async function batchReject() {
    const ids = Object.keys(batchSelection).filter(id => batchSelection[id]);
    if (ids.length === 0) return setError('لم يتم اختيار أي عناصر');
    setLoading(true);
    try {
      const { error } = await supabase.from('producer_members').update({ status: 'rejected' }).in('id', ids);
      if (error) throw error;
      setRows(prev => prev.map(p => ids.includes(p.id) ? { ...p, status: 'rejected' } : p));
      setBatchSelection({});
    } catch (err: any) {
      console.error('batchReject', err);
      setError('فشل تنفيذ العملية: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  }

  // UI helpers
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : null;

  function clearError() { setError(null); }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#041018] via-[#07121a] to-[#031017] text-white antialiased p-6">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">لوحة إدارة أعضاء المنتج</h1>
            <p className="text-sm text-white/70 mt-1">مرّقبة ومصممة كواجهة استخباراتية لإدارة الطلبات، فلترة، وتعديل السجلات.</p>
          </div>

          <div className="w-full md:w-[620px]">
            <div className="flex gap-2">
              <input
                placeholder="ابحث باسم، واتساب، مدينة أو محافظة..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(0); }}
                className="flex-1 px-4 py-2 rounded-lg bg-[#07141a] border border-white/6 focus:outline-none focus:border-cyan-400"
              />
              <button onClick={() => fetchRows()} className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white">بحث</button>
            </div>
            <div className="mt-2 flex gap-2 items-center text-xs text-white/70">
              <div className="flex items-center gap-2">
                <label className="text-xs">الحالة</label>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as any); setPage(0); }} className="px-2 py-1 rounded bg-[#07141a] border border-white/6">
                  <option value="all">الكل</option>
                  <option value="pending">قيد المراجعة</option>
                  <option value="approved">مقبول</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs">الدولة</label>
                <select value={filterCountry} onChange={(e) => { setFilterCountry(e.target.value); setPage(0); }} className="px-2 py-1 rounded bg-[#07141a] border border-white/6">
                  <option value="">الكل</option>
                  {countries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs">ترتيب</label>
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as any); setPage(0); }} className="px-2 py-1 rounded bg-[#07141a] border border-white/6">
                  <option value="created_at">التاريخ</option>
                  <option value="country">الدولة</option>
                  <option value="full_name">الاسم</option>
                </select>
                <button onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setPage(0); }} className="px-2 py-1 rounded bg-white/6">
                  {sortDir === 'desc' ? 'نزولاً' : 'صعوداً'}
                </button>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => { setPage(0); setPageSize(15); fetchRows(); }} className="px-2 py-1 rounded bg-white/6">تحديث</button>
                <button onClick={() => { setBatchSelection({}); setRows([]); fetchRows(); }} className="px-2 py-1 rounded bg-white/6">إعادة تحميل</button>
              </div>
            </div>
          </div>
        </header>

        {/* Batch Actions */}
        <div className="mb-4 flex gap-2 items-center">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={Object.values(batchSelection).length > 0 && Object.values(batchSelection).every(Boolean)}
              onChange={(e) => {
                if (e.target.checked) {
                  const map: Record<string, boolean> = {};
                  rows.forEach(r => { map[r.id] = true; });
                  setBatchSelection(map);
                } else {
                  setBatchSelection({});
                }
              }}
              className="form-checkbox h-4 w-4 text-cyan-500"
            />
            <span className="text-sm text-white/70">تحديد الكل</span>
          </div>

          <button onClick={batchApprove} className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-sm">قبول المحدد</button>
          <button onClick={batchReject} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm">رفض المحدد</button>
          <div className="text-sm text-white/70 ml-auto">إجمالي السجلات: <span className="font-medium">{totalCount ?? '-'}</span></div>
        </div>

        {/* Table */}
        <div className="bg-[#06161a] border border-white/6 rounded-lg overflow-hidden shadow-sm">
          <div className="grid grid-cols-12 gap-0 text-xs font-semibold px-4 py-3 border-b border-white/6 text-white/70">
            <div className="col-span-1 flex items-center">
              <span className="ml-2">#</span>
            </div>
            <div className="col-span-3">الاسم الثلاثي</div>
            <div className="col-span-2">واتساب</div>
            <div className="col-span-1">البلد</div>
            <div className="col-span-1">المحافظة</div>
            <div className="col-span-1">المدينة</div>
            <div className="col-span-1">الحالة</div>
            <div className="col-span-2 text-right">الإجراءات</div>
          </div>

          <div>
            {loading ? (
              <div className="p-8 text-center text-white/70">جاري التحميل...</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-white/60">لا توجد نتائج</div>
            ) : (
              rows.map((r, idx) => (
                <div key={r.id} className="grid grid-cols-12 gap-0 items-center px-4 py-3 border-b border-white/6 hover:bg-[#07181b]">
                  <div className="col-span-1 flex items-center gap-2">
                    <input type="checkbox" checked={!!batchSelection[r.id]} onChange={() => toggleSelect(r.id)} className="form-checkbox h-4 w-4 text-cyan-500" />
                    <span className="text-sm text-white/70">{page * pageSize + idx + 1}</span>
                  </div>

                  <div className="col-span-3">
                    <div className="text-sm font-medium">{r.full_name}</div>
                    <div className="text-xs text-white/60 mt-1 line-clamp-1">{r.address}</div>
                  </div>

                  <div className="col-span-2">
                    <a href={`https://wa.me/${String(r.whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-sm text-cyan-300 underline">{r.whatsapp}</a>
                  </div>

                  <div className="col-span-1 text-sm">{r.country || '—'}</div>
                  <div className="col-span-1 text-sm">{r.province || '—'}</div>
                  <div className="col-span-1 text-sm">{r.city || '—'}</div>

                  <div className="col-span-1">
                    <span className={`px-2 py-1 rounded text-xs ${r.status === 'approved' ? 'bg-green-700 text-white' : r.status === 'rejected' ? 'bg-red-700 text-white' : 'bg-yellow-700 text-black'}`}>
                      {r.status || 'pending'}
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <button onClick={() => { setSelected(r); setShowNotes(s => ({ ...s, [r.id]: true })); }} className="px-2 py-1 rounded bg-white/6 text-sm">عرض</button>
                    <button onClick={() => setEditing(r)} className="px-2 py-1 rounded bg-white/6 text-sm">تعديل</button>
                    <button onClick={() => updateStatus(r, r.status === 'approved' ? 'pending' : 'approved')} className="px-2 py-1 rounded bg-green-600 text-sm">
                      {r.status === 'approved' ? 'إلغاء قبول' : 'قبول'}
                    </button>
                    <button onClick={() => updateStatus(r, 'rejected')} className="px-2 py-1 rounded bg-red-600 text-sm">رفض</button>
                    <button onClick={() => setConfirmDelete(r)} className="px-2 py-1 rounded bg-white/6 text-sm">حذف</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <span>صفحة</span>
            <input type="number" min={0} value={page + 1} onChange={(e) => { const v = Number(e.target.value || 1); setPage(Math.max(0, v - 1)); }} className="w-16 px-2 py-1 rounded bg-[#07141a] border border-white/6 text-white/80" />
            <span>من</span>
            <span className="font-medium">{totalPages ?? '-'}</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} className="px-2 py-1 rounded bg-[#07141a] border border-white/6">
              <option value={10}>10</option>
              <option value={15}>15</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="px-3 py-1 rounded bg-white/6">السابق</button>
            <button disabled={totalPages !== null && page + 1 >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded bg-white/6">التالي</button>
          </div>
        </div>

        {/* Selected / Details Drawer */}
        {selected && (
          <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => { setSelected(null); setShowNotes({}); }} />
            <div className="relative w-full max-w-3xl bg-[#07181b] border border-white/6 rounded-lg p-4 shadow-xl z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">{selected.full_name}</h2>
                  <div className="text-sm text-white/70 mt-1">{selected.whatsapp}</div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setSelected(null); setShowNotes({}); }} className="px-3 py-1 rounded bg-white/6">إغلاق</button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/70">
                <div>
                  <div><strong>الدولة:</strong> {selected.country || '—'}</div>
                  <div><strong>المحافظة:</strong> {selected.province || '—'}</div>
                  <div><strong>المدينة:</strong> {selected.city || '—'}</div>
                  <div className="mt-2"><strong>العنوان:</strong> <div className="text-white/60">{selected.address || '—'}</div></div>
                </div>

                <div>
                  <div><strong>USDT TRC20:</strong> {selected.usdt_trc20_link ? <a className="text-cyan-300 underline" href={selected.usdt_trc20_link} target="_blank" rel="noreferrer">عرض</a> : '—'}</div>
                  <div><strong>شام كاش رابط:</strong> {selected.sham_cash_link ? <a className="text-cyan-300 underline" href={selected.sham_cash_link} target="_blank" rel="noreferrer">عرض</a> : '—'}</div>
                  <div><strong>رمز شام:</strong> {selected.sham_payment_code || '—'}</div>
                  <div><strong>TXID:</strong> {selected.usdt_txid || '—'}</div>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <button onClick={() => updateStatus(selected, 'approved')} className="px-3 py-2 rounded bg-green-600">قبول</button>
                <button onClick={() => updateStatus(selected, 'rejected')} className="px-3 py-2 rounded bg-red-600">رفض</button>
                <button onClick={() => setEditing(selected)} className="px-3 py-2 rounded bg-white/6">تعديل</button>
                <button onClick={() => setConfirmDelete(selected)} className="px-3 py-2 rounded bg-white/6">حذف</button>
              </div>

              <div className="mt-4">
                <label className="text-xs text-white/60">ملاحظات إدارية</label>
                <textarea value={selected.notes || ''} onChange={(e) => {
                  const v = e.target.value;
                  setSelected(s => s ? ({ ...s, notes: v }) : s);
                }} className="w-full mt-2 p-3 rounded bg-[#061215] border border-white/6 text-sm" rows={3} />
                <div className="mt-2 flex justify-end">
                  <button onClick={() => selected && saveEdit(selected)} className="px-3 py-2 rounded bg-cyan-600">حفظ الملاحظات</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setEditing(null)} />
            <div className="relative w-full max-w-2xl bg-[#06161a] border border-white/6 rounded-lg p-4 z-10 shadow-xl">
              <h3 className="text-lg font-bold mb-2">تعديل سجل العضو</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/70">الاسم الثلاثي</label>
                  <input value={editing.full_name} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>
                <div>
                  <label className="text-xs text-white/70">واتساب</label>
                  <input value={editing.whatsapp} onChange={(e) => setEditing({ ...editing, whatsapp: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>
                <div>
                  <label className="text-xs text-white/70">الدولة</label>
                  <input value={editing.country} onChange={(e) => setEditing({ ...editing, country: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>
                <div>
                  <label className="text-xs text-white/70">المحافظة</label>
                  <input value={editing.province} onChange={(e) => setEditing({ ...editing, province: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>
                <div>
                  <label className="text-xs text-white/70">المدينة</label>
                  <input value={editing.city} onChange={(e) => setEditing({ ...editing, city: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>
                <div>
                  <label className="text-xs text-white/70">العنوان</label>
                  <input value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>

                <div>
                  <label className="text-xs text-white/70">USDT TRC20</label>
                  <input value={editing.usdt_trc20_link || ''} onChange={(e) => setEditing({ ...editing, usdt_trc20_link: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>
                <div>
                  <label className="text-xs text-white/70">شام كاش رابط</label>
                  <input value={editing.sham_cash_link || ''} onChange={(e) => setEditing({ ...editing, sham_cash_link: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>

                <div>
                  <label className="text-xs text-white/70">رمز شام</label>
                  <input value={editing.sham_payment_code || ''} onChange={(e) => setEditing({ ...editing, sham_payment_code: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>
                <div>
                  <label className="text-xs text-white/70">معرف TXID</label>
                  <input value={editing.usdt_txid || ''} onChange={(e) => setEditing({ ...editing, usdt_txid: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-white/70">الحالة</label>
                  <select value={editing.status || 'pending'} onChange={(e) => setEditing({ ...editing, status: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6">
                    <option value="pending">قيد المراجعة</option>
                    <option value="approved">مقبول</option>
                    <option value="rejected">مرفوض</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-white/70">ملاحظات</label>
                  <textarea value={editing.notes || ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={3} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6"></textarea>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setEditing(null)} className="px-3 py-2 rounded bg-white/6">إلغاء</button>
                <button onClick={() => saveEdit(editing)} className="px-3 py-2 rounded bg-cyan-600">حفظ</button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDelete(null)} />
            <div className="relative w-full max-w-md bg-[#06161a] border border-white/6 rounded-lg p-4 z-10 shadow-xl">
              <h4 className="text-lg font-bold">تأكيد حذف السجل</h4>
              <p className="mt-2 text-sm text-white/70">هل أنت متأكد من حذف سجل: <span className="font-medium">{confirmDelete.full_name}</span>؟ لا يمكن التراجع عن هذه الخطوة.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setConfirmDelete(null)} className="px-3 py-2 rounded bg-white/6">إلغاء</button>
                <button onClick={() => deleteRow(confirmDelete)} className="px-3 py-2 rounded bg-red-600">حذف</button>
              </div>
            </div>
          </div>
        )}

        {/* Error Toast */}
        {error && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50">
            <div className="bg-red-700 text-white px-4 py-2 rounded shadow" onClick={clearError}>
              {error}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}