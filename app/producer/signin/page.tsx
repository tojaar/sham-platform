// app/producer/register/page.tsx
'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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

  // for subtle 3D tilt on pointer move (mobile safe: only small transforms)
  const cardRef = useRef<HTMLDivElement | null>(null);

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

  const resetForm = () =>
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

      const j = await resp.json().catch(() => ({} as Record<string, unknown>));

      if (!resp.ok) {
        setError((j?.message as string) ?? (j?.error as string) ?? 'فشل التسجيل. حاول لاحقًا');
        setLoading(false);
        return;
      }

      if ((j as { ok?: boolean }).ok) {
        setSuccess('تم إنشاء الطلب بنجاح. سنراجع الطلب قريباً.');
        resetForm();
      } else {
        setSuccess('تم إنشاء الطلب بنجاح.');
        resetForm();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err ?? 'خطأ غير متوقع');
      setError(msg || 'خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  // زر الدفع يوجّه المستخدم إلى صفحة الدفع دون تغيير منطق التسجيل
  const goToPayment = () => {
    const params = new URLSearchParams();
    if (form.email) params.set('email', form.email);
    params.set('amount', '10');
    router.push(`/producer/payment?${params.toString()}`);
  };

  // pointer tilt handler for desktop; mobile will ignore heavy transforms
  const handlePointerMove = (e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = (x / rect.width) - 0.5;
    const py = (y / rect.height) - 0.5;
    const rotateX = (-py * 6).toFixed(2);
    const rotateY = (px * 6).toFixed(2);
    el.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0);`
  };

  const handlePointerLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = 'rotateX(0deg) rotateY(0deg)';
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#071021] via-[#041226] to-[#021018] p-4">
      <div className="w-full max-w-2xl">
        {/* Header hero */}
        <header className="mb-6 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-amber-400">
              <path d="M12 2l3 6 6 .5-4.5 3.8L18 20l-6-3.5L6 20l1.5-7.7L3 8.5 9 8 12 2z" fill="currentColor" />
            </svg>
            <span className="text-sm text-white/80 font-medium">شبكة المنتجين</span>
          </div>

          <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold leading-tight text-white">
            انضم الآن وابدأ البيع بثقة
          </h1>
          <p className="mt-2 text-sm text-white/70 max-w-xl mx-auto px-4">
            سجل كعضو منتج للوصول إلى أدوات البيع، إدارة الطلبات، ودعم مخصص. تجربة سريعة وآمنة على الهاتف.
          </p>
        </header>

        {/* 3D card */}
        <div
          ref={cardRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="relative rounded-2xl p-1"
          style={{
            perspective: 1400,
          }}
        >
          {/* glow background layers for depth */}
          <div
            aria-hidden
            className="absolute -inset-1 rounded-2xl blur-3xl opacity-30"
            style={{
              background:
                'radial-gradient(600px 200px at 10% 10%, rgba(6,182,212,0.12), transparent), radial-gradient(400px 160px at 90% 90%, rgba(250,204,21,0.08), transparent)',
              zIndex: 0,
            }}
          />

          {/* main card surface */}
          <div
            className="relative z-10 bg-gradient-to-br from-[#041426] to-[#021018] border border-white/6 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 220ms cubic-bezier(.2,.9,.2,1)',
            }}
          >
            <div className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">إنشاء حساب منتج</h2>
                    <p className="text-xs text-white/60 mt-1">ابدأ بملء بياناتك الأساسية — العملية سريعة ومحمية</p>
                  </div>

                  <div className="hidden sm:flex items-center gap-2">
                    <div className="text-xs text-white/60">خطة تجريبية</div>
                    <div className="px-3 py-1 rounded-full bg-amber-400 text-black text-xs font-semibold">مجاناً 7 أيام</div>
                  </div>
                </div>

                {error && <div className="text-sm text-red-300 bg-red-900/20 p-2 rounded">{error}</div>}
                {success && <div className="text-sm text-emerald-200 bg-emerald-900/20 p-2 rounded">{success}</div>}

                {/* inputs grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={form.fullName}
                    onChange={(e) => onChange('fullName', e.target.value)}
                    placeholder="الاسم الثلاثي"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    value={form.whatsapp}
                    onChange={(e) => onChange('whatsapp', e.target.value)}
                    placeholder="رقم الواتساب"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    value={form.country}
                    onChange={(e) => onChange('country', e.target.value)}
                    placeholder="الدولة"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    value={form.province}
                    onChange={(e) => onChange('province', e.target.value)}
                    placeholder="المحافظة"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    value={form.city}
                    onChange={(e) => onChange('city', e.target.value)}
                    placeholder="المدينة"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    value={form.address}
                    onChange={(e) => onChange('address', e.target.value)}
                    placeholder="العنوان"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={form.email}
                    onChange={(e) => onChange('email', e.target.value)}
                    placeholder="البريد الإلكتروني"
                    type="email"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    value={form.inviteCode}
                    onChange={(e) => onChange('inviteCode', e.target.value)}
                    placeholder="رمز الدعوة"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    value={form.password}
                    onChange={(e) => onChange('password', e.target.value)}
                    placeholder="كلمة السر"
                    type="password"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    value={form.passwordConfirm}
                    onChange={(e) => onChange('passwordConfirm', e.target.value)}
                    placeholder="تأكيد كلمة السر"
                    type="password"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    value={form.usdtTrc20}
                    onChange={(e) => onChange('usdtTrc20', e.target.value)}
                    placeholder="محفظة USDT TRC20 (اختياري)"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    value={form.usdtTxid}
                    onChange={(e) => onChange('usdtTxid', e.target.value)}
                    placeholder="معرف الدفع TXID (اختياري)"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    value={form.shamCashLink}
                    onChange={(e) => onChange('shamCashLink', e.target.value)}
                    placeholder="رابط شام كاش (اختياري)"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <input
                    value={form.shamPaymentCode}
                    onChange={(e) => onChange('shamPaymentCode', e.target.value)}
                    placeholder="رمز دفع شام (اختياري)"
                    className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                {/* CTA area */}
                <div className="flex flex-col sm:flex-row items-center gap-3 justify-between mt-2">
                  <div className="w-full sm:w-auto flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 sm:flex-none px-5 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-black font-semibold shadow-lg transform-gpu hover:-translate-y-0.5 transition"
                    >
                      {loading ? 'جاري التسجيل...' : 'أرسل التسجيل'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setError(null);
                        setSuccess(null);
                      }}
                      className="px-4 py-3 rounded-lg bg-white/6 hover:bg-white/10"
                    >
                      إعادة تعبئة
                    </button>
                  </div>

                  <div className="w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={goToPayment}
                      className="w-full sm:w-auto px-5 py-3 rounded-lg bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 text-black font-bold shadow-2xl transform-gpu hover:scale-[1.03] transition"
                      aria-label="انتقل إلى صفحة الدفع"
                    >
                      ادفع الآن
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-white/60">
                  <strong>ملاحظة</strong> يمكنك التسجيل أولاً ثم إتمام الدفع، أو الضغط على "ادفع الآن" للانتقال مباشرةً إلى صفحة الدفع. بيانات النموذج لن تُفقد عند الانتقال.
                </div>
              </form>
            </div>

            {/* footer accent */}
            <div className="border-t border-white/6 px-6 py-3 flex items-center justify-between text-xs text-white/60">
              <div>الخصوصية والأمان مضمونة</div>
              <div className="hidden sm:block">دعم 24/7 • أدوات إدارة متقدمة</div>
            </div>
          </div>
        </div>

        {/* mobile-friendly spacing */}
        <div className="mt-6 text-center text-white/60 text-xs px-4">
          هل تحتاج مساعدة؟ تواصل معنا عبر الواتساب بعد التسجيل أو أثناءه.
        </div>
      </div>
    </main>
  );
}