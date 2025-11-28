'use client';

import React, { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';

/**
 * IMPORTANT:
 * لا تستورد supabase على مستوى الوحدة. استورد العميل ديناميكياً داخل الدوال التي تعمل على جهة العميل فقط.
 */
async function getSupabase() {
  const mod = await import('@/lib/supabase');
  return mod.supabase;
}

/* MapPicker client-only component */
const MapPicker = dynamic(() => import('@/components/MapPicker').then((m) => m.default), { ssr: false });

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY ?? '';

/**
 * رفع صورة إلى ImgBB مع محاولة multipart ثم fallback إلى base64.
 * تُعيد رابط الصورة أو null عند الفشل.
 */
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
      const errMsg = json?.error?.message ?? json?.status?.error_message ?? `HTTP ${res.status};`
      throw new Error(errMsg);
    }

    return json?.data?.display_url ?? json?.data?.url ?? null;
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

    const res2 = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    const json2 = await res2.json();
    console.log('ImgBB base64 response:', json2);

    if (!res2.ok || json2?.success === false) {
      const errMsg2 = json2?.error?.message ?? json2?.status?.error_message ?? `HTTP ${res2.status};`
      throw new Error(errMsg2);
    }

    return json2?.data?.display_url ?? json2?.data?.url ?? null;
  } catch (err) {
    console.error('ImgBB upload failed completely:', err);
    return null;
  }
}

/* ---------- Field component (reusable) ---------- */
function Field(props: {
  icon?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  type?: 'text' | 'number';
}) {
  const { icon, placeholder, value, onChange, type = 'text' } = props;
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid #f59e0b',
            background: '#fff',
            fontSize: 14,
          }}
        />
      </div>
    </label>
  );
}

/* ---------- Main component ---------- */
export default function SeekerForm() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    age: '',
    profession: '',
    certificates: '',
    country: '',
    province: '',
    city: '',
    residence: '',
    paymentCode: '',
    transactionId: '',
    mapLocation: '',
  });

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);

      try {
        let imageUrl: string | null = null;

        if (file) {
          imageUrl = await uploadToImgBB(file);
          if (!imageUrl) {
            alert('فشل رفع الصورة. تأكد من مفتاح ImgBB وحجم الصورة ثم أعد المحاولة.');
            setLoading(false);
            return;
          }
        }

        const payload = {
          name: form.name,
          phone: form.phone,
          age: form.age ? Number(form.age) : null,
          profession: form.profession,
          certificates: form.certificates,
          country: form.country,
          province: form.province,
          city: form.city,
          residence: form.residence,
          location: form.mapLocation || (location ? `${location.lat},${location.lng}` : null),
          payment_code: form.paymentCode,
          transaction_id: form.transactionId,
          status: 'pending',
          expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          image_url: imageUrl,
        };

        const supabase = await getSupabase();
        const { error } = await supabase.from('seeker_requests').insert([payload]);

        if (error) {
          console.error('Insert error:', error);
          alert('حدث خطأ أثناء إرسال الطلب.');
        } else {
          alert('تم إرسال طلب الباحث للمراجعة.');
          setForm({
            name: '',
            phone: '',
            age: '',
            profession: '',
            certificates: '',
            country: '',
            province: '',
            city: '',
            residence: '',
            paymentCode: '',
            transactionId: '',
            mapLocation: '',
          });
          setFile(null);
          setPreviewUrl(null);
          setLocation(null);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        alert('خطأ غير متوقع. راجع الكونسول.');
      } finally {
        setLoading(false);
      }
    },
    [file, form, location]
  );

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom right, #fef9f5, #fde68a)',
        padding: '2rem',
        fontFamily: 'sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#92400e' }}>🔍 نموذج الباحث عن عمل</h1>

      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: '#ffffff',
          padding: '2rem',
          borderRadius: 16,
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
          display: 'grid',
          gap: '1rem',
          maxWidth: 600,
          width: '100%',
          border: '2px solid #f59e0b',
        }}
      >
        <Field icon="👤" placeholder="الاسم الكامل" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
        <Field icon="📞" placeholder="رقم الهاتف واتساب" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
        <Field icon="🎂" placeholder="العمر" type="number" value={form.age} onChange={(v) => setForm({ ...form, age: v })} />
        <Field icon="🛠" placeholder="المهنة" value={form.profession} onChange={(v) => setForm({ ...form, profession: v })} />
        <Field icon="🎓" placeholder="الشهادات" value={form.certificates} onChange={(v) => setForm({ ...form, certificates: v })} />

        <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
          <Field icon="🌍" placeholder="الدولة" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          <Field icon="🏛" placeholder="المحافظة" value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
          <Field icon="🏙" placeholder="المدينة" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
          <Field icon="🏠" placeholder="مكان السكن" value={form.residence} onChange={(v) => setForm({ ...form, residence: v })} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontWeight: 'bold', color: '#92400e' }}>📍 اختر الموقع من الخريطة</span>
          <div style={{ height: 220, borderRadius: 8, overflow: 'hidden', border: '1px solid #fde68a' }}>
            <MapPicker
              onSelect={(coords: { lat: number; lng: number }) => {
                setLocation(coords);
                setForm((s) => ({ ...s, mapLocation: `${coords.lat},${coords.lng}` }));
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: '#92400e' }}>الموقع: {form.mapLocation || 'لم يتم الاختيار'}</div>
        </div>

        <Field icon="💳" placeholder="رمز الدفع شام كاش (10,000 ل.س)" value={form.paymentCode} onChange={(v) => setForm({ ...form, paymentCode: v })} />
        <Field icon="🪙" placeholder="او معرف العمل USDT (1$)" value={form.transactionId} onChange={(v) => setForm({ ...form, transactionId: v })} />

        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontWeight: 'bold', color: '#92400e' }}>🖼 صورة (اختياري)</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{
              padding: 8,
              fontSize: 16,
              borderRadius: 8,
              border: '1px solid #fde68a',
              backgroundColor: '#fef9f5',
            }}
          />
          {previewUrl && (
            <img src={previewUrl} alt="preview" style={{ marginTop: 8, width: '100%', borderRadius: 8, objectFit: 'cover' }} />
          )}
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => {
              setForm({
                name: '',
                phone: '',
                age: '',
                profession: '',
                certificates: '',
                country: '',
                province: '',
                city: '',
                residence: '',
                paymentCode: '',
                transactionId: '',
                mapLocation: '',
              });
              setFile(null);
              setPreviewUrl(null);
              setLocation(null);
            }}
            style={{ padding: '10px 14px', borderRadius: 8, background: '#f3f4f6', border: 'none' }}
          >
            إعادة تعيين
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              background: '#92400e',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
            }}
          >
            {loading ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
          </button>
        </div>
      </form>
    </main>
  );
}