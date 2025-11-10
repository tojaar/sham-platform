'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';

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
  inviteCode: string; // رمز الدعوة الذي وصله من صديقه
};

function validateEmail(e: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function passwordStrength(p: string): string | null {
  if (!p) return 'كلمة السر مطلوبة';
  if (p.length < 8) return 'كلمة السر قصيرة جداً (8 أحرف على الأقل)';
  try {
    const strongUnicode = /(?=.\p{Ll})(?=.\p{Lu})(?=.\d)(?=.[\p{P}\p{S}])/u;
    if (strongUnicode.test(p)) return null;
  } catch {}
  const checks = [/[a-z]/.test(p), /[A-Z]/.test(p), /\d/.test(p), /[^\w\s]/.test(p)];
  return checks.filter(Boolean).length >= 3 ? null : 'ينصح بأن تحتوي كلمة السر على 3 من: أحرف كبيرة، أحرف صغيرة، أرقام، ورموز';
}

// توليد رمز دعوة شخصي فريد للمستخدم الجديد
function generateInviteCodeSelf(seed?: string): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  const time = Date.now().toString(36).toUpperCase().slice(-4);
  const base = (seed || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  return `${base || 'PR'}-${rand}${time};`
}

export default function ProducerSignupPage(): JSX.Element {
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
  const [success, setSuccess] = useState<null | { name: string; whatsapp?: string; email?: string }>(null);
  const [error, setError] = useState<string | null>(null);

  const onChange = (k: keyof FormState, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const validate = () => {
    if (!form.fullName.trim()) return 'الاسم الثلاثي مطلوب';
    if (!form.whatsapp.trim()) return 'رقم الواتساب مطلوب';
    if (!form.country.trim()) return 'الدولة مطلوبة';
    if (!form.province.trim()) return 'المحافظة مطلوبة';
    if (!form.city.trim()) return 'المدينة مطلوبة';
    if (!form.address.trim()) return 'العنوان مطلوب';
    if (!form.inviteCode.trim()) return 'رمز الدعوة مطلوب';
    if (!form.email.trim()) return 'البريد الإلكتروني مطلوب';
    if (!validateEmail(form.email.trim())) return 'صيغة البريد الإلكتروني غير صحيحة';
    const pErr = passwordStrength(form.password);
    if (pErr) return pErr;
    if (form.password !== form.passwordConfirm) return 'كلمة السر وتأكيدها غير متطابقين';
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
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    try {
      const email = form.email.trim().toLowerCase();
      const password = form.password;

      // 1) تأكد عدم وجود producer_members بنفس البريد
      const { data: existingMember, error: existingErr } = await supabase
        .from('producer_members')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingErr) {
        console.warn('check existing member error ', existingErr);
        if (String(existingErr.message).includes('does not exist')) {
          throw new Error('خطأ في قاعدة البيانات: تأكد من وجود عمود email في جدول producer_members.');
        }
        throw existingErr;
      }

      if (existingMember && (existingMember as any).id) {
        setError('هذا البريد مستخدم مسبقًا في نظامنا. الرجاء تسجيل الدخول أو استعادة كلمة السر.');
        setLoading(false);
        return;
      }

      // 2) إنشاء حساب في Supabase Auth (سيبقى غير مُفعّل وظيفياً حتى موافقة الأدمن)
      const { data: signData, error: signError } = await supabase.auth.signUp({ email, password });
      console.log('supabase auth signUp ->', { signData, signError });

      if (signError) {
        const raw = `${signError.message || ''} ${String(signError)};`
        console.error('Supabase signUp error (raw):', raw);
        if (/already registered|user already exists|user exists/i.test(raw)) {
          setError('هذا البريد مُسجّل سابقًا. الرجاء تسجيل الدخول أو طلب استعادة كلمة السر.');
        } else if (/(password|weak|length)/i.test(raw)) {
          setError('كلمة السر لا تفي بمتطلبات الأمان في الخادم. استخدم كلمة سر أقوى أو راجع إعدادات المصادقة.');
        } else if (/(email|invalid)/i.test(raw)) {
          setError('صيغة البريد غير صحيحة أو غير مقبولة من الخادم.');
        } else {
          setError('فشل التسجيل لدى خدمة المصادقة. راجع console للمزيد.');
        }
        setLoading(false);
        return;
      }

      const userId = (signData as any)?.user?.id ?? (signData as any)?.id ?? null;

      // 3) تحديد المدعو (referrer) بناءً على inviteCode الذي أدخله المستخدم
      const codeFromFriend = form.inviteCode.trim();
      let referrer_id: string | null = null;
      let referrer_code: string | null = null;
      let generation = 1;

      if (codeFromFriend) {
        const { data: inviter, error: inviterError } = await supabase
          .from('producer_members')
          .select('id, invite_code_self, referrer_id')
          .or(`invite_code.eq.${codeFromFriend},invite_code_self.eq.${codeFromFriend}`)
          .maybeSingle();

        if (inviterError) {
          console.warn('inviter lookup error', inviterError);
        } else if (inviter && (inviter as any).id) {
          referrer_id = (inviter as any).id;
          // نسمح بالرمز القديم أو الرمز الشخصي الجديد
          referrer_code = (inviter as any).invite_code_self ?? codeFromFriend;
          generation = (inviter as any).referrer_id ? 2 : 1;
        } else {
          setError('رمز الدعوة غير صالح. تأكد من الرمز أو تواصل مع الدعم.');
          setLoading(false);
          return;
        }
      }

      // 4) توليد رمز دعوة شخصي للمستخدم الجديد (invite_code_self)
      const invite_code_self = generateInviteCodeSelf(form.fullName);

      // تحقق عدم تكرار invite_code_self
      const { data: codeExists } = await supabase
        .from('producer_members')
        .select('id')
        .eq('invite_code_self', invite_code_self)
        .maybeSingle();

      if (codeExists && (codeExists as any).id) {
        // لو حصل تصادم (نادر)، أعد توليد الرمز بإضافة ضوضاء
        const invite_code_self_fallback = generateInviteCodeSelf(form.fullName + Math.random().toString(36));
        console.warn('invite_code_self collision, using fallback:', invite_code_self_fallback);
      }

      // 5) إدراج صف العضو في producer_members بحالة pending
      const payload: any = {
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
        email,
        user_id: userId, // يمكن أن يكون null حتى تتم الموافقة
        // رمز الدعوة الذي استخدمه للتسجيل ليُعرف الداعي
        invite_code: codeFromFriend || null,
        referrer_id,
        referrer_code,
        generation,
        // الرمز الشخصي الخاص به لدعوة الآخرين
        invite_code_self,
        status: 'pending',
        created_at: new Date().toISOString(),
      };

      const { data: insertData, error: insertError } = await supabase.from('producer_members').insert([payload]);
      if (insertError) {
        console.error('Insert producer_members error:', insertError);
        const s = `${insertError.message || ''} ${String(insertError)};`
        if (insertError.code === '23505' || /duplicate key value/i.test(s)) {
          setError('هناك قيمة مكرّرة (ربما رمز الدعوة الشخصي أو البريد). تواصل مع الدعم.');
        } else {
          setError('فشل حفظ بيانات العضو. راجع console للمزيد من التفاصيل.');
        }
        setLoading(false);
        return;
      }

      console.log('Inserted producer_members:', insertData);

      setSuccess({ name: payload.full_name, whatsapp: payload.whatsapp, email });
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
    } catch (err: any) {
      console.error('Unexpected signup error:', err);
      const msg = err?.message ?? String(err);
      setError(`${msg} — حدث خطأ غير متوقع أثناء التسجيل.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#02060a] via-[#071118] to-[#061020] text-white antialiased p-6 flex items-center justify-center">
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
              <input value={form.fullName} onChange={(e) => onChange('fullName', e.target.value)} placeholder="مثال: محمد علي حسن" className="w-full px-4 py-3 rounded-md bg-[#07171b] border border-white/6 focus:outline-none focus:border-cyan-400" />
            </div>

            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm text-white/75">رقم الواتساب</label>
              <input value={form.whatsapp} onChange={(e) => onChange('whatsapp', e.target.value)} placeholder="مثال: 9647701234567" className="w-full px-4 py-3 rounded-md bg-[#07171b] border border-white/6 focus:outline-none focus:border-cyan-400" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-white/75">الدولة</label>
                <input value={form.country} onChange={(e) => onChange('country', e.target.value)} placeholder="مثال: العراق" className="w-full px-3 py-2 mt-1 rounded-md bg-[#07171b] border border-white/6 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-white/75">المحافظة</label>
                <input value={form.province} onChange={(e) => onChange('province', e.target.value)} placeholder="مثال: بغداد" className="w-full px-3 py-2 mt-1 rounded-md bg-[#07171b] border border-white/6 focus:outline-none" />
              </div>
              <div>
                <label className="text-sm text-white/75">المدينة</label>
                <input value={form.city} onChange={(e) => onChange('city', e.target.value)} placeholder="مثال: الكرادة" className="w-full px-3 py-2 mt-1 rounded-md bg-[#07171b] border border-white/6 focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="text-sm text-white/75">العنوان (شارع، بناية، تفصيل)</label>
              <input value={form.address} onChange={(e) => onChange('address', e.target.value)} placeholder="مثال: شارع الملكة، عمارة 12، شقة 3" className="w-full px-4 py-3 rounded-md bg-[#07171b] border border-white/6 focus:outline-none" />
            </div>

            <hr className="border-white/6" />

            <div className="text-sm text-white/80 font-semibold mb-1">معلومات الدخول</div>

            <div className="grid grid-cols-1 gap-3">
              <label className="text-sm text-white/75">البريد الإلكتروني</label>
              <input value={form.email} onChange={(e) => onChange('email', e.target.value)} placeholder="example@domain.com" className="w-full px-4 py-3 rounded-md bg-[#07171b] border border-white/6 focus:outline-none focus:border-cyan-400" type="email" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-white/75">كلمة السر</label>
                <input value={form.password} onChange={(e) => onChange('password', e.target.value)} placeholder="كلمة السر" className="w-full px-3 py-2 mt-1 rounded-md bg-[#07171b] border border-white/6 focus:outline-none" type="password" />
              </div>
              <div>
                <label className="text-sm text-white/75">تأكيد كلمة السر</label>
                <input value={form.passwordConfirm} onChange={(e) => onChange('passwordConfirm', e.target.value)} placeholder="أعد كتابة كلمة السر" className="w-full px-3 py-2 mt-1 rounded-md bg-[#07171b] border border-white/6 focus:outline-none" type="password" />
              </div>
            </div>

            <div>
              <label className="text-sm text-white/75">رمز الدعوة (مطلوب)</label>
              <input value={form.inviteCode} onChange={(e) => onChange('inviteCode', e.target.value)} placeholder="أدخل رمز الدعوة الذي تلقيته" className="w-full px-4 py-3 rounded-md bg-[#07171b] border border-white/6 focus:outline-none focus:border-cyan-400" type="text" />
            </div>

            <hr className="border-white/6" />

            <div className="text-sm text-white/80 font-semibold mb-1">معلومات المحفظة وطرق الدفع</div>

            <div>
              <label className="text-sm text-white/75">رابط محفظة USDT TRC20 (اختياري)</label>
              <input value={form.usdtTrc20} onChange={(e) => onChange('usdtTrc20', e.target.value)} placeholder="رابط المحفظة أو عنوان المحفظة" className="w-full px-4 py-3 rounded-md bg-[#07171b] border border-white/6 focus:outline-none" />
            </div>

            <div>
              <label className="text-sm text-white/75">رابط محفظة شام كاش (اختياري)</label>
              <input value={form.shamCashLink} onChange={(e) => onChange('shamCashLink', e.target.value)} placeholder="رابط أو معرف محفظة شام كاش" className="w-full px-4 py-3 rounded-md bg-[#07171b] border border-white/6 focus:outline-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-white/75">رمز الدفع شام كاش (اختياري)</label>
                <input value={form.shamPaymentCode} onChange={(e) => onChange('shamPaymentCode', e.target.value)} placeholder="مثال: 123456" className="w-full px-3 py-2 mt-1 rounded-md bg-[#07171b] border border-white/6 focus:outline-none" />
              </div>

              <div>
                <label className="text-sm text-white/75">معرف الدفع TXID (USDT TRC20) (اختياري)</label>
                <input value={form.usdtTxid} onChange={(e) => onChange('usdtTxid', e.target.value)} placeholder="مثال: 9f2a... (hash)" className="w-full px-3 py-2 mt-1 rounded-md bg-[#07171b] border border-white/6 focus:outline-none" />
              </div>
            </div>

            {error && <div className="text-sm text-red-400">{error}</div>}

            <div className="flex items-center gap-3 mt-2">
              <button type="submit" disabled={loading} className="flex-1 px-4 py-3 rounded-md bg-cyan-600 hover:bg-cyan-700 text-white font-semibold shadow">
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
                    email: '',
                    password: '',
                    passwordConfirm: '',
                    inviteCode: '',
                  });
                  setError(null);
                }}
                className="px-4 py-3 rounded-md bg-white/6 hover:bg-white/10"
              >
                إعادة تعبئة
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
              <a href="/" className="inline-block px-4 py-2 rounded-md bg-white/6 hover:bg-white/10 text-sm">العودة للصفحة الرئيسية</a>
            </div>

            <div className="mt-auto text-xs text-white/60">نوصي بحفظ إيصال الدفع أو رقم المعاملة للرجوع إليه عند الحاجة.</div>
          </aside>
        </div>

        {success && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => setSuccess(null)} />
            <div className="relative max-w-lg w-full bg-[#021018] border border-white/6 rounded-xl p-6 shadow-xl z-10">
              <h2 className="text-2xl font-bold text-cyan-400">شكراً لتسجيلك، {success.name}!</h2>
              <p className="mt-3 text-white/80">
                تم استلام طلبك. سنرسل لك كود الدعوة عبر واتساب على الرقم {success.whatsapp || 'المسجّل'} فور التحقق.
              </p>
              <p className="mt-2 text-white/80">
                احتفظ بهذا البريد وكلمة السر لتسجيل الدخول إلى صفحتك بعد تفعيل الحساب:
                <span className="block mt-1 font-medium text-sm text-cyan-300">{success.email ?? ' — '}</span>
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => setSuccess(null)} className="px-4 py-2 rounded-md bg-white/6">موافق</button>
              </div>
            </div>
          </div>
        )}

        <footer className="mt-8 text-center text-sm text-white/60">© {new Date().getFullYear()} المنصة — الدفع يكون عبر الروابط في الصفحة الرئيسية فقط</footer>
      </div>
    </main>
  );
}