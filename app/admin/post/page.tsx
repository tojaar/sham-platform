'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminPostPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('ads').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setPosts(data || []);
    } catch (err: any) {
      setMessage('خطأ في جلب الإعلانات: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject' | 'delete') => {
    setMessage(null);
    try {
      if (action === 'delete') {
        const { error } = await supabase.from('ads').delete().eq('id', id);
        if (error) throw error;
      } else {
        const status = action === 'approve' ? true : false; // approve => true, reject => false
        const { error } = await supabase.from('ads').update({ approved: status }).eq('id', id);
        if (error) throw error;
      }
      await fetchPosts();
      setMessage(action === 'delete' ? 'تم حذف الإعلان' : action === 'approve' ? 'تم قبول الإعلان' : 'تم رفض الإعلان');
    } catch (err: any) {
      setMessage('فشل الإجراء: ' + (err.message || String(err)));
    }
  };

  const handleEdit = (item: any) => {
    setEditId(item.id);
    setEditData({ ...item });
    setMessage(null);
  };

  const saveEdit = async () => {
    if (!editId) return;
    setMessage(null);
    try {
      const payload = { ...editData };
      // Ensure numeric fields are correct types
      if (payload.location_lat === '') payload.location_lat = null;
      if (payload.location_lng === '') payload.location_lng = null;
      const { error } = await supabase.from('ads').update(payload).eq('id', editId);
      if (error) throw error;
      setEditId(null);
      await fetchPosts();
      setMessage('تم حفظ التعديلات');
    } catch (err: any) {
      setMessage('خطأ عند الحفظ: ' + (err.message || String(err)));
    }
  };

  const filtered = posts
    .filter((item) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (item.name || '').toString().toLowerCase().includes(q) 
        (item.description || '').toString().toLowerCase().includes(q) 
        (item.category || '').toString().toLowerCase().includes(q)
      );
    })
    .filter((item) => {
      if (filter === 'all') return true;
      if (filter === 'approved') return item.approved === true;
      if (filter === 'pending') return item.approved === null || typeof item.approved === 'undefined';
      if (filter === 'rejected') return item.approved === false;
      return true;
    });

  const inputStyle = "w-full p-2 bg-gray-800 border border-cyan-500 rounded";

  return (
    <main className="min-h-screen bg-[#0f172a] text-white p-6 font-mono">
      <h1 className="text-3xl font-bold mb-6 text-center text-cyan-400">🧠 لوحة استخبارات الإعلانات</h1>

      <div className="flex flex-col md:flex-row gap-4 mb-6 justify-center">
        <input
          type="text"
          placeholder="🔍 بحث استخباراتي"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 rounded bg-gray-900 text-white border border-cyan-500 w-full md:w-1/2"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}className="px-4 py-2 rounded bg-gray-900 text-white border border-cyan-500 w-full md:w-1/4"
        >
          <option value="all">📋 عرض الكل</option>
          <option value="approved">✅ المقبولة</option>
          <option value="pending">⏳ بانتظار الموافقة</option>
          <option value="rejected">❌ المرفوضة</option>
        </select>
      </div>

      {message && <div className="mb-4 text-center text-sm text-yellow-300">{message}</div>}
      {loading ? (
        <div className="text-center text-gray-300">جاري التحميل...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div key={item.id} className="bg-gray-900 border border-cyan-700 rounded-lg p-4 shadow-lg">
              <h2 className="text-xl font-bold text-cyan-300 mb-2">{item.name}</h2>
              <div className="text-sm text-gray-300 space-y-1">
                <p>💬 الوصف: {item.description}</p>
                <p>💰 السعر: {item.price}</p>
                <p>📦 النوع: {item.category}</p>
                <p>🌍 الدولة: {item.country}</p>
                <p>🏙 المحافظة: {item.province}</p>
                <p>🏘 المدينة: {item.city}</p>
                <p>📍 العنوان: {item.address}</p>
                <p>🧭 الموقع: lat {item.location_lat}, lng {item.location_lng}</p>
                <p>💳 رمز الدفع: {item.payment_code}</p>
                <p>🧾 معرف الدفع: {item.payment_id}</p>
                <p>🏢 شركة؟ {item.is_company ? 'نعم' : 'لا'}</p>
                <p>
                  📁 الحالة:{' '}
                  {item.approved === true ? '✅ مقبول' : item.approved === false ? '❌ مرفوض' : '⏳ بانتظار'}
                </p>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleAction(item.id, 'approve')}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  قبول
                </button>
                <button
                  onClick={() => handleAction(item.id, 'reject')}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  رفض
                </button>
                <button onClick={() => handleEdit(item)} className="bg-blue-600 text-white px-3 py-1 rounded">
                  تعديل
                </button>
                <button
                  onClick={() => handleAction(item.id, 'delete')}
                  className="bg-red-600 text-white px-3 py-1 rounded"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editId && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg shadow-xl border border-cyan-600 w-full max-w-2xl text-white overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-bold mb-4 text-cyan-300">📝 تعديل الإعلان الكامل</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={editData.name || ''}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                className={inputStyle}
                placeholder="الاسم"
              />
              <input
                type="text"
                value={editData.category || ''}
                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                className={inputStyle}
                placeholder="النوع"
              />
              <input
                type="text"
                value={editData.price || ''}
                onChange={(e) => setEditData({ ...editData, price: e.target.value })}className={inputStyle}
                placeholder="السعر"
              />
              <input
                type="text"
                value={editData.payment_code || ''}
                onChange={(e) => setEditData({ ...editData, payment_code: e.target.value })}
                className={inputStyle}
                placeholder="رمز الدفع"
              />
              <input
                type="text"
                value={editData.payment_id || ''}
                onChange={(e) => setEditData({ ...editData, payment_id: e.target.value })}
                className={inputStyle}
                placeholder="معرف الدفع"
              />
              <input
                type="text"
                value={editData.country || ''}
                onChange={(e) => setEditData({ ...editData, country: e.target.value })}
                className={inputStyle}
                placeholder="الدولة"
              />
              <input
                type="text"
                value={editData.province || ''}
                onChange={(e) => setEditData({ ...editData, province: e.target.value })}
                className={inputStyle}
                placeholder="المحافظة"
              />
              <input
                type="text"
                value={editData.city || ''}
                onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                className={inputStyle}
                placeholder="المدينة"
              />
              <input
                type="text"
                value={editData.address || ''}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                className={inputStyle}
                placeholder="العنوان"
              />
              <input
                type="number"
                value={editData.location_lat ?? ''}
                onChange={(e) => setEditData({ ...editData, location_lat: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                className={inputStyle}
                placeholder="Latitude"
              />
              <input
                type="number"
                value={editData.location_lng ?? ''}
                onChange={(e) => setEditData({ ...editData, location_lng: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                className={inputStyle}
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
              value={editData.description || ''}
              onChange={(e) => setEditData({ ...editData, description: e.target.value })}
              className="w-full mt-4 p-2 bg-gray-800 border border-cyan-500 rounded"
              placeholder="الوصف الكامل"
              rows={4}
            ></textarea>

            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setEditId(null)} className="bg-gray-700 px-4 py-2 rounded">
                إلغاء
              </button>
              <button onClick={saveEdit} className="bg-cyan-600 text-white px-4 py-2 rounded">
                💾 حفظ
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
}