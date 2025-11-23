/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { supabase } from '@/lib/supabase';
import type { Map as LeafletMap, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Ad = {
  id: string;
  name?: string;
  description?: string;
  category?: string;
  country?: string;
  province?: string;
  city?: string;
  address?: string;
  phone?: string;
  payment_code?: string;
  payment_id?: string;
  price?: number | string | null;
  image_url?: string;
  company_logo?: string;
  created_by?: string;
  created_at?: string | Date;
  approved?: boolean | null;
  is_company?: boolean;
  location_lat?: number | '' | null;
  location_lng?: number | '' | null;
};

// helper: convert rows to CSV
const toCSV = (rows: Array<Record<string, unknown>>): string => {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const header = keys.join(',');
  const body = rows
    .map((r) =>
      keys
        .map((k) => {
          const v = r[k] ?? '';
          return `"${(typeof v === 'string' ? v.replace(/"/g, '""') : String(v))}";`
        })
        .join(',')
    )
    .join('\n');
  return `${header}\n${body};`
};

// MapClick component to capture clicks and set coordinates
function MapClick({ setCoords }: { setCoords: (c: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function AdminPostForm() {
  const [posts, setPosts] = useState<Ad[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string | null>(null);

  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'compact'>('cards');

  const [page, setPage] = useState<number>(1);
  const perPage = 18;

  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Ad>>({});
  const [mapKey, setMapKey] = useState<number>(0);

  // mapRef holds the Leaflet Map instance for imperative actions
  const mapRef = useRef<LeafletMap | null>(null);

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  // handleMapCreated: typed callback for whenCreated to avoid implicit any
  const handleMapCreated = useCallback((mapInstance: LeafletMap) => {
    mapRef.current = mapInstance;
  }, []);

  // react to mapKey changes if needed (no mutable ref dependency)
  useEffect(() => {
    // placeholder: mapKey can be used to force recreation
  }, [mapKey]);

  // Load marker icon assets for Leaflet (avoid missing icons)
  useEffect(() => {
    (async () => {
      if (typeof window === 'undefined') return;
      try {
        const L = await import('leaflet');
        try {
          (L.Icon.Default as unknown as { mergeOptions: (o: Record<string, string>) => void }).mergeOptions({
            iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
            iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
            shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
          });
        } catch {
          // ignore merge failure
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPosts((data ?? []) as Ad[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage('خطأ في جلب الإعلانات: ' + msg);
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const refresh = useCallback(async () => {
    await fetchPosts();
    setSelectedIds({});
  }, [fetchPosts]);

  const handleAction = useCallback(
    async (id: string, action: 'approve' | 'reject' | 'delete') => {
      setMessage(null);
      try {
        if (action === 'delete') {
          const { error } = await supabase.from('ads').delete().eq('id', id);
          if (error) throw error;
        } else {
          const status = action === 'approve';
          const { error } = await supabase.from('ads').update({ approved: status }).eq('id', id);
          if (error) throw error;
        }
        await refresh();
        setMessage(action === 'delete' ? 'تم حذف الإعلان' : action === 'approve' ? 'تم قبول الإعلان' : 'تم رفض الإعلان');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMessage('فشل الإجراء: ' + msg);
        console.warn(err);
      }
    },
    [refresh]
  );

  const bulkAction = useCallback(
    async (action: 'approve' | 'reject' | 'delete') => {
      const ids = Object.keys(selectedIds).filter((k) => selectedIds[k]);
      if (ids.length === 0) {
        setMessage('حدد إعلانات لتنفيذ الإجراء الجماعي');
        return;
      }
      setMessage(null);
      setLoading(true);
      try {
        if (action === 'delete') {
          const { error } = await supabase.from('ads').delete().in('id', ids);
          if (error) throw error;
        } else {
          const status = action === 'approve';
          const { error } = await supabase.from('ads').update({ approved: status }).in('id', ids);
          if (error) throw error;
        }
        await refresh();
        setMessage(`م تنفيذ ${action} على ${ids.length} إعلان`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMessage('فشل الإجراء الجماعي: ' + msg);
        console.warn(err);
      } finally {
        setLoading(false);
      }
    },
    [selectedIds, refresh]
  );

  const handleEdit = useCallback((item: Ad) => {
    setEditId(item.id);
    setEditData({
      ...item,
      location_lat: item.location_lat ?? null,
      location_lng: item.location_lng ?? null,
    });
    setMapKey((k) => k + 1);
    setMessage(null);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editId) return;
    setMessage(null);
    setLoading(true);
    try {
      // prepare payload
      const payload: Record<string, unknown> = { ...editData };

      // Normalize empty strings to null for numeric/location fields
      if (payload.location_lat === '') payload.location_lat = null;
      if (payload.location_lng === '') payload.location_lng = null;
      if (payload.price === '') payload.price = null;

      // If price should be numeric in DB, convert strings that look like numbers
      if (typeof payload.price === 'string' && payload.price.trim() !== '' && !Number.isNaN(Number(payload.price))) {
        payload.price = Number(payload.price);
      }

      const { error } = await supabase.from('ads').update(payload).eq('id', editId);
      if (error) throw error;
      setEditId(null);
      await refresh();
      setMessage('تم حفظ التعديلات');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage('خطأ عند الحفظ: ' + msg);
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }, [editData, editId, refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts
      .filter((p) => {
        if (filter === 'approved') return p.approved === true;
        if (filter === 'pending') return p.approved === null || typeof p.approved === 'undefined';
        if (filter === 'rejected') return p.approved === false;
        return true;
      })
      .filter((p) => (categoryFilter === 'all' ? true : (p.category ?? '').toString() === categoryFilter))
      .filter((p) => {
        if (!q) return true;
        const fields = [
          p.name,
          p.description,
          p.category,
          p.country,
          p.province,
          p.city,
          p.phone,
          p.payment_code,
          p.payment_id,
        ];
        return fields.some((f) => (f ?? '').toString().toLowerCase().includes(q));
      });
  }, [posts, search, filter, categoryFilter]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    posts.forEach((p) => {
      if (p.category) s.add(p.category);
    });
    return ['all', ...Array.from(s)];
  }, [posts]);

  const paged = useMemo(() => {
    const start = (page - 1) * perPage;
    return filtered.slice(start, start + perPage);
  }, [filtered, page]);

  const exportCSV = useCallback(() => {
    const csv = toCSV(filtered as Array<Record<string, unknown>>);
    if (!csv) {
      setMessage('لا توجد بيانات للتصدير');
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ads_export_${new Date().toISOString()}.csv;`
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  const setEditCoords = useCallback((c: { lat: number; lng: number }) => {
    setEditData((d) => ({ ...d, location_lat: c.lat, location_lng: c.lng }));
  }, []);

  const fmt = (v: unknown): string => {
    try {
      const d = new Date(String(v));
      if (Number.isNaN(d.getTime())) return String(v ?? '');
      return d.toLocaleString();
    } catch {
      return String(v ?? '');
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-white p-6">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-cyan-300">🧠 لوحة إدارة الإعلانات</h1>
        <p className="text-sm text-gray-300 mt-1">إدارة كاملة لكل الإعلانات — معاينة، تعديل، استيراد وتصدير، وإجراءات مجمعة</p>
      </header>

      <section className="mb-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex gap-2 w-full md:w-2/3">
            <input
              className="w-full md:w-1/2 px-3 py-2 bg-gray-900 border border-cyan-500 rounded"
              placeholder="🔍 بحث شامل (الاسم، الوصف، المدفوعات، الهاتف...)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
            <select
              className="px-3 py-2 bg-gray-900 border border-cyan-500 rounded"
              value={filter}
              onChange={(e) => {
                const v = e.target.value as 'all' | 'approved' | 'pending' | 'rejected';
                setFilter(v);
                setPage(1);
              }}
            >
              <option value="all">📋 عرض الكل</option>
              <option value="approved">✅ المقبولة</option>
              <option value="pending">⏳ بانتظار</option>
              <option value="rejected">❌ المرفوضة</option>
            </select>

            <select
              className="px-3 py-2 bg-gray-900 border border-cyan-500 rounded"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'كل الفئات' : c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 rounded ${viewMode === 'cards' ? 'bg-cyan-600' : 'bg-gray-800'}`}
              >
                بطاقات
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 rounded ${viewMode === 'table' ? 'bg-cyan-600' : 'bg-gray-800'}`}
              >
                جدول
              </button>
              <button
                onClick={() => setViewMode('compact')}
                className={`px-3 py-2 rounded ${viewMode === 'compact' ? 'bg-cyan-600' : 'bg-gray-800'}`}
              >
                مصغّر
              </button>
            </div>

            <div className="flex gap-2 ml-2">
              <button onClick={() => bulkAction('approve')} className="px-3 py-2 bg-green-600 rounded">
                قبول مجمّع
              </button>
              <button onClick={() => bulkAction('reject')} className="px-3 py-2 bg-yellow-500 rounded">
                رفض مجمّع
              </button>
              <button onClick={() => bulkAction('delete')} className="px-3 py-2 bg-red-600 rounded">
                حذف مجمّع
              </button>
            </div>

            <div className="ml-4">
              <button onClick={exportCSV} className="px-3 py-2 bg-indigo-600 rounded">
                تصدير CSV
              </button>
            </div>
          </div>
        </div>
      </section>

      {message && <div className="mb-4 text-center text-yellow-300">{message}</div>}

      <section>
        {loading ? (
          <div className="text-center text-gray-300">جارٍ التحميل...</div>
        ) : viewMode === 'table' ? (
          <div className="overflow-auto bg-gray-900 rounded p-2">
            <table className="w-full table-auto text-sm">
              <thead>
                <tr className="text-left text-gray-300">
                  <th className="p-2">اختيار</th>
                  <th className="p-2">الاسم / الشركة</th>
                  <th className="p-2">فئة</th>
                  <th className="p-2">السعر</th>
                  <th className="p-2">الهاتف</th>
                  <th className="p-2">الموقع</th>
                  <th className="p-2">مدفوعات</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">تاريخ</th>
                  <th className="p-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((item) => (
                  <tr key={item.id} className="border-t border-gray-800 align-top">
                    <td className="p-2">
                      <input type="checkbox" checked={!!selectedIds[item.id]} onChange={() => toggleSelect(item.id)} />
                    </td>
                    <td className="p-2">
                      <div className="font-semibold text-cyan-300">{item.name}</div>
                      <div className="text-xs text-gray-400">{item.created_by}</div>
                      <div className="mt-1">
                        {item.company_logo ? (
                          <div className="w-12 h-12 relative overflow-hidden rounded">
                            <img src={item.company_logo} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                          </div>
                        ) : null}
                      </div>
                    </td>
                    <td className="p-2">{item.category}</td>
                    <td className="p-2">{item.price ?? '—'}</td>
                    <td className="p-2">{item.phone ?? '—'}</td>
                    <td className="p-2 text-xs">
                      {item.country ?? '—'} / {item.province ?? '—'} / {item.city ?? '—'}
                      <div className="mt-1 text-xxs">{item.location_lat != null && item.location_lng != null ? `lat ${item.location_lat}, lng ${item.location_lng}` : 'بدون إحداثيات'}</div>
                    </td>
                    <td className="p-2 text-xs">{item.payment_code ?? '—'} / {item.payment_id ?? '—'}</td>
                    <td className="p-2">{item.approved === true ? '✅' : item.approved === false ? '❌' : '⏳'}</td>
                    <td className="p-2">{fmt(item.created_at ?? '')}</td>
                    <td className="p-2 flex gap-2">
                      <button onClick={() => handleAction(item.id, 'approve')} className="px-2 py-1 bg-green-600 rounded text-sm">قبول</button>
                      <button onClick={() => handleAction(item.id, 'reject')} className="px-2 py-1 bg-yellow-500 rounded text-sm">رفض</button>
                      <button onClick={() => handleEdit(item)} className="px-2 py-1 bg-blue-600 rounded text-sm">تعديل</button>
                      <button onClick={() => handleAction(item.id, 'delete')} className="px-2 py-1 bg-red-600 rounded text-sm">حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'compact' ? (
          <div className="space-y-3">
            {paged.map((item) => (
              <div key={item.id} className="flex items-center justify-between bg-gray-900 p-3 rounded border border-cyan-700">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={!!selectedIds[item.id]} onChange={() => toggleSelect(item.id)} />
                  <div>
                    <div className="font-semibold text-cyan-300">{item.name}</div>
                    <div className="text-xs text-gray-400">{item.category} • {item.price ?? '—'}</div>
                    <div className="text-xs text-gray-400">📞 {item.phone ?? '—'}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAction(item.id, 'approve')} className="px-2 py-1 bg-green-600 rounded text-sm">✓</button>
                  <button onClick={() => handleEdit(item)} className="px-2 py-1 bg-blue-600 rounded text-sm">✎</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {paged.map((item) => (
              <div key={item.id} className="bg-gray-900 border border-cyan-700 rounded-lg p-4 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-[#06121a] rounded overflow-hidden flex items-center justify-center">
                    {item.image_url ? (
                      <div className="relative w-16 h-16">
                        <img src={item.image_url} alt="img" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 p-2">لا صورة</div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-cyan-300">{item.name}</h2>
                      <div className="text-xs text-gray-400">{fmt(item.created_at ?? '')}</div>
                    </div>

                    <div className="text-sm text-gray-300 mt-2 space-y-1">
                      <div>💬 {item.description ?? '—'}</div>
                      <div>💰 {item.price ?? '—'}</div>
                      <div>📦 {item.category ?? '—'}</div>
                      <div>📞 {item.phone ?? '—'}</div>
                      <div>📍 {item.country ?? '—'} / {item.province ?? '—'} / {item.city ?? '—'}</div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button onClick={() => handleAction(item.id, 'approve')} className="bg-green-600 px-3 py-1 rounded">قبول</button>
                      <button onClick={() => handleAction(item.id, 'reject')} className="bg-yellow-500 px-3 py-1 rounded">رفض</button>
                      <button onClick={() => handleEdit(item)} className="bg-blue-600 px-3 py-1 rounded">تعديل</button>
                      <button onClick={() => handleAction(item.id, 'delete')} className="bg-red-600 px-3 py-1 rounded">حذف</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 flex justify-between items-center">
        <div className="text-sm text-gray-400">إجمالي النتائج: {filtered.length}</div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 bg-gray-800 rounded">سابق</button>
          <div className="px-3 py-2 bg-gray-800 rounded">صفحة {page} من {Math.max(1, Math.ceil(filtered.length / perPage))}</div>
          <button onClick={() => setPage((p) => Math.min(Math.max(1, Math.ceil(filtered.length / perPage)), p + 1))} className="px-3 py-2 bg-gray-800 rounded">التالي</button>
        </div>
      </section>

      {editId && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex items-center justify-center p-4">
          <div className="bg-gray-900 p-6 rounded-lg w-full max-w-3xl overflow-auto max-h-[90vh] border border-cyan-600">
            <h2 className="text-xl font-bold text-cyan-300 mb-4">📝 تعديل الإعلان الكامل</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                value={String(editData.name ?? '')}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="الاسم"
              />
              <input
                value={String(editData.category ?? '')}
                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="النوع"
              />
              <input
                value={editData.price === null || editData.price === undefined ? '' : String(editData.price)}
                onChange={(e) => {
                  const v = e.target.value;
                  setEditData({ ...editData, price: v === '' ? '' : v });
                }}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="السعر"
              />
              <input
                value={String(editData.payment_code ?? '')}
                onChange={(e) => setEditData({ ...editData, payment_code: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="رمز الدفع"
              />
              <input
                value={String(editData.payment_id ?? '')}
                onChange={(e) => setEditData({ ...editData, payment_id: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="معرف الدفع"
              />
              <input
                value={String(editData.country ?? '')}
                onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="الدولة"
              />
              <input
                value={String(editData.province ?? '')}
                onChange={(e) => setEditData({ ...editData, province: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="المحافظة"
              />
              <input
                value={String(editData.city ?? '')}
                onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="المدينة"
              />
            </div>

            <input
              value={String(editData.address ?? '')}
              onChange={(e) => setEditData({ ...editData, address: e.target.value })}
              className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
              placeholder="العنوان"
            />
            <input
              value={String(editData.phone ?? '')}
              onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
              className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
              placeholder="رقم الهاتف"
            />
            <div className="grid grid-cols-2 gap-3 mt-3">
              <input
                type="number"
                value={editData.location_lat === null || editData.location_lat === undefined || editData.location_lat === '' ? '' : String(editData.location_lat)}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    location_lat: e.target.value === '' ? '' : parseFloat(e.target.value),
                  })
                }
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="Latitude"
              />
              <input
                type="number"
                value={editData.location_lng === null || editData.location_lng === undefined || editData.location_lng === '' ? '' : String(editData.location_lng)}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    location_lng: e.target.value === '' ? '' : parseFloat(e.target.value),
                  })
                }
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="Longitude"
              />
            </div>

            <label className="flex items-center gap-2 text-sm mt-3">
              <input
                type="checkbox"
                checked={!!editData.is_company}
                onChange={(e) => setEditData({ ...editData, is_company: e.target.checked })}
              />
              شركة؟
            </label>

            <textarea
              value={String(editData.description ?? '')}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="w-full mt-4 p-2 bg-gray-800 border border-cyan-500 rounded"
              placeholder="الوصف الكامل"
              rows={4}
            />

            <div className="mt-4">
              <div className="text-sm text-gray-300 mb-2">تحرير الموقع تفاعليًا (انقر على الخريطة لتعيين الإحداثيات)</div>
              <div className="w-full h-60 rounded overflow-hidden border border-cyan-600">
                <MapContainer
                  key={mapKey}
                  whenCreated={handleMapCreated}
                  center={[
                    editData.location_lat !== '' && editData.location_lat != null ? Number(editData.location_lat) : 33.3128,
                    editData.location_lng !== '' && editData.location_lng != null ? Number(editData.location_lng) : 44.3615,
                  ]}
                  zoom={editData.location_lat ? 13 : 6}
                  style={{ width: '100%', height: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapClick setCoords={setEditCoords} />
                  {editData.location_lat != null && editData.location_lng != null && editData.location_lat !== '' && editData.location_lng !== '' ? (
                    <Marker position={[Number(editData.location_lat), Number(editData.location_lng)] as [number, number]} />
                  ) : null}
                </MapContainer>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setEditId(null);
                  setEditData({});
                  setMessage(null);
                }}
                className="px-4 py-2 bg-gray-700 rounded"
              >
                إلغاء
              </button>
              <button onClick={saveEdit} className="px-4 py-2 bg-cyan-600 rounded">
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}