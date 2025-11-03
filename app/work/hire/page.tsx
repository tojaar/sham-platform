'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import 'leaflet/dist/leaflet.css';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY || '';

async function uploadToImgBB(file: File): Promise<string | null> {
  if (!IMGBB_KEY) {
    console.warn('ImgBB key missing (NEXT_PUBLIC_IMGBB_KEY)');
    return null;
  }

  // محاولة multipart/form-data أولاً
  try {
    const form = new FormData();
    form.append('image', file);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
      method: 'POST',
      body: form,
    });

    const json = await res.json();
    console.log('ImgBB multipart response:', json);

    if (!res.ok || json?.success === false) {
      const errMsg = json?.error?.message || json?.status?.error_message || `HTTP ${res.status};`;
      throw new Error(errMsg);
    }

    return json?.data?.display_url || json?.data?.url || null;
  } catch (e) {
    console.warn('Multipart upload failed, trying base64 fallback', e);
  }

  // محاولة fallback بصيغة base64
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const r = String(reader.result || '');
        const parts = r.split(',');
        resolve(parts[1] || '');
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const body = new URLSearchParams();
    body.append('key', IMGBB_KEY);
    body.append('image', base64);

    const res2 = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const json2 = await res2.json();
    console.log('ImgBB base64 response:', json2);

    if (!res2.ok || json2?.success === false) {
      const errMsg2 = json2?.error?.message || json2?.status?.error_message || `HTTP ${res2.status};`;
      throw new Error(errMsg2);
    }

    return json2?.data?.display_url || json2?.data?.url || null;
  } catch (err) {
    console.error('ImgBB upload failed completely:', err);
    return null;
  }
}

export default function HireForm() {
  const [form, setForm] = useState({
    job_type: '',
    phone: '',
    country: '',
    province: '',
    city: '',
    job_location: '',
    hours: '',
    salary: '',
    payment_code: '',
    transaction_id: '',
    description: '',
    image_url: '',
  });

  const [location, setLocation] = useState({ lat: 0, lng: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ملف محلي و preview
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) {
      try {
        const url = URL.createObjectURL(f);
        setPreviewUrl(url);
      } catch (err) {
        console.error('createObjectURL error', err);
        setPreviewUrl(null);
      }
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let imageUrl = form.image_url || null;

      // إذا تم اختيار ملف، ارفعه واحتفظ بالرابط
      if (file) {
        setMessage('⏳ جاري رفع الصورة...');
        const uploaded = await uploadToImgBB(file);
        if (!uploaded) {
          setMessage('❌ فشل رفع الصورة. تأكد من مفتاح ImgBB وحجم الصورة.');
          setLoading(false);
          return;
        }
        imageUrl = uploaded;
        setForm(prev => ({ ...prev, image_url: uploaded }));
        setMessage('✅ تم رفع الصورة');
      }

      const payload = {
        ...form,
        hours: parseInt(form.hours) || 0,
        map_location: `${location.lat},${location.lng}`,
        approved: null,
        expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        image_url: imageUrl,
      };

      const { error } = await supabase.from('hire_requests').insert([payload]);

      if (error) {
        console.error('❌ Supabase insert error:', error);
        alert('❌ فشل إرسال الإعلان: ' + error.message);
      } else {
        alert('📨 تم إرسال إعلان الوظيفة بنجاح');
        setForm({
          job_type: '',
          phone: '',
          country: '',
          province: '',
          city: '',
          job_location: '',
          hours: '',
          salary: '',
          payment_code: '',
          transaction_id: '',
          description: '',
          image_url: '',
        });
        setLocation({ lat: 0, lng: 0 });
        setFile(null);
        setPreviewUrl(null);
      }
    } catch (err: any) {
      console.error('❌ submit error', err);
      alert('❌ حدث خطأ أثناء الإرسال: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
      setMessage(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-white p-6 font-mono">
      <h1 className="text-3xl font-bold mb-6 text-center text-green-400">📋 نشر إعلان وظيفة</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
        {[
          ['job_type', '🧰 نوع الوظيفة'],
          ['phone', '📞 رقم الهاتف'],
          ['country', '🌍 الدولة'],
          ['province', '🏞 المحافظة'],
          ['city', '🏙 المدينة'],
          ['job_location', '🏢 مكان العمل'],
          ['hours', '⏱️ عدد الساعات'],
          ['salary', '💰 الراتب'],
          ['payment_code', '💳 رمز شام كاش'],
          ['transaction_id', '🧾 معرف USDT'],
        ].map(([key, label]) => (
          <label key={key} className="flex flex-col gap-1">
            <span className="text-green-300 font-bold">{label}</span>
            <input
              type={key === 'hours' ? 'number' : 'text'}
              value={(form as any)[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              required
              className="p-2 rounded bg-gray-800 border border-green-500 text-white"
            />
          </label>
        ))}

        <label className="flex flex-col gap-1 col-span-1 md:col-span-2">
          <span className="text-green-300 font-bold">📝 وصف العمل</span>
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={4}
            required
            className="p-2 rounded bg-gray-800 border border-green-500 text-white"
          />
        </label>

        {/* حقل رفع الصورة - الآن يخزن الملف محلياً ويعرض معاينة */}
        <label className="flex flex-col gap-1 col-span-1 md:col-span-2">
          <span className="text-green-300 font-bold">📷 صورة توضيحية (اختياري)</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="p-2 rounded bg-gray-800 border border-green-500 text-white"
          />
          {previewUrl && (
            <img src={previewUrl} alt="preview" className="mt-2 rounded max-h-48 object-cover" />
          )}
          {form.image_url && !previewUrl && (
            <p className="mt-2 text-sm text-gray-300 break-words">
              ✅ تم رفع الصورة سابقاً: <br />
              <a href={form.image_url} target="_blank" rel="noopener noreferrer" className="underline text-cyan-400">
                {form.image_url}
              </a>
            </p>
          )}
        </label>

        <div className="col-span-1 md:col-span-2">
          <label className="text-green-300 font-bold mb-2 block">📍 اختر الموقع على الخريطة</label>
          <MapPicker onSelect={(coords) => setLocation(coords)} />
          <p className="mt-2 text-sm text-gray-400">المختار: lat {location.lat}, lng {location.lng}</p>
        </div>

        <div className="col-span-1 md:col-span-2 flex justify-end mt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded"
          >
            {loading ? '⏳ جاري النشر...' : '📨 نشر الإعلان'}
          </button>
        </div>

        {message && (
          <div className="col-span-2 text-center text-sm text-yellow-300 mt-4">{message}</div>
        )}
      </form>
    </main>
  );
}