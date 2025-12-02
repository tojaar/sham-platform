// app/merchant/page.tsx
'use client';

import React, { useEffect, useState } from 'react';

type CommPayload = {
  category: string;
  name: string;
  phone?: string | null;
  is_company: boolean;
  company_logo?: string | null;
  image_url?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  price?: string | null;
  description?: string | null;
  payment_code?: string | null;
  payment_id?: string | null;
  approved?: boolean | null;
  created_by?: string | null;
  [key: string]: unknown;
};

type LatLng = { lat: number; lng: number };

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.onload = () => {
      const res = reader.result;
      if (typeof res === 'string') resolve(res.split(',')[1]);
      else reject(new Error('نتيجة القراءة غير صالحة'));
    };
    reader.readAsDataURL(file);
  });

const uploadToImgbb = async (file: File | null): Promise<string | null> => {
  if (!file) return null;
  const key = process.env.NEXT_PUBLIC_IMGBB_KEY;
  if (!key) throw new Error('مفتاح IMGBB غير موجود.');
  const base64 = await fileToBase64(file);
  const form = new URLSearchParams();
  form.append('key', key);
  form.append('image', base64);
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.data?.url) throw new Error(json?.error?.message ?? 'فشل رفع الصورة');
  return json.data.url as string;
};

async function getSupabase() {
  const mod = await import('@/lib/supabase');
  return mod.supabase;
}

export default function PostAdPage() {
  const [category, setCategory] = useState('cars');
  const [isCompany, setIsCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);

  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [paymentCode, setPaymentCode] = useState('');
  const [paymentId, setPaymentId] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [selectedPayment, setSelectedPayment] = useState<'sham' | 'usdt' | null>(null);

  const SHAM_LINK = 'https://shamcash.example.com/pay/ABC123';
  const USDT_LINK = 'https://usdt.example.com/tx/0xDEADBEEF';

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setImagePreview(null);
    }
  }, [imageFile]);

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setLogoPreview(null);
    }
  }, [logoFile]);

  const validate = () => {
    setMessage(null);
    if (isCompany && !companyName.trim()) {
      setMessage('الرجاء كتابة اسم الشركة');
      return false;
    }
    if (!isCompany && !personName.trim()) {
      setMessage('الرجاء كتابة الاسم');
      return false;
    }
    if (!country.trim() && !province.trim() && !city.trim()) {
      setMessage('الرجاء تزويد الدولة أو المحافظة أو المدينة');
      return false;
    }
    if (!coords) {
      setMessage('الرجاء إدخال الإحداثيات أو استخدام "تحديد الموقع تلقائياً"');
      return false;
    }
    if (phone && phone.trim().length < 5) {
      setMessage('الرجاء إدخال رقم هاتف صالح أو تركه فارغاً');
      return false;
    }
    return true;
  };

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

  const togglePayment = (method: 'sham' | 'usdt') => {
    setSelectedPayment((prev) => {
      const next = prev === method ? null : method;
      if (next === 'sham') setPaymentId('');
      if (next === 'usdt') setPaymentCode('');
      return next;
    });
  };

  const handleCompanyToggle = (checked: boolean) => {
    setIsCompany(checked);
    if (!checked) {
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  const detectLocation = async () => {
    setMessage(null);
    if (!navigator.geolocation) {
      setMessage('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    setMessage('جاري تحديد الموقع...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setMessage('تم تحديد الموقع');
        setTimeout(() => setMessage(null), 1500);
      },
      (err) => {
        console.error(err);
        setMessage('فشل تحديد الموقع: ' + (err.message || 'خطأ'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async () => {
    setMessage(null);
    if (!validate()) return;

    setLoading(true);
    setMessage('⏳ جاري رفع الصور وحفظ الإعلان...');

    try {
      const imageUrl = imageFile ? await uploadToImgbb(imageFile) : null;
      const logoUrl = logoFile ? await uploadToImgbb(logoFile) : null;

      const supabase = await getSupabase();

      // Use 'anonymous' to avoid DB constraint if created_by is NOT nullable
      const finalUserId: string | null = 'anonymous';

      const payload: CommPayload = {
        category,
        name: isCompany ? companyName.trim() : personName.trim(),
        phone: phone?.trim() || null,
        is_company: isCompany,
        company_logo: logoUrl ?? null,
        image_url: imageUrl ?? null,
        country: country?.trim() || null,
        province: province?.trim() || null,
        city: city?.trim() || null,
        address: address?.trim() || null,
        location_lat: coords?.lat ?? null,
        location_lng: coords?.lng ?? null,
        price: price?.trim() || null,
        description: description?.trim() || null,
        payment_code: paymentCode?.trim() || null,
        payment_id: paymentId?.trim() || null,
        approved: false,
        created_by: finalUserId,
      };

      console.log('DEBUG: payload to insert', payload);

      const res = await supabase.from('ads').insert([payload]).select();
      console.log('DEBUG: supabase insert result', res);

      if (res.error) {
        // show detailed error to help debugging
        console.error('Supabase insert error:', res.error);
        setMessage('❌ خطأ من الخادم: ' + (res.error.message ?? 'خطأ غير معروف'));
        setLoading(false);
        return;
      }

      setMessage('✅ تم حفظ الإعلان بنجاح. بانتظار الموافقة.');
      // reset form
      setCategory('cars');
      setIsCompany(false);
      setCompanyName('');
      setPersonName('');
      setPhone('');
      setLogoFile(null);
      setImageFile(null);
      setCountry('');
      setProvince('');
      setCity('');
      setAddress('');
      setCoords(null);
      setPrice('');
      setDescription('');
      setPaymentCode('');
      setPaymentId('');
      setImagePreview(null);
      setLogoPreview(null);
      setSelectedPayment(null);
    } catch (err) {
      console.error('Unhandled error in handleSubmit:', err);
      const msg = (err as { message?: string })?.message ?? String(err);
      setMessage('❌ حدث خطأ أثناء الحفظ: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  // styles omitted for brevity in this snippet — keep your existing styles or reuse previous styles

  return (
    <main style={{ padding: 18 }}>
      <h2>نشر إعلان (بدون تسجيل)</h2>
      <div>
        <label>الاسم</label>
        <input value={isCompany ? companyName : personName} onChange={(e) => (isCompany ? setCompanyName(e.target.value) : setPersonName(e.target.value))} />
      </div>

      <div>
        <label>الدولة</label>
        <input value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>

      <div>
        <label>خط العرض</label>
        <input value={coords?.lat ?? ''} onChange={(e) => setCoords((p) => ({ lat: e.target.value === '' ? (p?.lat ?? 0) : Number(e.target.value), lng: p?.lng ?? 0 }))} />
        <label>خط الطول</label>
        <input value={coords?.lng ?? ''} onChange={(e) => setCoords((p) => ({ lat: p?.lat ?? 0, lng: e.target.value === '' ? (p?.lng ?? 0) : Number(e.target.value) }))} />
        <button type="button" onClick={detectLocation}>تحديد الموقع تلقائياً</button>
      </div>

      <div>
        <label>صورة الإعلان</label>
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
        {imagePreview && <img src={imagePreview} alt="preview" style={{ width: 120 }} />}
      </div>

      <div>
        <button onClick={handleSubmit} disabled={loading}>{loading ? 'جارٍ الحفظ...' : 'حفظ الإعلان'}</button>
      </div>

      {message && <div style={{ marginTop: 12 }}>{message}</div>}
    </main>
  );
}