// app/producer/register/page.tsx
'use client';

import React, { useState } from 'react';

type FormState = {
  fullName: string;
  whatsapp: string;
  country: string;
  province: string;
  city: string;
  address: string;
  usdtTrc20: string;
  shamCashLink: string;
  shamPaymentCode: string;
  usdtTxid: string;
  email: string;
  password: string;
  passwordConfirm: string;
  inviteCode: string;
};

export default function ProducerRegisterPage() {
  const [form, setForm] = useState<FormState>({
    fullName: '',
    whatsapp: '',
    country: '',
    province: '',
    city: '',
    address: '',
    usdtTrc20: '',
    shamCashLink: '',
    shamPaymentCode: '',
    usdtTxid: '',
    email: '',
    password: '',
    passwordConfirm: '',
    inviteCode: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onChange = (k: keyof FormState, v: string) => {
    setForm((s) => ({ ...s, [k]: v }));
  };

  const validate = (): string | null => {
    if (!form.fullName.trim()) return 'الاسم الثلاثي مطلوب';
    if (!form.whatsapp.trim()) return 'رقم الواتساب مطلوب';
    if (!form.country.trim()) return 'الدولة مطلوبة';
    if (!form.province.trim()) return 'المحافظة مطلوبة';
    if (!form.city.trim()) return 'المدينة مطلوبة';
    if (!form.address.trim()) return 'العنوان مطلوب';
    if (!form.inviteCode.trim()) return 'رمز الدعوة مطلوب';
    if (!form.email.trim()) return 'البريد الإلكتروني مطلوب';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'صيغة البريد الإلكتروني غير صحيحة';
    if (!form.password) return 'كلمة السر مطلوبة';
    if (form.password.length < 8) return 'كلمة السر يجب أن تكون 8 أحرف على الأقل';
    if (form.password !== form.passwordConfirm) return 'كلمة السر وتأكيدها غير متطابقين';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch('/api/producer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          whatsapp: form.whatsapp,
          country: form.country,
          province: form.province,
          city: form.city,
          address: form.address,
          usdtTrc20: form.usdtTrc20,
          shamCashLink: form.shamCashLink,
          shamPaymentCode: form.shamPaymentCode,
          usdtTxid: form.usdtTxid,
          email: form.email,
          password: form.password,
          inviteCode: form.inviteCode,
        }),
      });

      const j = await resp.json();

      if (!resp.ok) {
        setError(j?.message || j?.error || 'فشل التسجيل. حاول لاحقًا');
        setLoading(false);
        return;
      }

      if (j?.ok) {
        setSuccess('تم إنشاء الطلب بنجاح. سنراجع الطلب قريباً.');
        setForm({
          fullName: '',
          whatsapp: '',
          country: '',
          province: '',
          city: '',
          address: '',
          usdtTrc20: '',
          shamCashLink: '',
          shamPaymentCode: '',
          usdtTxid: '',
          email: '',
          password: '',
          passwordConfirm: '',
          inviteCode: '',
        });
      } else {
        // إذا لم يرسل السيرفر ok قد يحتوي على member info مباشرة
        setSuccess('تم إنشاء الطلب بنجاح.');
        setForm({
          fullName: '',
          whatsapp: '',
          country: '',
          province: '',
          city: '',
          address: '',
          usdtTrc20: '',
          shamCashLink: '',
          shamPaymentCode: '',
          usdtTxid: '',
          email: '',
          password: '',
          passwordConfirm: '',
          inviteCode: '',
        });
      }
    } catch (err: any) {
      setError(err?.message ?? String(err) ?? 'خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[#020718] text-white">
      <div className="w-full max-w-3xl">
        <form onSubmit={handleSubmit} className="bg-[#041018] p-6 rounded space-y-4">
          <h1 className="text-2xl font-bold">تسجيل عضو منتج</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.fullName} onChange={(e) => onChange('fullName', e.target.value)} placeholder="الاسم الثلاثي" className="p-2 bg-[#07171b] rounded" />
            <input value={form.whatsapp} onChange={(e) => onChange('whatsapp', e.target.value)} placeholder="رقم الواتساب" className="p-2 bg-[#07171b] rounded" />
            <input value={form.country} onChange={(e) => onChange('country', e.target.value)} placeholder="الدولة" className="p-2 bg-[#07171b] rounded" />
            <input value={form.province} onChange={(e) => onChange('province', e.target.value)} placeholder="المحافظة" className="p-2 bg-[#07171b] rounded" />
            <input value={form.city} onChange={(e) => onChange('city', e.target.value)} placeholder="المدينة" className="p-2 bg-[#07171b] rounded" />
            <input value={form.address} onChange={(e) => onChange('address', e.target.value)} placeholder="العنوان" className="p-2 bg-[#07171b] rounded" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.email} onChange={(e) => onChange('email', e.target.value)} placeholder="البريد الإلكتروني" type="email" className="p-2 bg-[#07171b] rounded" />
            <input value={form.inviteCode} onChange={(e) => onChange('inviteCode', e.target.value)} placeholder="رمز الدعوة" className="p-2 bg-[#07171b] rounded" />
            <input value={form.password} onChange={(e) => onChange('password', e.target.value)} placeholder="كلمة السر" type="password" className="p-2 bg-[#07171b] rounded" />
            <input value={form.passwordConfirm} onChange={(e) => onChange('passwordConfirm', e.target.value)} placeholder="تأكيد كلمة السر" type="password" className="p-2 bg-[#07171b] rounded" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={form.usdtTrc20} onChange={(e) => onChange('usdtTrc20', e.target.value)} placeholder="رابط محفظة USDT TRC20 (اختياري)" className="p-2 bg-[#07171b] rounded" />
            <input value={form.shamCashLink} onChange={(e) => onChange('shamCashLink', e.target.value)} placeholder="رابط شام كاش (اختياري)" className="p-2 bg-[#07171b] rounded" />
            <input value={form.shamPaymentCode} onChange={(e) => onChange('shamPaymentCode', e.target.value)} placeholder="رمز الدفع شام كاش (اختياري)" className="p-2 bg-[#07171b] rounded" />
            <input value={form.usdtTxid} onChange={(e) => onChange('usdtTxid', e.target.value)} placeholder="معرف الدفع TXID (اختياري)" className="p-2 bg-[#07171b] rounded" />
          </div>

          {error && <div className="text-red-400">{error}</div>}
          {success && <div className="text-emerald-400">{success}</div>}

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="px-4 py-2 bg-cyan-600 rounded">
              {loading ? 'جاري التسجيل...' : 'أرسل التسجيل'}
            </button>
            <button type="button" onClick={() => {
              setForm({
                fullName: '',
                whatsapp: '',
                country: '',
                province: '',
                city: '',
                address: '',
                usdtTrc20: '',
                shamCashLink: '',
                shamPaymentCode: '',
                usdtTxid: '',
                email: '',
                password: '',
                passwordConfirm: '',
                inviteCode: '',
              });
              setError(null);
              setSuccess(null);
            }} className="px-4 py-2 bg-white/6 rounded">إعادة تعبئة</button>
          </div>
        </form>
      </div>
    </main>
  );
}