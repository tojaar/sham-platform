// app/work/seeker/page.tsx
'use client';

import React, { useCallback, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import 'leaflet/dist/leaflet.css';

/**
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
            borderRadius: 10,
            border: '1px solid rgba(245,158,11,0.9)',
            background: '#fff',
            fontSize: 14,
            outline: 'none',
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
          setSelectedPayment(null);
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
      ref={containerRef}
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0f172a 0%, #071021 50%, #021018 100%)',
        padding: 20,
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 920,
          margin: '24px 12px',
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 18,
        }}
      >
        {/* Header */}
        <section
          style={{
            color: '#fff',
            textAlign: 'center',
            padding: '18px 12px',
            borderRadius: 14,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
            border: '1px solid rgba(255,255,255,0.04)',
            boxShadow: '0 8px 30px rgba(2,6,23,0.6)',
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.02)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ color: '#f59e0b' }}>
              <path d="M12 2l3 6 6 .5-4.5 3.8L18 20l-6-3.5L6 20l1.5-7.7L3 8.5 9 8 12 2z" fill="currentColor" />
            </svg>
            <div style={{ fontSize: 14, color: '#fff', opacity: 0.9 }}>نموذج الباحث عن عمل</div>
          </div>

          <h1 style={{ margin: '12px 0 6px', fontSize: 22, lineHeight: 1.05, fontWeight: 800 }}>سجل طلبك بسهولة — سنساعدك في العثور على فرص</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: 13, maxWidth: 760, marginLeft: 'auto', marginRight: 'auto' }}>
            املأ البيانات الأساسية، أضف صورة أو شهادة، وحدد موقع السكن إن رغبت. سنراجع الطلب ونوافيك بالنتيجة.
          </p>
        </section>

        {/* Card */}
        <section
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 18,
            boxShadow: '0 12px 40px rgba(2,6,23,0.6)',
            border: '2px solid rgba(245,158,11,0.12)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
              <Field icon="👤" placeholder="الاسم الكامل" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
              <Field icon="📞" placeholder="رقم الهاتف واتساب" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field icon="🎂" placeholder="العمر" type="number" value={form.age} onChange={(v) => setForm({ ...form, age: v })} />
              <Field icon="🛠" placeholder="المهنة" value={form.profession} onChange={(v) => setForm({ ...form, profession: v })} />
              <div style={{ gridColumn: '1 / -1' }}>
                <Field icon="🎓" placeholder="الشهادات (إن وُجدت)" value={form.certificates} onChange={(v) => setForm({ ...form, certificates: v })} />
              </div>
            </div>

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
                  onSelect={(coords: { lat: number; lng: number } | null) => {
                    setLocation(coords ?? null);
                    setForm((s) => ({ ...s, mapLocation: coords ? `${coords.lat},${coords.lng}` : '' }));
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: '#92400e' }}>الموقع: {form.mapLocation || 'لم يتم الاختيار'}</div>
            </div>

            {/* Payment method buttons */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => togglePayment('sham')}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: selectedPayment === 'sham' ? '#f59e0b' : 'transparent',
                  color: selectedPayment === 'sham' ? '#000' : '#0f172a',
                  border: selectedPayment === 'sham' ? 'none' : '1px solid rgba(2,6,23,0.06)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flex: '1 1 auto',
                }}
              >
                دفع شام كاش
              </button>

              <button
                type="button"
                onClick={() => togglePayment('usdt')}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: selectedPayment === 'usdt' ? '#06b6d4' : 'transparent',
                  color: selectedPayment === 'usdt' ? '#000' : '#0f172a',
                  border: selectedPayment === 'usdt' ? 'none' : '1px solid rgba(2,6,23,0.06)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flex: '1 1 auto',
                }}
              >
                دفع USDT
              </button>
            </div>

            {/* Payment details: only visible after selecting a method */}
            {selectedPayment === 'sham' && (
              <div style={{ background: '#fff8ed', borderRadius: 10, padding: 12, border: '1px solid rgba(245,158,11,0.12)' }}>
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
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: '#fff',
                        border: '1px solid rgba(2,6,23,0.06)',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
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
              <div style={{ background: '#ecfeff', borderRadius: 10, padding: 12, border: '1px solid rgba(6,182,212,0.12)' }}>
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
                      style={{
                        padding: '8px 10px',
                        borderRadius: 8,
                        background: '#fff',
                        border: '1px solid rgba(2,6,23,0.06)',
                        cursor: 'pointer',
                        fontSize: 13,
                        fontWeight: 700,
                      }}
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
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '1fr 1fr' }}>
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
                  border: '1px solid #fde68a',
                  backgroundColor: '#fef9f5',
                }}
              />
              {previewUrl && (
                // Use next/image to avoid the lint warning about <img>
                <div style={{ marginTop: 8, width: '100%', borderRadius: 8, overflow: 'hidden', position: 'relative', height: 220 }}>
                  <Image src={previewUrl} alt="preview" fill style={{ objectFit: 'cover' }} />
                </div>
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
                  setSelectedPayment(null);
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

          {/* Notice area */}
          <div style={{ marginTop: 6 }}>
            {notice && (
              <div style={{ padding: 10, borderRadius: 8, background: 'rgba(6,182,212,0.06)', color: '#0369a1', fontSize: 13 }}>
                {notice}
              </div>
            )}
          </div>
        </section>

        {/* Footer / Help */}
        <section style={{ color: '#fff', textAlign: 'center', padding: '12px 8px', fontSize: 13 }}>
          <div>هل تحتاج مساعدة؟ تواصل معنا عبر الواتساب بعد إرسال الطلب.</div>
          <div style={{ marginTop: 6, color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>نحترم خصوصيتك ونحافظ على بياناتك.</div>
        </section>
      </div>
    </main>
  );
}