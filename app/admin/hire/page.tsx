'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import 'leaflet/dist/leaflet.css';

const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

type Hire = {
  id: string;
  name?: string | null;
  phone?: string | null;
  salary?: number | null;
  profession?: string | null;
  hours?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  job_location?: string | null;
  location?: string | null; // preferred: "lat,lng"
  map_location?: string | null; // alternate name
  payment_code?: string | null;
  payment_id?: string | null;
  transaction_id?: string | null; // alternate
  approved?: boolean | null;
  created_at?: string | null;
  image_url?: string | null; // preferred
  image?: string | null; // alternate
  photo?: string | null; // alternate
  description?: string | null;
  certificates?: string | null;
  [key: string]: unknown;
};

/* ---------- Safe helpers (no any) ---------- */

function toStringSafe(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return null;
  }
}

function toNumberSafe(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function extractLatLng(obj: unknown): { lat: number; lng: number } | null {
  if (!isRecord(obj)) return null;
  const o = obj as Record<string, unknown>;
  const latKeys = ['lat', 'latitude', 'lat_val', 'latitud', '0'];
  const lngKeys = ['lng', 'longitude', 'lng_val', 'longitud', '1'];

  for (const lk of latKeys) {
    for (const rk of lngKeys) {
      const lat = toNumberSafe(o[lk]);
      const lng = toNumberSafe(o[rk]);
      if (lat !== null && lng !== null) return { lat, lng };
    }
  }

  // try common keys again explicitly
  const lat = toNumberSafe(o['lat']);
  const lng = toNumberSafe(o['lng']);
  if (lat !== null && lng !== null) return { lat, lng };

  return null;
}

/* ---------- Component ---------- */

export default function AdminHirePage() {
  const [hires, setHires] = useState<Hire[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Hire>>({});
  const [selected, setSelected] = useState<Hire | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'list'>('cards');
  const inputStyle = "w-full p-2 bg-gray-800 border border-cyan-500 rounded";

  /* Normalize a raw record into Hire without using any */
  const normalize = (rawIn: Record<string, unknown>): Hire => {
    const raw = rawIn ?? {};

    const imageCandidates = [
      toStringSafe(raw.image_url),
      toStringSafe(raw.image),
      toStringSafe(raw.photo),
      toStringSafe(raw.img),
      toStringSafe(raw.picture),
    ].filter(Boolean) as string[];

    const paymentId =
      toStringSafe(raw.payment_id) ??
      toStringSafe(raw.transaction_id) ??
      toStringSafe(raw.tx_id) ??
      toStringSafe(raw.usdt_id) ??
      null;

    const locationRaw =
      raw.location ??
      raw.map_location ??
      raw.map ??
      raw.latlng ??
      raw.mapLocation ??
      null;

    const locationObj = extractLatLng(locationRaw);
    const locationStr =
      typeof locationRaw === 'string'
        ? locationRaw
        : locationObj
        ? `${locationObj.lat},${locationObj.lng}`
        : null;

    const salaryVal = toNumberSafe(raw.salary) ?? toNumberSafe(raw.age) ?? null;

    return {
      id: String(raw.id ?? ''),
      name: toStringSafe(raw.name) ?? toStringSafe(raw.full_name) ?? toStringSafe(raw.title) ?? null,
      phone: toStringSafe(raw.phone) ?? toStringSafe(raw.mobile) ?? toStringSafe(raw.contact) ?? null,
      salary: salaryVal,
      profession: toStringSafe(raw.profession) ?? toStringSafe(raw.job_type) ?? null,
      certificates: toStringSafe(raw.certificates) ?? toStringSafe(raw.certs) ?? null,
      country: toStringSafe(raw.country) ?? null,
      province: toStringSafe(raw.province) ?? null,
      city: toStringSafe(raw.city) ?? null,
      job_location: toStringSafe(raw.address) ?? toStringSafe(raw.place) ?? null,
      location: locationStr,
      map_location: typeof locationRaw === 'string' ? locationRaw : null,
      payment_code: toStringSafe(raw.payment_code) ?? toStringSafe(raw.sham_code) ?? null,
      payment_id: paymentId ?? null,
      transaction_id: toStringSafe(raw.transaction_id) ?? null,
      approved: typeof raw.approved === 'boolean' ? raw.approved : null,
      created_at: toStringSafe(raw.created_at) ?? null,
      image_url: imageCandidates.length > 0 ? imageCandidates[0] : null,
      description: toStringSafe(raw.description) ?? toStringSafe(raw.details) ?? null,
      ...raw,
    } as Hire;
  };

  /* Fetch */
  const fetchHires = async (): Promise<void> => {
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from('hire_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 99999);

      if (error) throw error;
      const arr = Array.isArray(data) ? data : [];
      const normalized = arr.map((d) => normalize(d as Record<string, unknown>));
      setHires(normalized);
    } catch (err: unknown) {
      console.error('fetchHires error', err);
      const msg = err instanceof Error ? err.message : String(err);
      setMessage('خطأ في جلب البيانات: ' + msg);
      setHires([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHires();
    // intentionally stable dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Actions */
  const handleAction = async (id: string, action: 'approve' | 'reject' | 'delete'): Promise<void> => {
    setMessage(null);
    try {
      setLoading(true);
      if (action === 'delete') {
        if (!confirm('هل أنت متأكد أنك تريد حذف هذا السجل؟')) {
          setLoading(false);
          return;
        }
        const { error } = await supabase.from('hire_requests').delete().eq('id', id);
        if (error) throw error;
        setMessage('تم حذف السجل');
        await fetchHires();
        return;
      }
      const approved = action === 'approve' ? true : false;
      const { error } = await supabase.from('hire_requests').update({ approved }).eq('id', id);
      if (error) throw error;
      setMessage(approved ? 'تم قبول الطلب' : 'تم رفض الطلب');
      await fetchHires();
    } catch (err: unknown) {
      console.error('handleAction error', err);
      const msg = err instanceof Error ? err.message : String(err);
      setMessage('فشل الإجراء: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Hire): void => {
    setEditId(item.id);
    setEditData({ ...item });
    setMessage(null);
  };

  const saveEdit = async (): Promise<void> => {
    if (!editId) return;
    setMessage(null);
    try {
      setLoading(true);
      const payload: Record<string, unknown> = { ...editData };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '') payload[k] = null;
      });
      const { error } = await supabase.from('hire_requests').update(payload).eq('id', editId);
      if (error) throw error;
      setMessage('تم حفظ التعديلات');
      setEditId(null);
      await fetchHires();
    } catch (err: unknown) {
      console.error('saveEdit error', err);
      const msg = err instanceof Error ? err.message : String(err);
      setMessage('خطأ عند الحفظ: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  /* Location parsing */
  const parseLocation = (loc?: string | null) => {
    if (!loc) return null;
    const str = String(loc).trim();
    const parts = str.includes(',') ? str.split(',') : str.split(/\s+/);
    if (parts.length < 2) return null;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  };

  /* Filter & search */
  const filtered = hires
    .filter((item) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        String(item.name ?? '').toLowerCase().includes(q) ||
        String(item.profession ?? '').toLowerCase().includes(q) ||
        String(item.city ?? '').toLowerCase().includes(q) ||
        String(item.phone ?? '').toLowerCase().includes(q) ||
        String(item.payment_code ?? '').toLowerCase().includes(q) ||
        String(item.payment_id ?? '').toLowerCase().includes(q)
      );
    })
    .filter((item) => {
      const status = item.approved;
      if (filter === 'all') return true;
      if (filter === 'approved') return status === true;
      if (filter === 'rejected') return status === false;
      if (filter === 'pending') return status === null || status === undefined;
      return true;
    });

  /* Safe image helper */
  const safeImage = (url?: string | null) => {
    if (!url) return null;
    try {
      const u = String(url).trim();
      if (u.startsWith('http://') || u.startsWith('https://')) return decodeURI(u);
      if (u.startsWith('data:')) return u;
      return null;
    } catch {
      return null;
    }
  };

  /* ---------- Render ---------- */
  return (
    <main className="min-h-screen bg-[#0f172a] text-white p-6 font-sans">
      <header className="max-w-6xl mx-auto mb-6">
        <h1 className="text-3xl font-bold mb-4 text-center text-cyan-400">🧠 لوحة إدارة طلبات التوظيف</h1>

        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex gap-3 w-full md:w-2/3">
            <input
              type="text"
              placeholder="🔍 بحث (الاسم، المهنة، المدينة، الهاتف، رمز/معرّف الدفع)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-2 rounded bg-gray-900 text-white border border-cyan-500 w-full"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'approved' | 'pending' | 'rejected')}
              className="px-4 py-2 rounded bg-gray-900 text-white border border-cyan-500"
            >
              <option value="all">📋 عرض الكل</option>
              <option value="approved">✅ المقبولين</option>
              <option value="pending">⏳ بانتظار</option>
              <option value="rejected">❌ المرفوضين</option>
            </select>
          </div>

          <div className="flex gap-2 items-center mt-2 md:mt-0">
            <div className="text-sm text-gray-300 mr-2">طريقة العرض:</div>
            <button onClick={() => setViewMode('cards')} className={`px-3 py-1 rounded ${viewMode === 'cards' ? 'bg-cyan-600' : 'bg-gray-800'}`}>بطاقات</button>
            <button onClick={() => setViewMode('table')} className={`px-3 py-1 rounded ${viewMode === 'table' ? 'bg-cyan-600' : 'bg-gray-800'}`}>جدول</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-cyan-600' : 'bg-gray-800'}`}>قائمة</button>
          </div>
        </div>

        {message && <div className="mt-3 text-center text-sm text-yellow-300">{message}</div>}
      </header>

      <section className="max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center text-gray-300">جاري التحميل...</div>
        ) : (
          <>
            <div className="mb-3 text-sm text-gray-400">عدد السجلات: {hires.length} — المعروض: {filtered.length}</div>

            {viewMode === 'cards' && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map((item) => {
                  const image = safeImage(item.image_url ?? (item.image as string | undefined) ?? (item.photo as string | undefined));
                  return (
                    <article key={item.id} className="bg-gray-900 border border-cyan-700 rounded-lg p-4 shadow-lg flex flex-col">
                      <div className="flex items-start gap-4">
                        <div className="w-20 h-20 rounded overflow-hidden flex-shrink-0 bg-gray-800 border border-white/5">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={image} alt={(item.name ?? 'image')} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">لا صورة</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h2 className="text-lg font-semibold text-cyan-300 truncate">{item.name ?? '—'}</h2>
                          <div className="text-sm text-gray-300 mt-1 line-clamp-2">{item.profession ?? '—'}</div>
                          <div className="mt-2 text-xs text-gray-400 flex flex-wrap gap-2">
                            <span className="px-2 py-1 bg-white/3 rounded">{item.city ?? '—'}</span>
                            <span className="px-2 py-1 bg-white/3 rounded">{item.province ?? '—'}</span>
                            <span className={`px-2 py-1 rounded ${item.approved === true ? 'bg-green-700' : item.approved === false ? 'bg-red-700' : 'bg-yellow-700'}`}>
                              {item.approved === true ? 'مقبول' : item.approved === false ? 'مرفوض' : 'بانتظار'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 text-sm text-gray-300 space-y-1 flex-1">
                        <p><strong>📞</strong> {item.phone ?? '—'}</p>
                        <p><strong>💳</strong> {item.payment_code ?? item.payment_id ?? item.transaction_id ?? '—'}</p>
                      </div>

                      <div className="flex gap-2 mt-4">
                        <button onClick={() => handleAction(item.id, 'approve')} className="flex-1 bg-green-600 text-white px-3 py-1 rounded">قبول</button>
                        <button onClick={() => handleAction(item.id, 'reject')} className="flex-1 bg-yellow-500 text-white px-3 py-1 rounded">رفض</button>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleEdit(item)} className="flex-1 bg-blue-600 text-white px-3 py-1 rounded">تعديل</button>
                        <button onClick={() => setSelected(item)} className="flex-1 bg-cyan-600 text-white px-3 py-1 rounded">عرض التفاصيل</button>
                        <button onClick={() => handleAction(item.id, 'delete')} className="flex-1 bg-red-600 text-white px-3 py-1 rounded">حذف</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="space-y-3">
                {filtered.map((item) => {
                  const image = safeImage(item.image_url ?? (item.image as string | undefined) ?? (item.photo as string | undefined));
                  return (
                    <div key={item.id} className="bg-gray-900 border border-cyan-700 rounded-lg p-3 flex items-center gap-4">
                      <div className="w-16 h-16 rounded overflow-hidden bg-gray-800 border border-white/5">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt={(item.name ?? 'image')} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">لا صورة</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-semibold text-cyan-300">{item.name ?? '—'}</div>
                            <div className="text-sm text-gray-300">{item.profession ?? '—'}</div>
                          </div>
                          <div className="text-sm text-gray-400">{item.city ?? '—'}</div>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => setSelected(item)} className="bg-cyan-600 text-white px-3 py-1 rounded">تفاصيل</button>
                          <button onClick={() => handleEdit(item)} className="bg-blue-600 text-white px-3 py-1 rounded">تعديل</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'table' && (
              <div className="overflow-x-auto bg-gray-900 border border-cyan-700 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="p-2 text-left">#</th>
                      <th className="p-2 text-left">الصورة</th>
                      <th className="p-2 text-left">الاسم</th>
                      <th className="p-2 text-left">المهنة</th>
                      <th className="p-2 text-left">المدينة</th>
                      <th className="p-2 text-left">الهاتف</th>
                      <th className="p-2 text-left">رمز/معرّف الدفع</th>
                      <th className="p-2 text-left">الحالة</th>
                      <th className="p-2 text-left">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, idx) => {
                      const image = safeImage(item.image_url ?? (item.image as string | undefined) ?? (item.photo as string | undefined));
                      return (
                        <tr key={item.id} className="border-t border-gray-800">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">
                            {image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={image} alt={(item.name ?? 'image')} className="w-16 h-10 object-cover rounded" />
                            ) : (
                              <div className="w-16 h-10 bg-gray-800 rounded flex items-center justify-center text-xs text-gray-500">لا</div>
                            )}
                          </td>
                          <td className="p-2">{item.name ?? '—'}</td>
                          <td className="p-2">{item.profession ?? '—'}</td>
                          <td className="p-2">{item.city ?? '—'}</td>
                          <td className="p-2">{item.phone ?? '—'}</td>
                          <td className="p-2">{item.payment_code ?? item.payment_id ?? '—'}</td>
                          <td className="p-2">{item.approved === true ? '✅' : item.approved === false ? '❌' : '⏳'}</td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              <button onClick={() => handleAction(item.id, 'approve')} className="px-2 py-1 bg-green-600 rounded text-white text-xs">قبول</button>
                              <button onClick={() => handleAction(item.id, 'reject')} className="px-2 py-1 bg-yellow-500 rounded text-white text-xs">رفض</button>
                              <button onClick={() => setSelected(item)} className="px-2 py-1 bg-cyan-600 rounded text-white text-xs">تفاصيل</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* Edit modal */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditId(null)} />
          <div className="relative bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-3xl text-white overflow-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4 text-cyan-300">📝 تعديل طلب التوظيف</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" value={String(editData.name ?? '')} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className={inputStyle} placeholder="الاسم" />
              <input type="text" value={String(editData.phone ?? '')} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} className={inputStyle} placeholder="رقم الهاتف" />
              <input type="number" value={editData.salary ?? ''} onChange={(e) => setEditData({ ...editData, salary: e.target.value === '' ? null : parseInt(e.target.value, 10) })} className={inputStyle} placeholder="الراتب" />
              <input type="text" value={String(editData.profession ?? '')} onChange={(e) => setEditData({ ...editData, profession: e.target.value })} className={inputStyle} placeholder="المهنة" />
              <input type="text" value={String(editData.hours ?? '')} onChange={(e) => setEditData({ ...editData, hours: e.target.value })} className={inputStyle} placeholder="عدد ساعات العمل" />
              <input type="text" value={String(editData.country ?? '')} onChange={(e) => setEditData({ ...editData, country: e.target.value })} className={inputStyle} placeholder="الدولة" />
              <input type="text" value={String(editData.province ?? '')} onChange={(e) => setEditData({ ...editData, province: e.target.value })} className={inputStyle} placeholder="المحافظة" />
              <input type="text" value={String(editData.city ?? '')} onChange={(e) => setEditData({ ...editData, city: e.target.value })} className={inputStyle} placeholder="المدينة" />
              <input type="text" value={String(editData.job_location ?? '')} onChange={(e) => setEditData({ ...editData, job_location: e.target.value })} className={inputStyle} placeholder="مكان السكن" />
              <input type="text" value={String(editData.location ?? '')} onChange={(e) => setEditData({ ...editData, location: e.target.value })} className={inputStyle} placeholder="الموقع (lat,lng)" />
              <input type="text" value={String(editData.payment_code ?? '')} onChange={(e) => setEditData({ ...editData, payment_code: e.target.value })} className={inputStyle} placeholder="رمز الدفع شام كاش" />
              <input type="text" value={String(editData.payment_id ?? '')} onChange={(e) => setEditData({ ...editData, payment_id: e.target.value })} className={inputStyle} placeholder="معرّف الدفع USDT" />
              <input type="text" value={String(editData.image_url ?? '')} onChange={(e) => setEditData({ ...editData, image_url: e.target.value })} className={inputStyle} placeholder="رابط الصورة" />
              <textarea value={String(editData.description ?? '')} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className={inputStyle + ' h-24 col-span-1 md:col-span-2'} placeholder="الوصف" />
              <label className="flex items-center gap-2 text-sm col-span-1 md:col-span-2">
                <input type="checkbox" checked={!!editData.approved} onChange={(e) => setEditData({ ...editData, approved: e.target.checked })} />
                تمت الموافقة
              </label>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditId(null)} className="bg-gray-700 px-4 py-2 rounded">إلغاء</button>
              <button onClick={saveEdit} className="bg-cyan-600 text-white px-4 py-2 rounded">💾 حفظ</button>
            </div>
          </div>
        </div>
      )}

      {/* Details modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSelected(null)} />
          <div className="relative bg-gray-900 p-6 rounded-lg shadow-xl w-full max-w-5xl text-white overflow-auto max-h-[92vh]">
            <button onClick={() => setSelected(null)} className="absolute top-3 right-3 bg-white/5 px-3 py-1 rounded">✕</button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                {safeImage(selected.image_url ?? (selected.image as string | undefined) ?? (selected.photo as string | undefined)) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={safeImage(selected.image_url ?? (selected.image as string | undefined) ?? (selected.photo as string | undefined)) as string}
                    alt={selected.name ?? 'image'}
                    className="w-full h-64 object-cover rounded border border-white/10 mb-3"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-800 rounded border border-white/10 mb-3 flex items-center justify-center text-gray-500">لا توجد صورة</div>
                )}

                <div className="text-sm text-gray-300 space-y-2">
                  <p><strong>الاسم:</strong> <span className="text-white/90 ml-2">{selected.name ?? '—'}</span></p>
                  <p><strong>الهاتف:</strong> <span className="text-white/90 ml-2">{selected.phone ?? '—'}</span></p>
                  <p><strong>الراتب:</strong> <span className="text-white/90 ml-2">{selected.salary ?? '—'}</span></p>
                  <p><strong>المهنة:</strong> <span className="text-white/90 ml-2">{selected.profession ?? '—'}</span></p>
                  <p><strong>عدد ساعات العمل:</strong> <span className="text-white/90 ml-2">{selected.hours ?? '—'}</span></p>
                  <p><strong>مكان السكن:</strong> <span className="text-white/90 ml-2">{selected.job_location ?? '—'}</span></p>
                  <p><strong>الدولة:</strong> <span className="text-white/90 ml-2">{selected.country ?? '—'}</span></p>
                  <p><strong>المحافظة:</strong> <span className="text-white/90 ml-2">{selected.province ?? '—'}</span></p>
                  <p><strong>المدينة:</strong> <span className="text-white/90 ml-2">{selected.city ?? '—'}</span></p>
                </div>
              </div>

              <div>
                <div className="mb-3">
                  <p className="text-sm text-gray-400"><strong>الوصف:</strong></p>
                  <div className="mt-2 p-3 bg-gray-800 rounded text-sm text-gray-200">{selected.description ?? '—'}</div>
                </div>

                <div className="mb-3">
                  <p className="text-sm text-gray-400"><strong>الموقع على الخريطة:</strong></p>
                  <div className="mt-2">
                    {(() => {
                      const loc = parseLocation(selected.location);
                      return loc ? (
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
                                {selected.name ?? ''} <br /> {selected.location ?? ''}
                              </Popup>
                            </Marker>
                          </MapContainer>
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-800 rounded text-sm text-gray-400">لا توجد إحداثيات صحيحة للعرض</div>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleAction(selected.id, 'approve')} className="px-3 py-2 bg-green-600 rounded text-white">قبول</button>
                  <button onClick={() => handleAction(selected.id, 'reject')} className="px-3 py-2 bg-yellow-500 rounded text-white">رفض</button>
                  <button onClick={() => setEditId(selected.id)} className="px-3 py-2 bg-blue-600 rounded text-white">تعديل</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}