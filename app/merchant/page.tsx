// app/merchant/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';

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

/* ---------- Utilities ---------- */

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

/* IMPORTANT: لا تستورد supabase على مستوى الوحدة.
   أنشئ العميل ديناميكياً داخل الدوال التي تعمل على جهة العميل فقط. */
async function getSupabase() {
  const mod = await import('@/lib/supabase');
  return mod.supabase;
}

/* ---------- Component ---------- */

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

  // sample payment links (replace with real links)
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

  // allow user to auto-detect location via browser geolocation (optional)
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

  // === التغيير الرئيسي: السماح بالحفظ بدون تسجيل نهائياً ===
  const handleSubmit = async () => {
    setMessage(null);
    if (!validate()) return;

    setLoading(true);
    setMessage('⏳ جاري رفع الصور وحفظ الإعلان...');

    try {
      const imageUrl = imageFile ? await uploadToImgbb(imageFile) : null;
      const logoUrl = logoFile ? await uploadToImgbb(logoFile) : null;

      const supabase = await getSupabase();

      // لا نتحقق من جلسة المستخدم نهائياً — نحفظ كمجهول (created_by = null)
      const finalUserId: string | null = null;

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

      const { error } = await supabase.from('ads').insert([payload]);
      if (error) throw error;

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
      console.error(err);
      const msg = (err as { message?: string })?.message ?? String(err);
      setMessage('❌ حدث خطأ أثناء الحفظ: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(180deg,#071226 0%, #08263a 100%)',
      padding: '18px',
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      color: '#e6eef8',
    } as React.CSSProperties,
    container: {
      maxWidth: 920,
      margin: '0 auto',
      background: 'linear-gradient(180deg,#0b1724,#071226)',
      borderRadius: 16,
      padding: 20,
      boxShadow: '0 12px 40px rgba(2,6,23,0.6)',
      color: '#e6eef8',
      border: '1px solid rgba(255,255,255,0.03)',
    } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(6,19,30,0.6)',
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
      background: 'linear-gradient(90deg,#06b6d4,#3b82f6)',
      color: '#001219',
      border: 'none',
      borderRadius: 10,
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 15,
    } as React.CSSProperties,
    mapWrap: {
      width: '100%',
      borderRadius: 10,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.04)',
      padding: 12,
      background: 'rgba(6,19,30,0.45)',
    } as React.CSSProperties,
  };

  return (
    <main style={styles.page} className="merchant-page">
      <style>{`
        .merchant-grid { display: grid; gap: 12px; }
        .top-row { display:flex; gap:12px; align-items:center; margin-bottom:12px; justify-content:space-between; }
        .title { font-size:20px; font-weight:800; color:#fff; display:flex; gap:8px; align-items:center; }
        .subtle { color:#9fb3c9; font-size:13px; }
        .flex-row { display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
        .two-col { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .payment-buttons { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .pay-btn { padding:10px 12px; border-radius:10px; cursor:pointer; font-weight:700; border:1px solid rgba(255,255,255,0.06); background:transparent; color:#e6eef8; }
        .pay-btn.active-sham { background:#f59e0b; color:#000; border:none; }
        .pay-btn.active-usdt { background:#06b6d4; color:#000; border:none; }
        .copy-btn { padding:8px 10px; border-radius:8px; background:rgba(255,255,255,0.03); color:#e6eef8; border:1px solid rgba(255,255,255,0.04); cursor:pointer; }
        .payment-panel { margin-top:8px; padding:12px; border-radius:10px; border:1px solid rgba(255,255,255,0.03); }
        .sham-panel { background:#fff8ed; color:#7c2d12; }
        .usdt-panel { background:#ecfeff; color:#064e3b; }
        .actions-row { display:flex; gap:8px; align-items:center; justify-content:space-between; margin-top:8px; flex-wrap:wrap; }
        .actions-left { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .reset-btn { padding:10px 14px; background:transparent; border:1px solid rgba(255,255,255,0.06); color:#cfeff7; border-radius:10px; cursor:pointer; }
        .message { margin-top:8px; color:#fff; text-align:center; }

        .name-input { min-width: 160px; }
        @media (max-width: 720px) {
          .two-col { grid-template-columns: 1fr; }
          .title { font-size:18px; }
          .btnPrimaryMobile { width:100%; }
          .merchant-page input,
          .merchant-page textarea,
          .merchant-page select,
          .merchant-page .copy-btn,
          .merchant-page .pay-btn {
            font-size: 16px;
            padding: 14px;
          }
          .name-input {
            font-size: 18px;
            padding: 14px;
          }
        }
      `}</style>

      <div style={styles.container}>
        <div className="top-row">
          <div className="title">📣 أنشر إعلانك</div>
          <div style={{ fontSize: 12, color: '#9fb3c9' }}>يمكن حفظ الإعلان دون تسجيل دخول</div>
        </div>

        <div className="merchant-grid">
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...styles.input, maxWidth: 260 }}>
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

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#cfeff7' }}>
              <input type="checkbox" checked={isCompany} onChange={(e) => handleCompanyToggle(e.target.checked)} />
              شركة
            </label>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {isCompany ? (
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="اسم الشركة"
                style={{ ...styles.input, flex: 1 }}
                className="name-input"
              />
            ) : (
              <input
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                placeholder="الاسم"
                style={{ ...styles.input, flex: 1 }}
                className="name-input"
              />
            )}
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" style={{ ...styles.input, maxWidth: 220 }} />
          </div>

          {isCompany && (
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 6, color: '#9fb3c9', fontSize: 13 }}>شعار الشركة (اختياري)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                  style={{ ...styles.input, padding: 8 }}
                />
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: '#9fb3c9' }}>الشعار سيُعرض عند وجوده في تفاصيل الإعلان</div>
                </div>
              </div>

              <div style={styles.previewBox as React.CSSProperties} className="previewBox">
                {logoPreview ? <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ color: '#7f9fb6', fontSize: 12 }}>معاينة شعار</div>}
              </div>
            </div>
          )}

          <div className="two-col">
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="الدولة" style={styles.input} />
            <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="المحافظة" style={styles.input} />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="المدينة" style={styles.input} />
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان" style={styles.input} />
          </div>

          {/* Map-free coordinates input (no external file required) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#9fb3c9' }}>📍 الإحداثيات (يمكن إدخالها يدوياً أو تحديد الموقع تلقائياً)</div>
              {coords ? <div style={{ fontSize: 13, color: '#bfeffd' }}>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</div> : null}
            </div>

            <div style={styles.mapWrap}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                <input
                  value={coords?.lat ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCoords((prev) => ({ lat: v === '' ? (prev?.lat ?? 0) : Number(v), lng: prev?.lng ?? 0 }));
                  }}
                  placeholder="خط العرض (مثال: 33.3128)"
                  style={{ ...styles.input, maxWidth: 220 }}
                />
                <input
                  value={coords?.lng ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCoords((prev) => ({ lat: prev?.lat ?? 0, lng: v === '' ? (prev?.lng ?? 0) : Number(v) }));
                  }}
                  placeholder="خط الطول (مثال: 44.3615)"
                  style={{ ...styles.input, maxWidth: 220 }}
                />
                <button type="button" onClick={detectLocation} style={{ padding: '10px 12px', borderRadius: 8, cursor: 'pointer' }} className="copy-btn">
                  تحديد الموقع تلقائياً
                </button>
                <div style={{ fontSize: 12, color: '#9fb3c9' }}>أدخل الإحداثيات بدقة أو استخدم الزر أعلاه</div>
              </div>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: '#9fb3c9' }}>يمكنك ترك الحقول فارغة لكن يجب إدخال الإحداثيات قبل الحفظ</div>
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

            <div style={styles.previewBox as React.CSSProperties}>
              {imagePreview ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ color: '#7f9fb6', fontSize: 12 }}>معاينة الصورة</div>}
            </div>
          </div>

          <div className="two-col">
            {selectedPayment === 'sham' ? (
              <input value={paymentCode} onChange={(e) => setPaymentCode(e.target.value)} placeholder="رمز الدفع (مثال: شام كاش 10000)" style={styles.input} />
            ) : (
              <div />
            )}

            {selectedPayment === 'usdt' ? (
              <input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="معرف الدفع (مثال: USDT 1$)" style={styles.input} />
            ) : (
              <div />
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div className="payment-buttons">
              <button
                type="button"
                onClick={() => togglePayment('sham')}
                className={`pay-btn ${selectedPayment === 'sham' ? 'active-sham' : ''}`}
                aria-pressed={selectedPayment === 'sham'}
              >
                دفع شام كاش
              </button>

              <button
                type="button"
                onClick={() => togglePayment('usdt')}
                className={`pay-btn ${selectedPayment === 'usdt' ? 'active-usdt' : ''}`}
                aria-pressed={selectedPayment === 'usdt'}
              >
                دفع USDT
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(SHAM_LINK)}
                className="copy-btn"
                aria-hidden={selectedPayment !== 'sham'}
                style={{ opacity: selectedPayment === 'sham' ? 1 : 0, transition: 'opacity .15s ease' }}
              >
                نسخ رابط شام
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(USDT_LINK)}
                className="copy-btn"
                aria-hidden={selectedPayment !== 'usdt'}
                style={{ opacity: selectedPayment === 'usdt' ? 1 : 0, transition: 'opacity .15s ease' }}
              >
                نسخ رابط USDT
              </button>
            </div>

            <div style={{ minWidth: 220, textAlign: 'right', fontSize: 12, color: '#9fb3c9' }}>
              بعد الحفظ يتم المراجعة من قبل الإدارة
            </div>
          </div>

          {selectedPayment === 'sham' && (
            <div className="payment-panel sham-panel payment-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>دفع شام كاش</div>
                  <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45 }}>
                    <div>1. انسخ رابط شام بالضغط على زر "نسخ رابط شام".</div>
                    <div>2. افتح الرابط في متصفحك أو تطبيق شام كاش واتبع خطوات الدفع.</div>
                    <div>3. احتفظ برقم الإيصال أو رمز الدفع بعد إتمام العملية.</div>
                    <div>4. عد إلى هذا النموذج وأدخل رمز الدفع في الحقل المخصص أعلاه.</div>
                    <div>5. بعد الحفظ سنراجع الدفع ونؤكد الإعلان عبر النظام.</div>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(SHAM_LINK)}
                    className="copy-btn"
                    style={{ padding: '8px 10px' }}
                  >
                    نسخ رابط شام
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedPayment === 'usdt' && (
            <div className="payment-panel usdt-panel payment-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>دفع USDT (TRC20)</div>
                  <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.45 }}>
                    <div>1. انسخ رابط USDT أو العنوان بالضغط على "نسخ رابط USDT".</div>
                    <div>2. افتح محفظتك وتأكد من اختيار شبكة TRC20 قبل الإرسال.</div>
                    <div>3. أرسل المبلغ إلى العنوان الظاهر في الرابط أو المحفظة.</div>
                    <div>4. بعد تأكيد المعاملة انسخ TXID أو معرف المعاملة.</div>
                    <div>5. الصق TXID في حقل معرف الدفع أعلاه ثم احفظ الإعلان.</div>
                  </div>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(USDT_LINK)}
                    className="copy-btn"
                    style={{ padding: '8px 10px' }}
                  >
                    نسخ رابط USDT
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="actions-row">
            <div className="actions-left">
              <button onClick={handleSubmit} disabled={loading} style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }} className="btnPrimaryMobile">
                {loading ? 'جارٍ الحفظ...' : 'حفظ الإعلان'}
              </button>
              <button
                onClick={() => {
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
                  setMessage(null);
                  setImagePreview(null);
                  setLogoPreview(null);
                  setSelectedPayment(null);
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

          {message && <div className="message">{message}</div>}
        </div>
      </div>
    </main>
  );
}