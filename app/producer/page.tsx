'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ProducerSignupPage(): JSX.Element {
  const [form, setForm] = useState({
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
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ name: string; whatsapp?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onChange = (k: keyof typeof form, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const validate = () => {
    if (!form.fullName.trim()) return 'الاسم الثلاثي مطلوب';
    if (!form.whatsapp.trim()) return 'رقم الواتساب مطلوب';
    if (!form.country.trim()) return 'الدولة مطلوبة';
    if (!form.province.trim()) return 'المحافظة مطلوبة';
    if (!form.city.trim()) return 'المدينة مطلوبة';
    if (!form.address.trim()) return 'العنوان مطلوب';
    // at least one payment proof (either shamPaymentCode or usdtTxid or links)
    if (
      !form.usdtTrc20.trim() &&
      !form.shamCashLink.trim() &&
      !form.shamPaymentCode.trim() &&
      !form.usdtTxid.trim()
    ) return 'يرجى إدخال وسيلة دفع واحدة على الأقل أو معرف الدفع';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) { setError(v); return; }

    setLoading(true);
    try {
      const payload = {
        full_name: form.fullName.trim(),
        whatsapp: form.whatsapp.trim(),
        country: form.country.trim(),
        province: form.province.trim(),
        city: form.city.trim(),
        address: form.address.trim(),
        usdt_trc20_link: form.usdtTrc20.trim() || null,
        sham_cash_link: form.shamCashLink.trim() || null,
        sham_payment_code: form.shamPaymentCode.trim() || null,
        usdt_txid: form.usdtTxid.trim() || null,
        created_at: new Date().toISOString(),
        status: 'pending',
      };

      const { data, error: insertError } = await supabase
        .from('producer_members')
        .insert([payload]);

      if (insertError) {
        console.error('Insert error', insertError);
        setError('حدث خطأ أثناء تسجيلك. حاول لاحقاً.');
        setLoading(false);
        return;
      }

      setSuccess({ name: payload.full_name, whatsapp: payload.whatsapp });
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
      });
    } catch (err) {
      console.error(err);
      setError('خطأ غير متوقع. حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#02060a] via-[#071118] to-[#061020] text-white antialiased flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-extrabold">انضم كعضو منتج</h1>
          <p className="mt-2 text-white/70 max-w-2xl mx-auto">
            املأ نموذج الانضمام أدناه. الدفع يتم عن طريق روابط المحفظة في الصفحة الرئيسية، ثم سجّل هنا لإكمال التسجيل واستلام كود الدعوة عبر واتساب.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form onSubmit={handleSubmit} className="bg-[#041018] border border-white/6 rounded-xl p-6 shadow-lg space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm text-white/75">الاسم الثلاثي</label>
              <input
                value={form.fullName}
                onChange={(e) => onChange('fullName', e.target.value)}
                placeholder="مثال: محمد علي حسن"
                className="w-full px-4 py-3 rounded-md bg-[#07171b] border border-white/6 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm text-white/75">رقم الواتساب</label>
              <input
                value={form.whatsapp}
                onChange={(e) => onChange('whatsapp', e.target.value)}
                placeholder="مثال: 9647701234567"
                className="w-full px-4 py-3 rounded-md bg-[#07171b] border border-white/6 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-white/75">الدولة</label>
                <input
                  value={form.country}
                  onChange={(e) => onChange('country', e.target.value)}
                  placeholder="مثال: العراق"
                  className="w-full px-3 py-2 mt-1 rounded-md bg-[#07171b] border border-white/6 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-white/75">المحافظة</label>
                <input
                  value={form.province}
                  onChange={(e) => onChange('province', e.target.value)}
                  placeholder="مثال: بغداد"
                  className="w-full px-3 py-2 mt-1 rounded-md bg-[#07171b] border border-white/6 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm text-white/75">المدينة</label>
                <input
                  value={form.city}
                  onChange={(e) => onChange('city', e.target.value)}
                  placeholder="مثال: الكرادة"
                  className="w-full px-3 py-2 mt-1 rounded-md bg-[#07171b] border border-white/6 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-white/75">العنوان (شارع، بناية، تفصيل)</label>
              <input
                value={form.address}
                onChange={(e) => onChange('address', e.target.value)}
                placeholder="مثال: شارع الملكة، عمارة 12، شقة 3"
                className="w-full px-4 py-3 rounded-md bg-[#07171b] border border-white/6 focus:outline-none"
              />
            </div>

            <hr className="border-white/6" />

            <div className="text-sm text-white/80 font-semibold mb-1">معلومات المحفظة وطرق الدفع</div>

            <div>
              <label className="text-sm text-white/75">رابط محفظة USDT TRC20 (اختياري)</label>
              <input
                value={form.usdtTrc20}
                onChange={(e) => onChange('usdtTrc20', e.target.value)}
                placeholder="رابط المحفظة أو عنوان المحفظة"
                className="w-full px-4 py-3 rounded-md bg-[#07171b] border border-white/6 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-white/75">رابط محفظة شام كاش (اختياري)</label>
              <input
                value={form.shamCashLink}
                onChange={(e) => onChange('shamCashLink', e.target.value)}
                placeholder="رابط أو معرف محفظة شام كاش"
                className="w-full px-4 py-3 rounded-md bg-[#07171b] border border-white/6 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-white/75">رمز الدفع شام كاش (اختياري)</label>
                <input
                  value={form.shamPaymentCode}
                  onChange={(e) => onChange('shamPaymentCode', e.target.value)}
                  placeholder="مثال: 123456"
                  className="w-full px-3 py-2 mt-1 rounded-md bg-[#07171b] border border-white/6 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-white/75">معرف الدفع TXID (USDT TRC20) (اختياري)</label>
                <input
                  value={form.usdtTxid}
                  onChange={(e) => onChange('usdtTxid', e.target.value)}
                  placeholder="مثال: 9f2a... (hash)"
                  className="w-full px-3 py-2 mt-1 rounded-md bg-[#07171b] border border-white/6 focus:outline-none"
                />
              </div>
            </div>

            {error && <div className="text-sm text-red-400">{error}</div>}

            <div className="flex items-center gap-3 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow"
              >
                {loading ? 'جاري التسجيل...' : 'أكمل التسجيل'}
              </button>

              <button
                type="button"
                onClick={() => {
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
                  });
                  setError(null);
                }}
                className="px-4 py-3 rounded-md bg-white/6 hover:bg-white/10"
              >
                إعادة تعبية
              </button>
            </div>
          </form>

          <aside className="bg-[#04121a] border border-white/6 rounded-xl p-6 shadow-lg flex flex-col gap-4">
            <div className="text-lg font-bold">لماذا تنضم الآن؟</div>
            <ul className="list-disc pl-5 text-white/80 space-y-2">
              <li>استقبل أوامر مباشرة من الزبائن عبر المنصة.</li>
              <li>احصل على كود دعوة لتبدأ جني الأرباح فور تفعيل الحساب.</li>
              <li>دعم فني ومجموعة موارد لتسريع انطلاقتك.</li>
            </ul>

            <div className="pt-2">
              <div className="text-sm text-white/70">ملاحظة مهمة</div>
              <p className="text-sm text-white/60 mt-2">
                الدفع يكون على الروابط الموجودة في الصفحة الرئيسية. ادفع ثم قم بالتسجيل وسوف نرسل لك كود الدعوة عبر واتساب لتبدأ بعدها جني أرباحك بشكل مباشر.
              </p>
            </div>

            <div className="mt-4">
              <a
                href="/"
                className="inline-block px-4 py-2 rounded-md bg-white/6 hover:bg-white/10 text-sm"
              >
                العودة للصفحة الرئيسية
              </a>
            </div>

            <div className="mt-auto text-xs text-white/60">نوصي بحفظ إيصال الدفع أو رقم المعاملة للرجوع إليه عند الحاجة.</div>
          </aside>
        </div>

        {/* رسالة الشكر بعد التسجيل */}
        {success && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => setSuccess(null)} />
            <div className="relative max-w-lg w-full bg-[#021018] border border-white/6 rounded-xl p-6 shadow-xl z-10">
              <h2 className="text-2xl font-bold text-cyan-400">شكراً لتسجيلك، {success.name}!</h2>
              <p className="mt-3 text-white/80">
                تم استلام طلبك. سنرسل لك كود الدعوة عبر واتساب على الرقم {success.whatsapp || 'المسجّل'} فور التحقق.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setSuccess(null)} className="px-4 py-2 rounded-md bg-white/6">موافق</button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8 text-center text-sm text-white/60">
          © {new Date().getFullYear()} المنصة — الدفع يكون عبر الروابط في الصفحة الرئيسية فقط
        </footer>
      </div>
    </main>
  );
}