'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import 'leaflet/dist/leaflet.css';
import type { PostgrestResponse } from '@supabase/supabase-js';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

type Seeker = {
  id: string;
  name?: string | null;
  phone?: string | null;
  profession?: string | null;
  residence?: string | null;
  age?: number | null;
  certificate?: string | null;
  certificates?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  payment_code?: string | null;
  transaction_id?: string | null;
  status?: string | null; // 'pending' | 'approved' | 'rejected'
  approved?: boolean | null;
  created_at?: string | null;
  image_url?: string | null;
  location?: string | null; // "lat,lng"
  [key: string]: unknown;
};

export default function AdminSeekerForm() {
  const [rows, setRows] = useState<Seeker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'name'>('created_at');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [pageSize, setPageSize] = useState(15);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  const [selected, setSelected] = useState<Seeker | null>(null);
  const [editing, setEditing] = useState<Seeker | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Seeker | null>(null);
  const [batchSelection, setBatchSelection] = useState<Record<string, boolean>>({});
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchRows();
    return () => { document.body.style.overflow = ''; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filterStatus, sortBy, sortDir, page, pageSize]);

  // --- Fetch rows with correct query building and normalization ---
  async function fetchRows() {
    setLoading(true);
    setError(null);
    try {
      const offset = page * pageSize;

      let qb = supabase
        .from('seeker_requests')
        .select('*', { count: 'exact' })
        .order(sortBy, { ascending: sortDir === 'asc' })
        .range(offset, offset + pageSize - 1);

      if (filterStatus !== 'all') qb = qb.eq('status', filterStatus);

      if (query && query.trim()) {
        const q = query.trim();
        qb = qb.or(`name.ilike.%${q}%,phone.ilike.%${q}%,payment_code.ilike.%${q}%,transaction_id.ilike.%${q}%`);
      }

      const raw = await qb;
      const res = raw as PostgrestResponse<unknown>;
      const { data, error: qbError, count } = res;
      if (qbError) throw qbError;

      // Normalize data to Seeker[] safely
      let normalized: Seeker[] = [];
      if (!data) {
        normalized = [];
      } else if (Array.isArray(data)) {
        if (data.length > 0 && Array.isArray(data[0])) {
          normalized = (data as unknown as Seeker[][]).flat() as Seeker[];
        } else {
          normalized = data as unknown as Seeker[];
        }
      } else {
        normalized = [data as unknown as Seeker];
      }

      setRows(normalized);
      setTotalCount(typeof count === 'number' ? count : null);
    } catch (err: unknown) {
      console.error('fetchRows', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setRows([]);
      setTotalCount(null);
    } finally {
      setLoading(false);
    }
  }

  // --- Helpers ---
  function parseLocation(loc?: string | null) {
    if (!loc) return null;
    const parts = String(loc).split(',').map(s => s.trim());
    if (parts.length !== 2) return null;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  function setBusy(id: string, v: boolean) {
    setBusyIds(prev => ({ ...prev, [id]: v }));
  }

  // --- Single row operations (robust update with rollback) ---
  async function updateStatus(row: Seeker, status: 'approved' | 'rejected' | 'pending') {
    setError(null);
    if (!row?.id) return;
    if (busyIds[row.id]) return;
    setBusy(row.id, true);

    const approvedValue = status === 'approved' ? true : status === 'rejected' ? false : null;
    const prevRow = rows.find(r => r.id === row.id) ?? null;

    // optimistic update
    setRows(prev => prev.map(p => p.id === row.id ? { ...p, status, approved: approvedValue } : p));
    if (selected && selected.id === row.id) setSelected({ ...selected, status, approved: approvedValue });

    try {
      const payload: Partial<Seeker> = { status, approved: approvedValue };
      const res = await supabase
        .from('seeker_requests')
        .update(payload)
        .eq('id', row.id)
        .select()
        .maybeSingle();

      const { data, error } = res as { data?: Seeker | null; error?: Error | null };
      if (error) throw error;

      if (data) {
        setRows(prev => prev.map(p => p.id === row.id ? { ...p, ...data } : p));
        if (selected && selected.id === row.id) setSelected({ ...selected, ...data });
      }
    } catch (err: unknown) {
      console.error('updateStatus', err);
      // rollback to previous state
      if (prevRow) {
        setRows(prev => prev.map(p => p.id === prevRow.id ? prevRow : p));
        if (selected && selected.id === prevRow.id) setSelected(prevRow);
      }
      const msg = err instanceof Error ? err.message : String(err);
      setError('فشل تحديث الحالة: ' + msg);
    } finally {
      setBusy(row.id, false);
    }
  }

  async function deleteRow(row: Seeker) {
    setError(null);
    if (!row?.id) return;
    if (busyIds[row.id]) return;
    setBusy(row.id, true);
    try {
      const res = await supabase.from('seeker_requests').delete().eq('id', row.id);
      const { error } = res as { error?: Error | null };
      if (error) throw error;
      setRows(prev => prev.filter(p => p.id !== row.id));
      setConfirmDelete(null);
      if (selected && selected.id === row.id) setSelected(null);
    } catch (err: unknown) {
      console.error('deleteRow', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError('فشل حذف السجل: ' + msg);
    } finally {
      setBusy(row.id, false);
    }
  }

  async function saveEdit(edited: Seeker | null) {
    if (!edited) return;
    setError(null);
    if (!edited.id) return setError('السجل غير صالح');
    setBusy(edited.id, true);
    try {
      const payload: Partial<Seeker> = {
        name: edited.name ?? null,
        phone: edited.phone ?? null,
        profession: edited.profession ?? null,
        residence: edited.residence ?? null,
        age: edited.age ?? null,
        certificate: edited.certificate ?? edited.certificates ?? null,
        country: edited.country ?? null,
        province: edited.province ?? null,
        city: edited.city ?? null,
        payment_code: edited.payment_code ?? null,
        transaction_id: edited.transaction_id ?? null,
        status: edited.status ?? 'pending',
        approved: edited.status === 'approved' ? true : edited.status === 'rejected' ? false : null,
        image_url: edited.image_url ?? null,
        location: edited.location ?? null,
      };
      const res = await supabase
        .from('seeker_requests')
        .update(payload)
        .eq('id', edited.id)
        .select()
        .maybeSingle();

      const { data, error } = res as { data?: Seeker | null; error?: Error | null };
      if (error) throw error;

      if (data) {
        setRows(prev => prev.map(p => p.id === edited.id ? { ...p, ...data } as Seeker : p));
        if (selected && selected.id === edited.id) setSelected({ ...selected, ...data });
      } else {
        setRows(prev => prev.map(p => p.id === edited.id ? { ...p, ...payload } as Seeker : p));
        if (selected && selected.id === edited.id) setSelected({ ...selected, ...payload });
      }
      setEditing(null);
    } catch (err: unknown) {
      console.error('saveEdit', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError('فشل حفظ التعديل: ' + msg);
    } finally {
      setBusy(edited.id, false);
    }
  }

  // --- Batch operations (update both status and approved) ---
  async function batchApprove() {
    const ids = Object.keys(batchSelection).filter(id => batchSelection[id]);
    if (ids.length === 0) return setError('لم يتم اختيار أي عناصر');
    setLoading(true);
    setError(null);
    try {
      const payload: Partial<Seeker> = { status: 'approved', approved: true };
      const res = await supabase.from('seeker_requests').update(payload).in('id', ids);
      const { error } = res as { error?: Error | null };
      if (error) throw error;
      setRows(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...payload } : p));
      setBatchSelection({});
      if (selected && ids.includes(selected.id)) setSelected({ ...selected, ...payload });
    } catch (err: unknown) {
      console.error('batchApprove', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError('فشل تنفيذ العملية: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  async function batchReject() {
    const ids = Object.keys(batchSelection).filter(id => batchSelection[id]);
    if (ids.length === 0) return setError('لم يتم اختيار أي عناصر');
    setLoading(true);
    setError(null);
    try {
      const payload: Partial<Seeker> = { status: 'rejected', approved: false };
      const res = await supabase.from('seeker_requests').update(payload).in('id', ids);
      const { error } = res as { error?: Error | null };
      if (error) throw error;
      setRows(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...payload } : p));
      setBatchSelection({});
      if (selected && ids.includes(selected.id)) setSelected({ ...selected, ...payload });
    } catch (err: unknown) {
      console.error('batchReject', err);
      const msg = err instanceof Error ? err.message : String(err);
      setError('فشل تنفيذ العملية: ' + msg);
    } finally {
      setLoading(false);
    }
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : null;

  // --- Render ---
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#041018] via-[#07121a] to-[#031017] text-white p-6">
      <div className="max-w-[1400px] mx-auto px-4">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold">لوحة إدارة الباحثين</h1>
            <p className="text-sm text-white/70 mt-1">عرض مُركّز — الاسم، الهاتف، المدفوعات، الصورة والحالة.</p>
          </div>

          <div className="w-full md:w-[640px]">
            <div className="flex gap-2">
              <input
                placeholder="ابحث باسم، هاتف، رمز شام، أو TXID..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(0); }}
                className="flex-1 px-4 py-2 rounded-lg bg-[#07141a] border border-white/6"
              />
              <button onClick={() => fetchRows()} className="px-4 py-2 rounded-lg bg-cyan-600">بحث</button>
            </div>

            <div className="mt-2 flex gap-2 items-center text-xs text-white/70">
              <div className="flex items-center gap-2">
                <label className="text-xs">الحالة</label>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value as 'all' | 'pending' | 'approved' | 'rejected'); setPage(0); }} className="px-2 py-1 rounded bg-[#07141a] border border-white/6">
                  <option value="all">الكل</option>
                  <option value="pending">قيد المراجعة</option>
                  <option value="approved">مقبول</option>
                  <option value="rejected">مرفوض</option>
                </select>
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <label className="text-xs">ترتيب</label>
                <select value={sortBy} onChange={(e) => { setSortBy(e.target.value as 'created_at' | 'name'); setPage(0); }} className="px-2 py-1 rounded bg-[#07141a] border border-white/6">
                  <option value="created_at">التاريخ</option>
                  <option value="name">الاسم</option>
                </select>
                <button onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setPage(0); }} className="px-2 py-1 rounded bg-white/6">
                  {sortDir === 'desc' ? 'نزولاً' : 'صعوداً'}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={rows.length > 0 && Object.values(batchSelection).length > 0 && Object.values(batchSelection).every(Boolean)}
              onChange={(e) => {
                if (e.target.checked) {
                  const map: Record<string, boolean> = {};
                  rows.forEach(r => { if (r.id) map[r.id] = true; });
                  setBatchSelection(map);
                } else {
                  setBatchSelection({});
                }
              }}
              className="form-checkbox h-4 w-4 text-cyan-500"
            />
            <span className="text-sm text-white/70">تحديد الكل</span>
          </div>

          <button onClick={batchApprove} className="px-3 py-1 rounded bg-green-600 text-sm">قبول المحدد</button>
          <button onClick={batchReject} className="px-3 py-1 rounded bg-red-600 text-sm">رفض المحدد</button>
          <div className="text-sm text-white/70 ml-auto">إجمالي: <span className="font-medium">{totalCount ?? '-'}</span></div>
        </div>

        <div className="bg-[#06161a] border border-white/6 rounded-lg overflow-hidden shadow-sm">
          <div style={{ display: 'grid', gridTemplateColumns: '48px minmax(220px, 1fr) 160px 180px 180px 90px 110px 260px', gap: 0 }}>
            <div className="px-4 py-3 border-b border-white/6 text-xs font-semibold text-white/70 flex items-center">#</div>
            <div className="px-4 py-3 border-b border-white/6 text-xs font-semibold text-white/70 flex items-center">الاسم</div>
            <div className="px-4 py-3 border-b border-white/6 text-xs font-semibold text-white/70 flex items-center">الهاتف</div>
            <div className="px-4 py-3 border-b border-white/6 text-xs font-semibold text-white/70 flex items-center">شام كاش</div>
            <div className="px-4 py-3 border-b border-white/6 text-xs font-semibold text-white/70 flex items-center">USDT TXID</div>
            <div className="px-4 py-3 border-b border-white/6 text-xs font-semibold text-white/70 flex items-center justify-center">الصورة</div>
            <div className="px-4 py-3 border-b border-white/6 text-xs font-semibold text-white/70 flex items-center justify-center">الحالة</div>
            <div className="px-4 py-3 border-b border-white/6 text-xs font-semibold text-white/70 flex items-center justify-center">إجراءات</div>

            {loading ? (
              <div className="col-span-8 p-8 text-center text-white/70">جاري التحميل...</div>
            ) : rows.length === 0 ? (
              <div className="col-span-8 p-8 text-center text-white/60">لا توجد نتائج</div>
            ) : (
              rows.map((r, idx) => (
                <React.Fragment key={r.id}>
                  <div className="px-4 py-3 border-b border-white/6 flex items-center">{page * pageSize + idx + 1}</div>

                  <div className="px-4 py-3 border-b border-white/6 flex items-center">
                    <div className="text-sm font-medium">{r.name ?? '—'}</div>
                  </div>

                  <div className="px-4 py-3 border-b border-white/6 flex items-center text-sm">{r.phone ?? '—'}</div>

                  <div className="px-4 py-3 border-b border-white/6 flex items-center text-sm break-words">{r.payment_code ?? '—'}</div>

                  <div className="px-4 py-3 border-b border-white/6 flex items-center text-sm">
                    <div className="max-w-[180px] break-words whitespace-normal">{r.transaction_id ?? '—'}</div>
                  </div>

                  <div className="px-4 py-3 border-b border-white/6 flex items-center justify-center">
                    {r.image_url ? (
                      <img src={String(r.image_url)} alt="img" className="w-14 h-10 object-cover rounded cursor-pointer" onClick={() => setSelected(r)} />
                    ) : (
                      <div className="w-14 h-10 bg-white/5 rounded flex items-center justify-center text-xs">لا صورة</div>
                    )}
                  </div>

                  <div className="px-4 py-3 border-b border-white/6 flex items-center justify-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${r.status === 'approved' ? 'bg-green-700' : r.status === 'rejected' ? 'bg-red-700' : 'bg-yellow-600 text-black'}`}
                    >
                      {r.status ?? 'pending'}
                    </span>
                  </div>

                  <div className="px-4 py-3 border-b border-white/6 flex items-center justify-center">
                    <div className="flex flex-col md:flex-row items-center md:justify-center gap-2">
                      <button onClick={() => setSelected(r)} className="px-3 py-1 rounded bg-white/6 text-sm whitespace-nowrap">عرض</button>
                      <button onClick={() => setEditing(r)} className="px-3 py-1 rounded bg-white/6 text-sm whitespace-nowrap">تعديل</button>
                      <button
                        onClick={() => updateStatus(r, r.status === 'approved' ? 'pending' : 'approved')}
                        className="px-3 py-1 rounded bg-green-600 text-sm whitespace-nowrap"
                        disabled={Boolean(busyIds[r.id])}
                      >
                        {busyIds[r.id] ? '...' : (r.status === 'approved' ? 'إلغاء' : 'قبول')}
                      </button>
                      <button
                        onClick={() => updateStatus(r, 'rejected')}
                        className="px-3 py-1 rounded bg-red-600 text-sm whitespace-nowrap"
                        disabled={Boolean(busyIds[r.id])}
                      >
                        {busyIds[r.id] ? '...' : 'رفض'}
                      </button>
                      <button onClick={() => setConfirmDelete(r)} className="px-3 py-1 rounded bg-white/6 text-sm whitespace-nowrap">حذف</button>
                    </div>
                  </div>
                </React.Fragment>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <span>صفحة</span>
            <input
              type="number"
              min={1}
              value={page + 1}
              onChange={(e) => { const v = Math.max(1, Number(e.target.value || 1)); setPage(v - 1); }}
              className="w-16 px-2 py-1 rounded bg-[#07141a] border border-white/6 text-white/80"
            />
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

        {selected && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => { setSelected(null); }} />
            <div className="relative w-full max-w-4xl bg-[#07181b] border border-white/6 rounded-lg p-4 z-10 shadow-xl overflow-y-auto" style={{ maxHeight: '90vh' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold">{selected?.name ?? ''}</h2>
                  <div className="text-sm text-white/70 mt-1">{selected?.profession ?? ''}</div>
                </div>

                <div className="flex items-center gap-2">
                  <button onClick={() => { setSelected(null); }} className="px-3 py-1 rounded bg-white/6">إغلاق</button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <div className="bg-white/5 rounded overflow-hidden">
                    {selected?.image_url ? (
                      <img src={String(selected.image_url)} alt="image" className="w-full h-56 object-cover" />
                    ) : (
                      <div className="w-full h-56 flex items-center justify-center text-white/60">لا صورة</div>
                    )}
                  </div>

                  <div className="mt-3 text-sm text-white/70 space-y-1">
                    <div><strong>الاسم:</strong> {selected?.name ?? '—'}</div>
                    <div><strong>المهنة:</strong> {selected?.profession ?? '—'}</div>
                    <div><strong>مكان السكن:</strong> {selected?.residence ?? '—'}</div>
                    <div><strong>العمر:</strong> {selected?.age ?? '—'}</div>
                    <div><strong>الشهادة:</strong> {selected?.certificates ?? '—'}</div>
                    <div><strong>هاتف:</strong> {selected?.phone ?? '—'}</div>
                    <div><strong>الدولة:</strong> {selected?.country ?? '—'}</div>
                    <div><strong>المحافظة:</strong> {selected?.province ?? '—'}</div>
                    <div><strong>المدينة:</strong> {selected?.city ?? '—'}</div>
                    <div><strong>رمز شام كاش:</strong> {selected?.payment_code ?? '—'}</div>
                    <div><strong>معرف USDT:</strong> {selected?.transaction_id ?? '—'}</div>
                    <div><strong>الحالة:</strong> {selected?.status ?? 'pending'}</div>
                    <div><strong>إنشئ في:</strong> {selected?.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  {(() => {
                    const loc = parseLocation(selected?.location);
                    if (loc) {
                      return (
                        <div className="w-full h-64 rounded overflow-hidden border border-white/6">
                          <MapContainer
                            center={[loc.lat, loc.lng]}
                            zoom={13}
                            style={{ height: '100%', width: '100%' }}
                            scrollWheelZoom={false}
                          >
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[loc.lat, loc.lng]}>
                              <Popup>
                                {selected?.name ?? ''} <br /> {selected?.location ?? ''}
                              </Popup>
                            </Marker>
                          </MapContainer>
                        </div>
                      );
                    }
                    return <div className="flex items-center justify-center h-64 bg-white/5 rounded">لا توجد إحداثيات صحيحة للعرض</div>;
                  })()}

                  <div className="mt-4">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => selected && updateStatus(selected, 'approved')} className="px-3 py-2 rounded bg-green-600">قبول</button>
                      <button onClick={() => selected && updateStatus(selected, 'rejected')} className="px-3 py-2 rounded bg-red-600">رفض</button>
                      <button onClick={() => selected && setEditing(selected)} className="px-3 py-2 rounded bg-white/6">تعديل</button>
                      <button onClick={() => selected && setConfirmDelete(selected)} className="px-3 py-2 rounded bg-white/6">حذف</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setEditing(null)} />
            <div className="relative w-full max-w-2xl bg-[#06161a] border border-white/6 rounded-lg p-4 z-10 shadow-xl overflow-y-auto" style={{ maxHeight: '90vh' }}>
              <h3 className="text-lg font-bold mb-2">تعديل السجل</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/70">الاسم</label>
                  <input value={editing?.name ?? ''} onChange={(e) => setEditing({ ...(editing as Seeker), name: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>
                <div>
                  <label className="text-xs text-white/70">الهاتف</label>
                  <input value={editing?.phone ?? ''} onChange={(e) => setEditing({ ...(editing as Seeker), phone: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>

                <div>
                  <label className="text-xs text-white/70">المهنة</label>
                  <input value={editing?.profession ?? ''} onChange={(e) => setEditing({ ...(editing as Seeker), profession: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>

                <div>
                  <label className="text-xs text-white/70">مكان السكن</label>
                  <input value={editing?.residence ?? ''} onChange={(e) => setEditing({ ...(editing as Seeker), residence: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>

                <div>
                  <label className="text-xs text-white/70">العمر</label>
                  <input type="number" value={editing?.age ?? ''} onChange={(e) => setEditing({ ...(editing as Seeker), age: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>

                <div>
                  <label className="text-xs text-white/70">الشهادة</label>
                  <input value={editing?.certificate ?? ''} onChange={(e) => setEditing({ ...(editing as Seeker), certificate: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>

                <div>
                  <label className="text-xs text-white/70">الدولة</label>
                  <input value={editing?.country ?? ''} onChange={(e) => setEditing({ ...(editing as Seeker), country: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>
                <div>
                  <label className="text-xs text-white/70">المحافظة</label>
                  <input value={editing?.province ?? ''} onChange={(e) => setEditing({ ...(editing as Seeker), province: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>

                <div>
                  <label className="text-xs text-white/70">المدينة</label>
                  <input value={editing?.city ?? ''} onChange={(e) => setEditing({ ...(editing as Seeker), city: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs text-white/70">رمز شام كاش</label>
                  <input value={editing?.payment_code ?? ''} onChange={(e) => setEditing({ ...(editing as Seeker), payment_code: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-white/70">معرف USDT (TXID)</label>
                  <input value={editing?.transaction_id ?? ''} onChange={(e) => setEditing({ ...(editing as Seeker), transaction_id: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-white/70">الموقع (lat,lng)</label>
                  <input value={editing?.location ?? ''} onChange={(e) => setEditing({ ...(editing as Seeker), location: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-white/70">رابط الصورة</label>
                  <input value={editing?.image_url ?? ''} onChange={(e) => setEditing({ ...(editing as Seeker), image_url: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6" />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-white/70">الحالة</label>
                  <select value={editing?.status ?? 'pending'} onChange={(e) => setEditing({ ...(editing as Seeker), status: e.target.value })} className="w-full px-3 py-2 rounded bg-[#07141a] border border-white/6">
                    <option value="pending">قيد المراجعة</option>
                    <option value="approved">مقبول</option>
                    <option value="rejected">مرفوض</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setEditing(null)} className="px-3 py-2 rounded bg-white/6">إلغاء</button>
                <button onClick={() => saveEdit(editing)} className="px-3 py-2 rounded bg-cyan-600">حفظ</button>
              </div>
            </div>
          </div>
        )}

        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmDelete(null)} />
            <div className="relative w-full max-w-md bg-[#06161a] border border-white/6 rounded-lg p-4 z-10 shadow-xl">
              <h4 className="text-lg font-bold">تأكيد حذف السجل</h4>
              <p className="mt-2 text-sm text-white/70">هل أنت متأكد من حذف سجل: <span className="font-medium">{confirmDelete?.name ?? ''}</span>؟</p>
              <div className="mt-4 flex justify-end gap-2">
                <button onClick={() => setConfirmDelete(null)} className="px-3 py-2 rounded bg-white/6">إلغاء</button>
                <button onClick={() => confirmDelete && deleteRow(confirmDelete)} className="px-3 py-2 rounded bg-red-600">حذف</button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-50">
            <div className="bg-red-700 text-white px-4 py-2 rounded shadow" onClick={() => setError(null)}>
              {error}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}