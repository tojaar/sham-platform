'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// fix leaflet icons for bundlers
if (typeof window !== 'undefined') {
  try {
    delete (L.Icon.Default as any).prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
      iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
      shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
    });
  } catch {}
}

function MapClick({ setCoords }: { setCoords: (c: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

const toCSV = (rows: any[]) => {
  if (!rows || rows.length === 0) return '';
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(',')].concat(
    rows.map((r) =>
      keys
        .map((k) => {
          const v = r[k] ?? '';
          const s = typeof v === 'string' ? v.replace(/"/g, '""') : String(v);
          return "${s}";
        })
        .join(',')
    )
  );
  return csv.join('\n');
};

export default function AdminPostPage(): JSX.Element {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'compact'>('cards');

  const [page, setPage] = useState(1);
  const perPage = 18;

  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [mapKey, setMapKey] = useState(0);
  const mapRef = useRef<any>(null);

  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const fetchPosts = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPosts((data || []) as any[]);
    } catch (err: any) {
      setMessage('خطأ في جلب الإعلانات: ' + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const refresh = async () => {
    await fetchPosts();
    setSelectedIds({});
  };

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'delete') => {
    setMessage(null);
    try {
      if (action === 'delete') {
        const { error } = await supabase.from('ads').delete().eq('id', id);
        if (error) throw error;
      } else {
        const status = action === 'approve' ? true : false;
        const { error } = await supabase.from('ads').update({ approved: status }).eq('id', id);
        if (error) throw error;
      }
      await refresh();
      setMessage(action === 'delete' ? 'تم حذف الإعلان' : action === 'approve' ? 'تم قبول الإعلان' : 'تم رفض الإعلان');
    } catch (err: any) {
      setMessage('فشل الإجراء: ' + (err?.message ?? String(err)));
    }
  };

  const bulkAction = async (action: 'approve' | 'reject' | 'delete') => {
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
        const status = action === 'approve' ? true : false;
        const { error } = await supabase.from('ads').update({ approved: status }).in('id', ids);
        if (error) throw error;
      }
      await refresh();
      setMessage(`تم تنفيذ ${action} على ${ids.length} إعلان`);
    } catch (err: any) {
      setMessage('فشل الإجراء الجماعي: ' + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: any) => {
    setEditId(item.id);
    setEditData({
      ...item,
      location_lat: item.location_lat ?? item.lat ?? null,
      location_lng: item.location_lng ?? item.lng ?? null,
    });
    setMapKey((k) => k + 1);
    setMessage(null);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setMessage(null);
    setLoading(true);
    try {
      const payload = { ...editData };
      if (payload.location_lat === '') payload.location_lat = null;
      if (payload.location_lng === '') payload.location_lng = null;
      const { error } = await supabase.from('ads').update(payload).eq('id', editId);
      if (error) throw error;
      setEditId(null);
      await refresh();
      setMessage('تم حفظ التعديلات');
    } catch (err: any) {
      setMessage('خطأ عند الحفظ: ' + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  };

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
          p.phone, // include phone in search
          p.payment_code,
          p.payment_id,
        ];
        return fields.some((f: any) => (f ?? '').toString().toLowerCase().includes(q));
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

  const exportCSV = () => {
    const csv = toCSV(filtered);
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
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((s) => ({ ...s, [id]: !s[id] }));
  };

  const setEditCoords = (c: { lat: number; lng: number }) => {
    setEditData((d: any) => ({ ...d, location_lat: c.lat, location_lng: c.lng }));
  };

  const fmt = (v: any) => {
    try {
      return new Date(v).toLocaleString();
    } catch {
      return String(v);
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
                setFilter(e.target.value as any);
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
            <div className="flex gap-2">
              <button onClick={() => setViewMode('cards')} className={`px-3 py-2 rounded ${viewMode === 'cards' ? 'bg-cyan-600' : 'bg-gray-800'}`}>
                بطاقات
              </button>
              <button onClick={() => setViewMode('table')} className={`px-3 py-2 rounded ${viewMode === 'table' ? 'bg-cyan-600' : 'bg-gray-800'}`}>
                جدول
              </button>
              <button onClick={() => setViewMode('compact')} className={`px-3 py-2 rounded ${viewMode === 'compact' ? 'bg-cyan-600' : 'bg-gray-800'}`}>
                مصغّر
              </button>
            </div>

            <div className="flex gap-2 ml-2">
              <button onClick={() => bulkAction('approve')} className="px-3 py-2 bg-green-600 rounded">قبول مجمّع</button>
              <button onClick={() => bulkAction('reject')} className="px-3 py-2 bg-yellow-500 rounded">رفض مجمّع</button>
              <button onClick={() => bulkAction('delete')} className="px-3 py-2 bg-red-600 rounded">حذف مجمّع</button>
            </div>

            <div className="ml-4">
              <button onClick={exportCSV} className="px-3 py-2 bg-indigo-600 rounded">تصدير CSV</button>
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
                          <img src={item.company_logo} alt="logo" className="w-12 h-12 object-contain rounded" />
                        ) : null}
                      </div>
                    </td>
                    <td className="p-2">{item.category}</td>
                    <td className="p-2">{item.price ?? '—'}</td>
                    <td className="p-2">{item.phone ?? '—'}</td>
                    <td className="p-2 text-xs">
                      {item.country ?? '—'} / {item.province ?? '—'} / {item.city ?? '—'}
                      <div className="mt-1 text-xxs">{`item.location_lat ? lat ${item.location_lat}, lng ${item.location_lng} : 'بدون إحداثيات'`}</div>
                    </td>
                    <td className="p-2 text-xs">{item.payment_code ?? '—'} / {item.payment_id ?? '—'}</td>
                    <td className="p-2">{item.approved === true ? '✅' : item.approved === false ? '❌' : '⏳'}</td>
                    <td className="p-2">{fmt(item.created_at)}</td>
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
                    {item.image_url ? <img src={item.image_url} alt="img" className="w-full h-full object-cover" /> : <div className="text-xs text-gray-400 p-2">لا صورة</div>}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-cyan-300">{item.name}</h2>
                      <div className="text-xs text-gray-400">{fmt(item.created_at)}</div>
                    </div>

                    <div className="text-sm text-gray-300 mt-2 space-y-1">
                      <div>💬 {item.description ?? '—'}</div>
                      <div>💰 {item.price ?? '—'}</div>
                      <div>📦 {item.category ?? '—'}</div>
                      <div>📞 {item.phone ?? '—'}</div>
                      <div>📍 {item.country ?? '—'} / {item.province ?? '—'} / {item.city ?? '—'}</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleAction(item.id, 'approve')} className="bg-green-600 px-3 py-1 rounded">قبول</button>
                  <button onClick={() => handleAction(item.id, 'reject')} className="bg-yellow-500 px-3 py-1 rounded">رفض</button>
                  <button onClick={() => handleEdit(item)} className="bg-blue-600 px-3 py-1 rounded">تعديل</button>
                  <button onClick={() => handleAction(item.id, 'delete')} className="bg-red-600 px-3 py-1 rounded">حذف</button>
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
                value={editData.name ?? ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="الاسم"
              />
              <input
                value={editData.category ?? ''}
                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="النوع"
              />
              <input
                value={editData.price ?? ''}
                onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="السعر"
              />
              <input
                value={editData.payment_code ?? ''}
                onChange={(e) => setEditData({ ...editData, payment_code: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="رمز الدفع"
              />
              <input
                value={editData.payment_id ?? ''}
                onChange={(e) => setEditData({ ...editData, payment_id: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="معرف الدفع"
              />
              <input
                value={editData.country ?? ''}
                onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="الدولة"
              />
              <input
                value={editData.province ?? ''}
                onChange={(e) => setEditData({ ...editData, province: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="المحافظة"
              />
              <input
                value={editData.city ?? ''}
                onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="المدينة"
              />
              <input
                value={editData.address ?? ''}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="العنوان"
              />
              {/* PHONE FIELD IN EDIT */}
              <input
                value={editData.phone ?? ''}
                onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="رقم الهاتف"
              />
              <input
                type="number"
                value={editData.location_lat ?? ''}
                onChange={(e) => setEditData({ ...editData, location_lat: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="Latitude"
              />
              <input
                type="number"
                value={editData.location_lng ?? ''}
                onChange={(e) => setEditData({ ...editData, location_lng: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                className="w-full p-2 bg-gray-800 border border-cyan-500 rounded"
                placeholder="Longitude"
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!editData.is_company}
                  onChange={(e) => setEditData({ ...editData, is_company: e.target.checked })}
                />
                شركة؟
              </label>
            </div>

            <textarea
              value={editData.description ?? ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="w-full mt-4 p-2 bg-gray-800 border border-cyan-500 rounded"
              placeholder="الوصف الكامل"
              rows={4}
            ></textarea>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="text-xs text-gray-300">صورة الإعلان</label>
                <input
                  type="text"
                  value={editData.image_url ?? ''}
                  onChange={(e) => setEditData({ ...editData, image_url: e.target.value })}
                  className="w-full p-2 mt-1 bg-gray-800 border border-cyan-500 rounded"
                  placeholder="رابط الصورة"
                />
                <div className="mt-2 w-40 h-28 bg-[#06121a] rounded overflow-hidden flex items-center justify-center">
                  {editData.image_url ? <img src={editData.image_url} alt="img" className="w-full h-full object-contain" /> : <div className="text-xs text-gray-500">لا صورة</div>}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-300">شعار الشركة</label>
                <input
                  type="text"
                  value={editData.company_logo ?? ''}
                  onChange={(e) => setEditData({ ...editData, company_logo: e.target.value })}
                  className="w-full p-2 mt-1 bg-gray-800 border border-cyan-500 rounded"
                  placeholder="رابط الشعار"
                />
                <div className="mt-2 w-40 h-28 bg-[#06121a] rounded overflow-hidden flex items-center justify-center">
                  {editData.company_logo ? <img src={editData.company_logo} alt="logo" className="w-full h-full object-contain" /> : <div className="text-xs text-gray-500">لا شعار</div>}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-sm text-gray-300 mb-2">تحرير الموقع تفاعليًا (انقر على الخريطة لتعيين الإحداثيات)</div>
              <div className="w-full h-60 rounded overflow-hidden border border-cyan-600">
                <MapContainer key={mapKey} center={[editData.location_lat ?? 33.3128, editData.location_lng ?? 44.3615]} zoom={editData.location_lat ? 13 : 6} style={{ width: '100%', height: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapClick setCoords={setEditCoords} />
                  {editData.location_lat && editData.location_lng && <Marker position={[editData.location_lat, editData.location_lng]} />}
                </MapContainer>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditId(null)} className="bg-gray-700 px-4 py-2 rounded">إلغاء</button>
              <button onClick={saveEdit} className="bg-cyan-600 text-white px-4 py-2 rounded">💾 حفظ</button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}