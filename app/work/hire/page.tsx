// app/work/seeker/page.tsx
'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY ?? '';

async function getSupabase() {
  const mod = await import('@/lib/supabase');
  return mod.supabase;
}

/**
 * رفع صورة إلى ImgBB مع محاولة multipart ثم fallback إلى base64.
 * تُعيد رابط الصورة أو null عند الفشل.
 * تم تحسين المعالجة لتسجيل الأخطاء وإرجاع null عند فشل الشبكة بدلاً من رمي استثناء غير معالج.
 */
async function uploadToImgBB(file: File): Promise<string | null> {
  if (!IMGBB_KEY) {
    console.warn('ImgBB key missing (NEXT_PUBLIC_IMGBB_KEY)');
    return null;
  }

  // Helper: safe fetch with timeout
  const safeFetch = async (input: RequestInfo, init?: RequestInit, timeout = 15000) => {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      throw new Error('offline');
    }
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(input, { ...(init ?? {}), signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  // محاولة multipart/form-data أولاً
  try {
    const form = new FormData();
    form.append('image', file);

    const url = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(IMGBB_KEY)}`;

    const res = await safeFetch(url, {
      method: 'POST',
      body: form,
    });

    const json = await res.json().catch(() => null);
    console.log('ImgBB multipart response:', json);

    if (!res.ok || (json && json?.success === false)) {
      const errMsg = (json && (json?.error?.message ?? json?.status?.error_message)) ?? `HTTP ${res.status};`
      throw new Error(String(errMsg));
    }

    return (json && (json?.data?.display_url ?? json?.data?.url)) ?? null;
  } catch (e) {
    console.warn('Multipart upload failed, trying base64 fallback', e);
  }

  // محاولة fallback بصيغة base64
  try {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const r = String(reader.result ?? '');
        const parts = r.split(',');
        resolve(parts[1] ?? '');
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });

    const body = new URLSearchParams();
    body.append('key', IMGBB_KEY);
    body.append('image', base64);

    const res2 = await safeFetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const json2 = await res2.json().catch(() => null);
    console.log('ImgBB base64 response:', json2);

    if (!res2.ok || (json2 && json2?.success === false)) {
      const errMsg2 = (json2 && (json2?.error?.message ?? json2?.status?.error_message)) ?? `HTTP ${res2.status};`
      throw new Error(String(errMsg2));
    }

    return (json2 && (json2?.data?.display_url ?? json2?.data?.url)) ?? null;
  } catch (err) {
    console.error('ImgBB upload failed completely:', err);
    return null;
  }
}

type FormState = {
  job_type: string;
  phone: string;
  country: string;
  province: string;
  city: string;
  job_location: string;
  hours: string;
  salary: string;
  payment_code: string;
  transaction_id: string;
  description: string;
  image_url: string;
};

export default function HireForm() {
  const [form, setForm] = useState<FormState>({
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

  const [location, setLocation] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ملف محلي و preview
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // حالة اختيار وسيلة الدفع: 'sham' | 'usdt' | null
  const [selectedPayment, setSelectedPayment] = useState<'sham' | 'usdt' | null>(null);

  // روابط الدفع (نماذج مؤقتة — استبدلها بروابطك الحقيقية)
  const SHAM_LINK = 'https://shamcash.example.com/pay/ABC123';
  const USDT_LINK = 'https://usdt.example.com/tx/0xDEADBEEF';

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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

  // نسخ إلى الحافظة مع إشعار قصير
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage('تم النسخ');
      setTimeout(() => setMessage(null), 2000);
    } catch {
      setMessage('فشل النسخ');
      setTimeout(() => setMessage(null), 2000);
    }
  };

  // تبديل وسيلة الدفع مع مسح الحقول غير المطلوبة
  const togglePayment = (method: 'sham' | 'usdt') => {
    setSelectedPayment((prev) => {
      const next = prev === method ? null : method;
      setForm((s) => {
        if (next === 'sham') {
          // أغلق حقل USDT وامسحه
          return { ...s, transaction_id: '' };
        }
        if (next === 'usdt') {
          // أغلق حقل شام كاش وامسحه
          return { ...s, payment_code: '' };
        }
        return s;
      });
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let imageUrl: string | null = form.image_url ?? null;

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
        setForm((prev) => ({ ...prev, image_url: uploaded }));
        setMessage('✅ تم رفع الصورة');
      }

      const payload = {
        ...form,
        hours: parseInt(form.hours, 10) || 0,
        map_location: `${location.lat},${location.lng}`,
        approved: null,
        expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        image_url: imageUrl,
      };

      const supabase = await getSupabase();
      const { error } = await supabase.from('hire_requests').insert([payload]);

      if (error) {
        console.error('❌ Supabase insert error:', error);
        setMessage('❌ فشل إرسال الإعلان: ' + (error.message ?? String(error)));
      } else {
        setMessage('📨 تم إرسال إعلان الوظيفة بنجاح');
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
        setSelectedPayment(null);
      }
    } catch (err: unknown) {
      console.error('❌ submit error', err);
      const msg = err instanceof Error ? err.message : String(err ?? 'خطأ غير متوقع');
      // عرض رسالة مفيدة للمستخدم عند فشل الشبكة
      if (String(msg).toLowerCase().includes('failed to fetch') || String(msg).toLowerCase().includes('network')) {
        alert('❌ فشل الاتصال بالشبكة أثناء رفع الصورة أو إرسال البيانات. تحقق من اتصالك وحاول مرة أخرى.');
      } else if (String(msg).toLowerCase().includes('offline')) {
        alert('❌ يبدو أنك غير متصل بالإنترنت. تأكد من الاتصال وحاول مرة أخرى.');
      } else {
        alert('❌ حدث خطأ أثناء الإرسال: ' + msg);
      }
    } finally {
      setLoading(false);
      setMessage(null);
    }
  };

  const fields: Array<[keyof FormState, string]> = [
    ['job_type', '🧰 نوع الوظيفة'],
    ['phone', '📞 رقم الهاتف'],
    ['country', '🌍 الدولة'],
    ['province', '🏞 المحافظة'],
    ['city', '🏙 المدينة'],
    ['job_location', '🏢 مكان العمل'],
    ['hours', '⏱️ عدد الساعات'],
    ['salary', '💰 الراتب'],
    // payment fields are handled below with conditional visibility
    ['payment_code', '💳 رمز شام كاش 10,000 ل.س'],
    ['transaction_id', '🧾 معرف $1$ USDT'],
  ];

  return (
    <main className="min-h-screen bg-[#0f172a] text-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold text-green-400">📋 نشر إعلان وظيفة</h1>
          <p className="mt-2 text-sm text-gray-300">
            املأ الحقول أدناه لإرسال إعلان الوظيفة. سنراجع الإعلان ونوافيك بالنتيجة.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.slice(0, 8).map(([key, label]) => (
            <label key={String(key)} className="flex flex-col gap-1">
              <span className="text-green-300 font-semibold">{label}</span>
              <input
                type={key === 'hours' ? 'number' : 'text'}
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                required
                className="p-3 rounded bg-gray-800 border border-green-500 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </label>
          ))}

          <label className="flex flex-col gap-1 col-span-1 md:col-span-2">
            <span className="text-green-300 font-semibold">📝 وصف العمل</span>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              required
              className="p-3 rounded bg-gray-800 border border-green-500 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </label>

          {/* Map picker */}
          <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
            <span className="text-green-300 font-semibold">📍 تحديد موقع العمل (اختياري)</span>
            <div className="rounded overflow-hidden border border-green-600/20" style={{ minHeight: 200 }}>
              <MapPicker
                onSelect={(coords: { lat: number; lng: number } | null) => {
                  setLocation(coords ?? { lat: 0, lng: 0 });
                }}
              />
            </div>
            <div className="text-sm text-gray-300">الموقع الحالي: {location.lat},{location.lng}</div>
          </div>

          {/* Payment method buttons */}
          <div className="col-span-1 md:col-span-2 flex gap-3 items-center">
            <button
              type="button"
              onClick={() => togglePayment('sham')}
              className={`px-4 py-2 rounded ${selectedPayment === 'sham' ? 'bg-amber-400 text-black' : 'bg-gray-800 text-white border border-green-600/20'}`}
              aria-pressed={selectedPayment === 'sham'}
            >
              دفع شام كاش
            </button>

            <button
              type="button"
              onClick={() => togglePayment('usdt')}
              className={`px-4 py-2 rounded ${selectedPayment === 'usdt' ? 'bg-cyan-400 text-black' : 'bg-gray-800 text-white border border-green-600/20'}`}
              aria-pressed={selectedPayment === 'usdt'}
            >
              دفع USDT
            </button>
          </div>

          {/* Payment panels: only visible when selected */}
          {selectedPayment === 'sham' && (
            <div className="col-span-1 md:col-span-2 p-3 rounded bg-[#fff8ed] border border-green-600/10">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="font-bold text-[#7c2d12]">دفع شام كاش</div>
                  <div className="text-sm text-[#7c2d12] mt-1">
                    انسخ رابط شام ثم اتبع خطوات الدفع. بعد الدفع أدخل رمز الدفع في الحقل أدناه.
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(SHAM_LINK)}
                    className="px-3 py-1 rounded bg-white text-black font-semibold"
                  >
                    نسخ رابط شام
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <label className="flex flex-col gap-1">
                  <span className="text-green-300 font-semibold">💳 رمز دفع شام كاش</span>
                  <input
                    type="text"
                    value={form.payment_code}
                    onChange={(e) => handleChange('payment_code', e.target.value)}
                    placeholder="أدخل رمز الدفع هنا"
                    required
                    className="p-3 rounded bg-gray-800 border border-green-500 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </label>
              </div>
            </div>
          )}

          {selectedPayment === 'usdt' && (
            <div className="col-span-1 md:col-span-2 p-3 rounded bg-[#ecfeff] border border-green-600/10">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <div className="font-bold text-[#064e3b]">دفع USDT (TRC20)</div>
                  <div className="text-sm text-[#064e3b] mt-1">
                    انسخ رابط USDT أو العنوان ثم أرسل عبر شبكة TRC20. بعد التأكيد أدخل TXID في الحقل أدناه.
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(USDT_LINK)}
                    className="px-3 py-1 rounded bg-white text-black font-semibold"
                  >
                    نسخ رابط USDT
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <label className="flex flex-col gap-1">
                  <span className="text-green-300 font-semibold">🧾 معرف الدفع TXID</span>
                  <input
                    type="text"
                    value={form.transaction_id}
                    onChange={(e) => handleChange('transaction_id', e.target.value)}
                    placeholder="انسخ TXID هنا بعد الإرسال"
                    required
                    className="p-3 rounded bg-gray-800 border border-green-500 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  />
                </label>
              </div>
            </div>
          )}

          {/* If no payment selected, show both fields (user may paste manually) */}
          {selectedPayment === null && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-green-300 font-semibold">💳 رمز شام كاش 10,000 ل.س</span>
                <input
                  type="text"
                  value={form.payment_code}
                  onChange={(e) => handleChange('payment_code', e.target.value)}
                  className="p-3 rounded bg-gray-800 border border-green-500 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-green-300 font-semibold">🧾 معرف $1$ USDT</span>
                <input
                  type="text"
                  value={form.transaction_id}
                  onChange={(e) => handleChange('transaction_id', e.target.value)}
                  className="p-3 rounded bg-gray-800 border border-green-500 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </label>
            </>
          )}

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
              // نستخدم img هنا لأن الصورة محلية من createObjectURL
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

        <footer className="mt-8 text-center text-gray-400 text-sm">
          هل تحتاج مساعدة؟ تواصل معنا عبر الواتساب بعد إرسال الإعلان.
        </footer>
      </div>
    </main>
  );
}