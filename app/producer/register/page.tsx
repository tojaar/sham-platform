// app/producer/register/page.tsx
'use client';

import React, { useState, useRef } from 'react';

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
  const cardRef = useRef<HTMLDivElement | null>(null);

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

  // which payment method is currently selected to show details
  const [selectedPayment, setSelectedPayment] = useState<'sham' | 'usdt' | null>(null);

  // sample placeholders for payment links (replace with real links later)
  const SHAM_LINK = '5a27f38f59128d7a5412cdd3fbc8565b';
  const USDT_LINK = 'TA9U9BNyypyjqaak1ADoF7J6zcSHX4XfQn';

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
        setSelectedPayment(null);
      } else {
        setSuccess('تم إنشاء الطلب بنجاح.');
        resetForm();
        setSelectedPayment(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err ?? 'خطأ غير متوقع');
      setError(msg || 'خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  // pointer tilt handlers (subtle)
  const handlePointerMove = (e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width - 0.5;
    const py = y / rect.height - 0.5;
    const rotateX = (-py * 6).toFixed(2);
    const rotateY = (px * 6).toFixed(2);
    el.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0);`
  };

  const handlePointerLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.transform = 'rotateX(0deg) rotateY(0deg)';
  };

  // copy to clipboard helper — shows "تم النسخ" on success
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('تم النسخ');
      setTimeout(() => setSuccess(null), 2000);
    } catch {
      setError('فشل نسخ الرابط');
      setTimeout(() => setError(null), 2000);
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
          return { ...s, usdtTrc20: '', usdtTxid: '' };
        }
        if (next === 'usdt') {
          return { ...s, shamCashLink: '', shamPaymentCode: '' };
        }
        return s;
      });
      return next;
    });
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#071021] via-[#041226] to-[#021018] p-4">
      <div className="w-full max-w-2xl">
        <header className="mb-6 text-center">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm mx-auto">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-amber-400">
              <path d="M12 2l3 6 6 .5-4.5 3.8L18 20l-6-3.5L6 20l1.5-7.7L3 8.5 9 8 12 2z" fill="currentColor" />
            </svg>
            <span className="text-sm text-white/80 font-medium">شبكة المنتجين</span>
          </div>

          <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold leading-tight text-white">
            انضم الآن وابدأ الربح بثقة
          </h1>
          <p className="mt-2 text-sm text-white/70 max-w-xl mx-auto px-4">
            سجل كعضو منتج للوصول إلى جني الارباح، إدارة الطلبات، ودعم مخصص. عملية سريعة وآمنة على الهاتف.
          </p>
        </header>

        <div
          ref={cardRef}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          className="relative rounded-2xl p-1"
          style={{ perspective: 1400 }}
        >
          <div
            aria-hidden
            className="absolute -inset-1 rounded-2xl blur-3xl opacity-30"
            style={{
              background:
                'radial-gradient(600px 200px at 10% 10%, rgba(6,182,212,0.12), transparent), radial-gradient(400px 160px at 90% 90%, rgba(250,204,21,0.08), transparent)',
              zIndex: 0,
            }}
          />

          <div
            className="relative z-10 bg-gradient-to-br from-[#041426] to-[#021018] border border-white/6 rounded-2xl shadow-2xl overflow-hidden"
            style={{ transformStyle: 'preserve-3d', transition: 'transform 220ms cubic-bezier(.2,.9,.2,1)' }}
          >
            <div className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-white">إنشاء حساب منتج</h2>
                    <p className="text-xs text-white/60 mt-1">ابدأ بملء بياناتك الأساسية — العملية سريعة ومحمية</p>
                  </div>

                  <div className="hidden sm:flex items-center gap-2">
                    <div className="text-xs text-white/60">شركة انترسبيس العالمية</div>
                    <div className="px-3 py-1 rounded-full bg-amber-400 text-black text-xs font-semibold"> ENTER SPACE </div>
                  </div>
                </div>

                {error && <div className="text-sm text-red-300 bg-red-900/20 p-2 rounded">{error}</div>}
                {success && <div className="text-sm text-emerald-200 bg-emerald-900/20 p-2 rounded">{success}</div>}

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

                {/* Payment-specific fields: visibility controlled by selectedPayment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Sham fields: visible only when selectedPayment === 'sham' */}
                  {selectedPayment === 'sham' && (
                    <>
                      <input
                        value={form.shamCashLink}
                        onChange={(e) => onChange('shamCashLink', e.target.value)}
                        placeholder="عنوان محفظتك على شام كاش  "
                        className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                      <input
                        value={form.shamPaymentCode}
                        onChange={(e) => onChange('shamPaymentCode', e.target.value)}
                        placeholder="رمز دفع شام كاش"
                        className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      />
                    </>
                  )}

                  {/* USDT fields: visible only when selectedPayment === 'usdt' */}
                  {selectedPayment === 'usdt' && (
                    <>
                      <input
                        value={form.usdtTrc20}
                        onChange={(e) => onChange('usdtTrc20', e.target.value)}
                        placeholder="عنوان محفظتك USDT TRC20"
                        className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                      <input
                        value={form.usdtTxid}
                        onChange={(e) => onChange('usdtTxid', e.target.value)}
                        placeholder="معرف الدفع TXID"
                        className="w-full p-3 rounded-lg bg-[#06121a] border border-white/6 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </>
                  )}
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
                        setSelectedPayment(null);
                      }}
                      className="px-4 py-3 rounded-lg bg-white/6 hover:bg-white/10"
                    >
                      إعادة تعبئة
                    </button>
                  </div>

                  <div className="w-full sm:w-auto flex gap-2">
                    {/* Sham Cash button */}
                    <button
                      type="button"
                      onClick={() => togglePayment('sham')}
                      className={`px-4 py-3 rounded-lg font-semibold shadow-md transform-gpu transition w-full sm:w-auto ${
                        selectedPayment === 'sham'
                          ? 'bg-amber-400 text-black scale-[1.02]'
                          : 'bg-white/6 text-white hover:bg-white/10'
                      }`}
                      aria-pressed={selectedPayment === 'sham'}
                    >
                      دفع شام كاش
                    </button>

                    {/* USDT button */}
                    <button
                      type="button"
                      onClick={() => togglePayment('usdt')}
                      className={`px-4 py-3 rounded-lg font-semibold shadow-md transform-gpu transition w-full sm:w-auto ${
                        selectedPayment === 'usdt'
                          ? 'bg-cyan-500 text-black scale-[1.02]'
                          : 'bg-white/6 text-white hover:bg-white/10'
                      }`}
                      aria-pressed={selectedPayment === 'usdt'}
                    >
                      دفع USDT
                    </button>
                  </div>
                </div>

                <div className="mt-3 text-xs text-white/60">
                  <strong>ملاحظة</strong> اختر وسيلة الدفع لعرض الحقول والتعليمات الخاصة بها.
                </div>
              </form>
            </div>

            <div className="border-t border-white/6 px-6 py-3 text-xs text-white/60 flex items-center justify-between">
              <div>الخصوصية والأمان مضمونة</div>
              <div className="hidden sm:block">دعم متكامل • أدوات إدارة متقدمة</div>
            </div>
          </div>
        </div>

        {/* Payment details area */}
        <div className="mt-6 space-y-4">
          {/* Sham Cash details */}
          {selectedPayment === 'sham' && (
            <div className="rounded-lg bg-[#06121a] border border-white/6 p-4 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-amber-300"> طريقة الدفع شام كاش   </h3>
                  <p className="mt-1 text-xs text-white/70">اتبع الخطوات أدناه لإتمام الدفع عبر شام كاش.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(SHAM_LINK)}
                    className="px-3 py-1 rounded bg-white/6 hover:bg-white/10 text-sm"
                  >
                    نسخ العنوان
                  </button>
                </div>
              </div>

              <ol className="mt-3 text-sm text-white/70 list-decimal list-inside space-y-2">
                <li>انسخ العنوان بالضغط على زر نسخ العنوان  .</li>
                <li>اذهب الى حسابك في شام كاش ثم انقر على ارسال .</li>
                <li>الصق العنوان في المحفظة ثم انقر على اضهر الحساب .</li>
                <li>انقر على ارسال ثم اختر نوع العملة سوري .</li>
                <li>ادخل المبلغ 2,000,000 ل.س مليونين ثم انقر ارسال .</li>
                <li>بعد دفع الاشترك اذهب الى الصفحة الرئيسية في شام كاش .</li>
                <li>انقر على تحويلات سوف تجد في السجل رقم العملية في الاعلى يبدأ ب # .</li>
                <li>اكتب هذا الرقم بدقة في صفحة التسجيل داخل حقل..رمز دفع شام كاش.. .</li>
                <li>الان عد الى شام كاش وانقر على استقبال ثم انسخ عنوان محفظتك .</li>
                <li>اذهب الان الى صفحة التسجيل والصق عنوان محفظتك في حقل ..عنوان محفظتك على الشام كاش .. .</li>
                <li>هكذا تكون اتممت عملية الدفع بنجاح .</li>
              </ol>
            </div>
          )}

          {/* USDT details */}
          {selectedPayment === 'usdt' && (
            <div className="rounded-lg bg-[#06121a] border border-white/6 p-4 shadow-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-cyan-300">طريقة دفع USDT</h3>
                  <p className="mt-1 text-xs text-white/70">طريقة الدفع عبر USDT TRC20 — إرشادات سريعة.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => copyToClipboard(USDT_LINK)}
                    className="px-3 py-1 rounded bg-white/6 hover:bg-white/10 text-sm"
                  >
                    نسخ العنوان
                  </button>
                </div>
              </div>

              <ol className="mt-3 text-sm text-white/70 list-decimal list-inside space-y-2">
                <li>يفضل ان يكون العمل على محفظة بينانس Binance  .</li>
                <li>انسخ العنوان بالنقر على زر نسخ العنوان .</li>
                <li>اذهب الى محفظة بينانس .</li>
                <li>انقر عل اصول ثم من الاعلى اختر فورية ثم اختر ارسال  .</li>
                <li>اختر سحب على السلسلة ثم حدد العملة USDT .</li>
                <li>ثم الصق العنوان واختر الشبكة TRS20  .</li>
                <li>ثم حدد المبلغ 200$ وانقر على سحب .</li>
                <li>بعد اتمام الدفع اذهب الى الاصول ثم USDT ثم السجلات  .</li>
                <li>ثم انسخ Txid والصقه في صفحة التسجيل في حقل ..معرف الدفع TXID  .</li>
                <li>الان للنتقل الى وضع عنوان استقبال ارباحك .</li>
                <li>انقر على اصول ثم على اضافة اموال ثم اختر الايداع على السلسلة .</li>
                <li>اختر USDT ثم ثم اختر شبكة TRC20 ثم انسخ عنوان الايداع.</li>
                <li>أذهب الى صفحة التسجيل والصق عنوان الايداع في حقل .. عنوان محفظتك USDT TRC20.. .</li>
              </ol>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-white/60 text-xs px-4">
          تتم مراجعة طلب التسجيل من قبل الادارة . يتم الرد خلال 24 ساعة.
        </div>
      </div>
    </main>
  );
}