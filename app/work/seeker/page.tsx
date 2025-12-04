// app/work/seeker/page.tsx
'use client';

import React, { useCallback, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import 'leaflet/dist/leaflet.css';

/*
 * IMPORTANT:
 * لا تستورد supabase على مستوى الوحدة. استورد العميل ديناميكياً داخل الدوال التي تعمل على جهة العميل فقط.
 */
async function getSupabase() {
  const mod = await import('@/lib/supabase');
  return mod.supabase;
}

/* MapPicker client-only component (dynamic import, no SSR) */
const MapPicker = dynamic(() => import('@/components/MapPicker').then((m) => m.default), { ssr: false });

const IMGBB_KEY = process.env.NEXT_PUBLIC_IMGBB_KEY ?? '';

/*
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

    const json = await res.json().catch(() => null);
    console.log('ImgBB multipart response:', json);

    if (!res.ok || (json && json?.success === false)) {
      const errMsg = (json && (json?.error?.message ?? json?.status?.error_message)) ?? `HTTP ${res.status};;`
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

    const res2 = await fetch('https://api.imgbb.com/1/upload', {
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
    <label className="field">
      <div className="field-row">
        {icon && <span className="field-icon">{icon}</span>}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field-input"
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
  const [notice, setNotice] = useState<string | null>(null);

  const [selectedPayment, setSelectedPayment] = useState<'sham' | 'usdt' | null>(null);

  // sample payment links (replace with real links)
  const SHAM_LINK = 'https://shamcash.example.com/pay/ABC123';
  const USDT_LINK = 'https://usdt.example.com/tx/0xDEADBEEF';

  const containerRef = useRef<HTMLDivElement | null>(null);

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

  // copy to clipboard helper — shows "تم النسخ" on success
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice('تم النسخ');
      setTimeout(() => setNotice(null), 2000);
    } catch {
      setNotice('فشل النسخ');
      setTimeout(() => setNotice(null), 2000);
    }
  };

  // Toggle payment selection and enforce field visibility rules:
  // - selecting 'sham' clears USDT fields and keeps sham fields visible
  // - selecting 'usdt' clears sham fields and keeps USDT fields visible
  const togglePayment = (method: 'sham' | 'usdt') => {
    setSelectedPayment((prev) => {
      const next = prev === method ? null : method;
      setForm((s) => {
        if (next === 'sham') {
          return { ...s, transactionId: '' }; // clear USDT TXID
        }
        if (next === 'usdt') {
          return { ...s, paymentCode: '' }; // clear Sham payment code
        }
        return s;
      });
      return next;
    });
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setNotice(null);

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
          setNotice('حدث خطأ اثناء ارسال الطلب.');
setTimeout(() => setNotice(null), 3000);
        } else {
          setNotice('تم حفظ الإعلان بنجاح ستتم المراجعة من قبل الادارة.');
             setTimeout(() => setNotice(null), 3000);
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
          setSelectedPayment(null);
        }
      } catch (err) {
        console.error('Unexpected error:', err);
        setNotice('خطأ غير متوقع تأكد من الشبكة.');
setTimeout(() => setNotice(null), 3000);
      } finally {
        setLoading(false);
      }
    },
    [file, form, location]
  );

  return (
    <main ref={containerRef} className="page-root">
      <style>{`
        :root{
          --bg-1: #0f172a;
          --bg-2: #080707ff;
          --accent: #f59e0b;
          --accent-2: #06b6d4;
          --card-bg: #fcfcf5ff;
          --muted: #0ed91fff;
          --success: #06b6d4;
        }

        .page-root{
          min-height:100vh;
          background: linear-gradient(180deg, var(--bg-1) 0%, var(--bg-2) 50%, #080606ff 100%);
          padding: 20px;
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
          display:flex;
          justify-content:center;
          align-items:flex-start;
        }

        .container{
          width:100%;
          max-width:920px;
          margin:24px 12px;
          display:grid;
          grid-template-columns:1fr;
          gap:18px;
        }

        .header{
          color:#fff;
          text-align:center;
          padding:18px 12px;
          border-radius:14px;
          background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
          border:1px solid rgba(255,255,255,0.04);
          box-shadow: 0 8px 30px rgba(2,6,23,0.6);
        }

        .brand-pill{
          display:inline-flex;
          align-items:center;
          gap:10px;
          padding:6px 12px;
          border-radius:999px;
          background: rgba(255,255,255,0.02);
        }

        .card{
          background: var(--card-bg);
          border-radius:16px;
          padding:18px;
          box-shadow: 0 12px 40px rgba(43, 213, 37, 0.6);
          border: 2px solid rgba(87, 23, 42, 0.9);
          display:flex;
          flex-direction:column;
          gap:12px;
        }

        form{ display:grid; gap:12px; }

        .grid-2{
          display:grid;
          gap:10px;
          grid-template-columns: 1fr 1fr;
        }

        .grid-2 .field{ margin:0; }

        .field{ display:flex; flex-direction:column; gap:6px; }
        .field-row{ display:flex; gap:8px; align-items:center; }
        .field-icon{ font-size:18px; }
        .field-input{
          flex:1;
          padding:10px 12px;
          border-radius:10px;
          border:1px solid rgba(245,158,11,0.9);
          background:#fff;
          font-size:14px;
          outline:none;
        }
        .field-input:focus{ box-shadow: 0 6px 18px rgba(212, 51, 6, 0.06); border-color: var(--accent-2); }

        .map-box{ height:220px; border-radius:12px; overflow:hidden; border:1px solid rgba(23, 2, 8, 1); }

        .payment-row{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }

        .pay-btn{
          padding:10px 14px;
          border-radius:10px;
          background:transparent;
          color:var(--muted);
          border:1px solid rgba(23, 2, 9, 1);
          font-weight:700;
          cursor:pointer;
          flex:1 1 auto;
        }
        .pay-btn.active-sham{ background: var(--accent); color:#000; border:none; }
        .pay-btn.active-usdt{ background: var(--accent-2); color:#000; border:none; }

        .copy-btn{
          padding:8px 10px;
          border-radius:8px;
          background:#fff;
          border:1px solid rgba(23, 2, 4, 1);
          cursor:pointer;
          font-size:13px;
          font-weight:700;
        }

        .payment-panel{
          border-radius:10px;
          padding:12px;
          margin-top:6px;
        }
        .payment-panel.sham{ background:#fff8ed; border:1px solid rgba(245, 159, 11, 1); color:#7c2d12; }
        .payment-panel.usdt{ background:#ecfeff; border:1px solid rgba(6, 181, 212, 1); color:#064e3b; }

        .actions{ display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
        .primary-btn{
          padding:10px 16px;
          border-radius:10px;
          background: linear-gradient(90deg,#06b6d4,#3b82f6);
          color:#000;
          font-weight:700;
          border:none;
          box-shadow: 0 8px 20px rgba(59, 131, 246, 1);
          cursor:pointer;
          flex:1 1 auto;
        }
        .secondary-btn{
          padding:10px 14px;
          border-radius:10px;
          background:transparent;
          border:1px solid rgba(23, 2, 7, 1);
          color:#0f172a;
          font-weight:600;
          cursor:pointer;
        }

        .submit-row{ display:flex; justify-content:flex-end; gap:8px; margin-top:8px; }

        .notice{
          padding:10px;
          border-radius:8px;
          background: rgba(196, 17, 41, 0.06);
          color:#0369a1;
          font-size:13px;
        }

        .footer{ color:#fff; text-align:center; padding:12px 8px; font-size:13px; }

        /* Mobile adjustments */
        @media (max-width: 720px){
          .grid-2{ grid-template-columns: 1fr; }
          .payment-row{ flex-direction:column; align-items:stretch; }
          .copy-btn{ width:100%; }
          .pay-btn{ width:100%; }
          .actions{ flex-direction:column; align-items:stretch; }
          .primary-btn{ width:100%; }
          .submit-row{ justify-content:stretch; flex-direction:column-reverse; }
          .map-box{ height:200px; }
          .card{ padding:14px; border-radius:12px; }
          .header{ padding:14px; border-radius:12px; }
        }
      `}</style>

      <div className="container">
        {/* Header */}
        <section className="header">
          <div className="brand-pill" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: '#f59e0b' }}>
              <path d="M12 2l3 6 6 .5-4.5 3.8L18 20l-6-3.5L6 20l1.5-7.7L3 8.5 9 8 12 2z" fill="currentColor" />
            </svg>
            <div style={{ fontSize: 14, color: '#fff', opacity: 0.95 }}>نموذج الباحث عن عمل</div>
          </div>

          <h1 style={{ margin: '12px 0 6px', fontSize: 22, lineHeight: 1.05, fontWeight: 800 }}>سجل طلبك بسهولة — سنساعدك في العثور على فرص</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 13, maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>
            املأ البيانات الأساسية، أضف صورة أو شهادة، وحدد موقع السكن إن رغبت. سنراجع الطلب ونوافيك بالنتيجة.
          </p>
        </section>

        {/* Card */}
        <section className="card">
          <form onSubmit={handleSubmit}>
            <div className="grid-2">
              <Field icon="👤" placeholder="الاسم الكامل" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field icon="📞" placeholder="رقم الهاتف واتساب" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field icon="🎂" placeholder="العمر" type="number" value={form.age} onChange={(v) => setForm({ ...form, age: v })} />
              <Field icon="🛠" placeholder="المهنة" value={form.profession} onChange={(v) => setForm({ ...form, profession: v })} />
              <div style={{ gridColumn: '1 / -1' }}>
                <Field icon="🎓" placeholder="الشهادات (إن وُجدت)" value={form.certificates} onChange={(v) => setForm({ ...form, certificates: v })} />
              </div>
            </div>

            <div className="grid-2">
              <Field icon="🌍" placeholder="الدولة" value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
              <Field icon="🏛" placeholder="المحافظة" value={form.province} onChange={(v) => setForm({ ...form, province: v })} />
              <Field icon="🏙" placeholder="المدينة" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <Field icon="🏠" placeholder="مكان السكن" value={form.residence} onChange={(v) => setForm({ ...form, residence: v })} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontWeight: 'bold', color: '#92400e' }}>📍 اختر الموقع من الخريطة</span>
              <div className="map-box">
                <MapPicker
                  onSelect={(coords: { lat: number; lng: number } | null) => {
                    setLocation(coords ?? null);
                    setForm((s) => ({ ...s, mapLocation: coords ? `${coords.lat},${coords.lng}` : '' }));
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: '#92400e' }}>الموقع: {form.mapLocation || 'لم يتم الاختيار'}</div>
            </div>

            {/* Payment method buttons */}
            <div className="payment-row" aria-hidden={false}>
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

              {/* copy link buttons are hidden until a method is selected; keep them available but visually subtle */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => copyToClipboard(SHAM_LINK)}
                  className="copy-btn"
                  aria-hidden={selectedPayment !== 'sham'}
                  style={{ opacity: selectedPayment === 'sham' ? 1 : 0.0, transition: 'opacity .18s ease' }}
                >
                  نسخ رابط شام
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(USDT_LINK)}
                  className="copy-btn"
                  aria-hidden={selectedPayment !== 'usdt'}
                  style={{ opacity: selectedPayment === 'usdt' ? 1 : 0.0, transition: 'opacity .18s ease' }}
                >
                  نسخ رابط USDT
                </button>
              </div>
            </div>

            {/* Payment details: only visible after selecting a method */}
            {selectedPayment === 'sham' && (
              <div className="payment-panel sham" role="region" aria-label="شام كاش">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#92400e' }}>دفع شام كاش</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: '#7c2d12' }}>
                      اتبع الخطوات التالية لإتمام الدفع عبر شام كاش ثم أدخل رمز الدفع في الحقل المخصص.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(SHAM_LINK)}
                      className="copy-btn"
                    >
                      نسخ رابط شام
                    </button>
                  </div>
                </div>

                <ol style={{ marginTop: 10, paddingLeft: 18, color: '#7c2d12', fontSize: 13 }}>
                  <li>انسخ رابط شام بالضغط على زر نسخ رابط شام.</li>
                  <li>افتح الرابط في متصفحك أو تطبيق شام كاش واتبع خطوات الدفع.</li>
                  <li>بعد إتمام الدفع انسخ رمز الدفع أو رقم الإيصال وأدخله في حقل رمز الدفع شام كاش.</li>
                </ol>

                <div style={{ marginTop: 12 }}>
                  <Field
                    icon="💳"
                    placeholder="رمز الدفع شام كاش (أدخل الرمز هنا بعد الدفع)"
                    value={form.paymentCode}
                    onChange={(v) => setForm({ ...form, paymentCode: v })}
                  />
                </div>
              </div>
            )}

            {selectedPayment === 'usdt' && (
              <div className="payment-panel usdt" role="region" aria-label="USDT">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#065f46' }}>دفع USDT (TRC20)</div>
                    <div style={{ marginTop: 6, fontSize: 13, color: '#064e3b' }}>
                      انسخ رابط الدفع أو عنوان المحفظة ثم أرسل المبلغ عبر شبكة TRC20. بعد التأكيد أدخل TXID في الحقل المخصص.
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(USDT_LINK)}
                      className="copy-btn"
                    >
                      نسخ رابط USDT
                    </button>
                  </div>
                </div>

                <ol style={{ marginTop: 10, paddingLeft: 18, color: '#064e3b', fontSize: 13 }}>
                  <li>انسخ رابط USDT بالضغط على زر نسخ رابط USDT.</li>
                  <li>افتح محفظتك، تأكد من اختيار شبكة TRC20، وأرسل المبلغ إلى العنوان المطلوب.</li>
                  <li>بعد تأكيد المعاملة انسخ TXID وأدخله في حقل معرف الدفع TXID.</li>
                </ol>

                <div style={{ marginTop: 12 }}>
                  <Field
                    icon="🏧"
                    placeholder="معرف الدفع TXID (انسخه هنا بعد الإرسال)"
                    value={form.transactionId}
                    onChange={(v) => setForm({ ...form, transactionId: v })}
                  />
                </div>
              </div>
            )}

            {/* If no payment selected, show both fields (user may paste manually) */}
            {selectedPayment === null && (
              <div className="grid-2" aria-hidden={false}>
                <Field icon="💳" placeholder="رمز الدفع شام كاش (10,000 ل.س)" value={form.paymentCode} onChange={(v) => setForm({ ...form, paymentCode: v })} />
                <Field icon="🪙" placeholder="او معرف العمل USDT (TXID أو عنوان المحفظة)" value={form.transactionId} onChange={(v) => setForm({ ...form, transactionId: v })} />
              </div>
            )}

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
                  border: '1px solid #fd8a8aff',
                  backgroundColor: '#fef9f5',
                }}
              />
              {previewUrl && (
                <div style={{ marginTop: 8, width: '100%', borderRadius: 8, overflow: 'hidden', position: 'relative', height: 220 }}>
                  <Image src={previewUrl} alt="preview" fill style={{ objectFit: 'cover' }} />
                </div>
              )}
            </label>

            <div className="submit-row">
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
                  setSelectedPayment(null);
                }}
                className="secondary-btn"
              >
                إعادة تعيين
              </button>

              <button
                type="submit"
                disabled={loading}
                className="primary-btn"
                aria-busy={loading}
              >
                {loading ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
              </button>
            </div>
          </form>

          {/* Notice area */}
          <div style={{ marginTop: 6 }}>
            {notice && (
              <div className="notice" role="status">
                {notice}
              </div>
            )}
          </div>
        </section>

        {/* Footer / Help */}
        <section className="footer">
          <div>هل تحتاج مساعدة؟ تواصل معنا عبر الواتساب بعد إرسال الطلب.</div>
          <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>نحترم خصوصيتك ونحافظ على بياناتك.</div>
        </section>
      </div>
    </main>
  );
}