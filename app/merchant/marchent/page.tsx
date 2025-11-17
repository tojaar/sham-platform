'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ---------- Location picker component (click to set coords) ----------
function LocationPicker({ setCoords }: { setCoords: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

// ---------- helper: convert File -> base64 ----------
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

// ---------- helper: upload to imgbb ----------
const uploadToImgbb = async (file: File | null): Promise<string | null> => {
  if (!file) return null;
  const key = process.env.NEXT_PUBLIC_IMGBB_KEY;
  if (!key) throw new Error('مفتاح IMGBB غير موجود. عيّنه في NEXT_PUBLIC_IMGBB_KEY.');
  const base64 = await fileToBase64(file);
  const form = new URLSearchParams();
  form.append('key', key);
  form.append('image', base64);
  const res = await fetch('https://api.imgbb.com/1/upload', {
    method: 'POST',
    body: form,
  });
  const json = await res.json();
  if (!res.ok || !json || !json.data || !json.data.url) {
    throw new Error(json.error?.message ?? 'فشل رفع الصورة إلى imgbb');
  }
  return json.data.url;
};

// ---------- fix leaflet default icon path (bundlers) ----------
if (typeof window !== 'undefined') {
  try {
    delete (L.Icon.Default as any).prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
      iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
      shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
    });
  } catch (e) {
    // ignore
  }
}

export default function postAdpageForm() {
  const router = useRouter();

  // form state
  const [category, setCategory] = useState('cars');
  const [isCompany, setIsCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState(''); // <-- phone field
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [paymentCode, setPaymentCode] = useState('');
  const [paymentId, setPaymentId] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

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
    if (isCompany && !companyName.trim()) {
      setMessage('الرجاء كتابة اسم الشركة');
      return false;
    }
    if (!isCompany && !personName.trim()) {
      setMessage('الرجاء كتابة الاسم');
      return false;
    }
    if (!country.trim() || !province.trim() || !city.trim()) {
      setMessage('الرجاء تزويد الدولة والمحافظة والمدينة');
      return false;
    }
    if (!coords) {
      setMessage('الرجاء اختيار الموقع على الخريطة');
      return false;
    }
    // phone optional but if present, simple validation
    if (phone && phone.trim().length < 5) {
      setMessage('الرجاء إدخال رقم هاتف صالح أو تركه فارغاً');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setMessage(null);
    if (!validate()) return;

    setLoading(true);
    setMessage('⏳ جاري رفع الصور وحفظ الإعلان...');

    try {
      let imageUrl: string | null = null;
      let logoUrl: string | null = null;

      if (imageFile) {
        imageUrl = await uploadToImgbb(imageFile);
      }

      if (logoFile) {
        logoUrl = await uploadToImgbb(logoFile);
      }

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setMessage('تحتاج لتسجيل الدخول أولاً');
        setLoading(false);
        return;
      }

      const payload: any = {
        category,
        name: isCompany ? companyName.trim() : personName.trim(),
        phone: phone || null, // <-- save phone
        is_company: isCompany,
        company_logo: logoUrl,
        image_url: imageUrl,
        country,
        province,
        city,
        address,
        location_lat: coords?.lat ?? null,
        location_lng: coords?.lng ?? null,
        price: price || null,
        description: description || null,
        payment_code: paymentCode || null,
        payment_id: paymentId || null,
        approved: false,
        created_by: user.id,
      };

      const { error } = await supabase.from('ads').insert([payload]);

      if (error) {
        throw error;
      }

      setMessage('✅ تم حفظ الإعلان بنجاح. بانتظار الموافقة.');
      setTimeout(() => {
        router.push('/merchant');
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setMessage('❌ حدث خطأ أثناء الحفظ: ' + (err?.message ?? String(err)));
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(180deg,#071226 0%, #08263a 100%)',
      padding: '20px',
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      color: '#0b1220',
    } as React.CSSProperties,
    container: {
      maxWidth: 820,
      margin: '0 auto',
      background: '#0f1724',
      borderRadius: 14,
      padding: 18,
      boxShadow: '0 8px 30px rgba(2,6,23,0.6)',
      color: '#e6eef8',
    } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.06)',
      background: '#071126',
      color: '#e6eef8',
      outline: 'none',
      fontSize: 14,
    } as React.CSSProperties,
    previewBox: {
      width: 92,
      height: 92,
      borderRadius: 10,
      background: '#06131d',
      border: '1px solid rgba(255,255,255,0.04)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    } as React.CSSProperties,
    btnPrimary: {
      padding: '12px 16px',
      background: 'linear-gradient(90deg,#0ea5a3,#0891b2)',
      color: '#042024',
      border: 'none',
      borderRadius: 10,
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 15,
    } as React.CSSProperties,
    mapWrap: { width: '100%', height: 300, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.04)' } as React.CSSProperties,
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>📣 أنشر إعلانك</div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.input}>
            <option value="cars">🚗 سيارات</option>
            <option value="real_estate">🏠 عقارات</option>
            <option value="machines">⚙️ آلات</option>
            <option value="medical">💊 منتجات طبية</option>
            <option value="home">🛋 أدوات منزلية</option>
            <option value="food">🍔 أغذية ومشروبات</option>
            <option value="clothing">👕 ألبسة</option>
            <option value="jewelry">💍 مجوهرات</option>
            <option value="animals">🐾 حيوانات</option>
          </select>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={isCompany} onChange={(e) => setIsCompany(e.target.checked)} />
              <span style={{ fontSize: 13, color: '#9fb3c9' }}>أنا شركة</span>
            </label>

            {isCompany ? (
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="اسم الشركة" style={{ ...styles.input, flex: 1 }} />
            ) : (
              <input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="الاسم" style={{ ...styles.input, flex: 1 }} />
            )}
          </div>

          {/* PHONE FIELD */}
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" style={styles.input} />

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, color: '#9fb3c9', fontSize: 13 }}>شعار الشركة (اختياري)</label>
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} style={{ ...styles.input, padding: 8 }} />
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#9fb3c9' }}>الشعار سيُعرض عند وجوده في تفاصيل الإعلان</div>
              </div>
            </div>

            <div style={styles.previewBox}>
              {logoPreview ? <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ color: '#7f9fb6', fontSize: 12 }}>معاينة شعار</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="الدولة" style={styles.input} />
            <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="المحافظة" style={styles.input} />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="المدينة" style={styles.input} />
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان" style={styles.input} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#9fb3c9' }}>📍 اختر الموقع على الخريطة (انقر لتعيين)</div>
              {coords ? <div style={{ fontSize: 13, color: '#bfeffd' }}>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</div> : null}
            </div>
            <div style={styles.mapWrap}>
              <MapContainer center={[33.3128, 44.3615]} zoom={6} style={{ width: '100%', height: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker setCoords={setCoords} />
                {coords && (
                  <Marker
                    position={[coords.lat, coords.lng]}
                  />
                )}
              </MapContainer>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#9fb3c9' }}>اضغط على الخريطة لاختيار الإحداثيات بدقة</div>
          </div>

          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="السعر (اختياري)" style={styles.input} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="الوصف الكامل" style={{ ...styles.input, minHeight: 120 }} />

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, color: '#9fb3c9', fontSize: 13 }}>صورة الإعلان (اختياري)</label>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} style={{ ...styles.input, padding: 8 }} />
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#9fb3c9' }}>صيغ مدعومة: JPG, PNG. ستُرفع إلى imgbb</div>
              </div>
            </div>

            <div style={styles.previewBox}>
              {imagePreview ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ color: '#7f9fb6', fontSize: 12 }}>معاينة الصورة</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input value={paymentCode} onChange={(e) => setPaymentCode(e.target.value)} placeholder="رمز الدفع (مثال: شام كاش 10000)" style={styles.input} />
            <input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="معرف الدفع (مثال: USDT 1$)" style={styles.input} />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSubmit} disabled={loading} style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'جارٍ الحفظ...' : 'حفظ الإعلان'}
              </button>

              <button
                onClick={() => {
                  setCategory('cars');
                  setIsCompany(false);
                  setCompanyName('');
                  setPersonName('');
                  setPhone(''); // reset phone
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
                  setMessage(null);
                }}
                style={{
                  padding: '10px 14px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#cfeff7',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                إعادة تعيين
              </button>
            </div>

            <div style={{ minWidth: 220, textAlign: 'right', fontSize: 12, color: '#9fb3c9' }}>
              بعد الحفظ يتم المراجعة من قبل الإدارة
            </div>
          </div>

          {message && <div style={{ marginTop: 8, color: '#fff', textAlign: 'center' }}>{message}</div>}
        </div>
      </div>
    </main>
  );
}