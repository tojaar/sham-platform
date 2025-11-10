'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type Member = {
  id: string;
  user_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  country?: string | null;
  invite_code?: string | null;
  referrer_id?: string | null;
  generation?: number | null;
  created_at?: string | null;
};

function formatCurrencyLS(value: number) {
  // Arabic-style thousand separators for L.S
  return value.toLocaleString('en-US');
}

function usd(value: number) {
  return `$${value.toLocaleString('en-US')};`
}

// Reward logic for layer 1 per-invite USD and L.S mapping
const layer1PerInviteUSD = (n: number) => {
  // n is 1-based index of invite
  if (n <= 1) return 50;
  if (n === 2) return 60;
  if (n === 3) return 70;
  if (n === 4) return 80;
  if (n === 5) return 90;
  // from 6..50 => 90
  if (n <= 50) return 90;
  // beyond 50: per-invite stays 90, but every 50 invites gives milestone 2500
  return 90;
};

const LS_PER_USD = 10000; // example conversion (user provided examples) — adjust as needed
// Note: Original values used weird separators like 500,0000; here we map USD -> LS using conversion.
// If you want exact L.S numbers as in prompt, replace conversion or use explicit mapping.

export default function ProducerDashboardPage(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [userMember, setUserMember] = useState<Member | null>(null);
  const [directs, setDirects] = useState<Member[]>([]);
  const [indirectMap, setIndirectMap] = useState<Record<string, Member[]>>({});
  const [error, setError] = useState<string | null>(null);

  // fetch current authenticated user and their producer_members row
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr) throw userErr;
        const user = (userData as any)?.user;
        if (!user) {
          setError('لم يتم العثور على جلسة مستخدم. الرجاء تسجيل الدخول.');
          setLoading(false);
          return;
        }

        // Prefer lookup by user.id in producer_members
        const { data: memberByUser, error: memErr } = await supabase
          .from<Member>('producer_members')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        let member: Member | null = memberByUser ?? null;

        // fallback: lookup by email if no user_id row
        if (!member) {
          const { data: memberByEmail } = await supabase
            .from<Member>('producer_members')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();
          member = memberByEmail ?? null;
        }

        if (!member) {
          setError('لم يتم العثور على صف المنتج الخاص بك. تواصل مع الدعم.');
          setLoading(false);
          return;
        }

        setUserMember(member);

        // fetch directs: those whose referrer_id == member.id and generation === 1
        const { data: directRows } = await supabase
          .from<Member>('producer_members')
          .select('*')
          .eq('referrer_id', member.id);

        const directsList = (directRows ?? []).sort((a: any, b: any) => {
          return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
        });
        setDirects(directsList);

        // for each direct, fetch their directs (generation of those is likely 2 or referrer_id equals direct.id)
        const indirectMapTmp: Record<string, Member[]> = {};
        if (directsList.length > 0) {
          const directIds = directsList.map(d => d.id);
          const { data: indirectRows } = await supabase
            .from<Member>('producer_members')
            .select('*')
            .in('referrer_id', directIds);

          (indirectRows ?? []).forEach((ir) => {
            const rid = ir.referrer_id!;
            if (!indirectMapTmp[rid]) indirectMapTmp[rid] = [];
            indirectMapTmp[rid].push(ir);
          });

          // sort each list by created_at desc
          Object.keys(indirectMapTmp).forEach(k => {
            indirectMapTmp[k].sort((a: any, b: any) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
          });
        }

        setIndirectMap(indirectMapTmp);
      } catch (err: any) {
        console.error('producer dashboard error', err);
        setError(String(err?.message ?? err));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // counts
  const directCount = directs.length;
  const indirectCountTotal = useMemo(() => {
    return Object.values(indirectMap).reduce((s, arr) => s + (arr?.length || 0), 0);
  }, [indirectMap]);

  const totalInvitesLayer1 = directCount; // layer1 invites are directs
  const totalInvitesLayer2 = indirectCountTotal;

  // compute earnings for layer1 up to N direct invites
  const computeLayer1Earnings = (n: number) => {
    let usdTotal = 0;
    for (let i = 1; i <= n; i++) {
      usdTotal += layer1PerInviteUSD(i);
      // milestone handling: every 50 invites gives 2500$ bonus (in addition to per-invite)
      // As per spec: at 50 invites you "earn" 2500$ — interpreted as additional milestone bonus.
      // So include milestone bonuses for completed 50-chunks.
      if (i % 50 === 0) {
        usdTotal += 2500;
      }
    }
    return usdTotal;
  };

  // compute layer2 earnings: each invite $10
  const computeLayer2Earnings = (n: number) => {
    return n * 10;
  };

  // combined earnings in USD and LS
  const layer1USD = computeLayer1Earnings(totalInvitesLayer1);
  const layer2USD = computeLayer2Earnings(totalInvitesLayer2);
  const totalUSD = layer1USD + layer2USD;

  // convert to L.S (approx), if you prefer exact mapping provide exact LS numbers per spec
  const layer1LS = Math.round(layer1USD * LS_PER_USD);
  const layer2LS = Math.round(layer2USD * LS_PER_USD);
  const totalLS = Math.round(totalUSD * LS_PER_USD);

  // progress to next small milestone: e.g., next per-invite higher bracket or next 50 milestone
  const nextDirectIndex = directCount + 1; // next invite index
  const nextPerInviteUSD = layer1PerInviteUSD(nextDirectIndex);
  // next 50 milestone progress
  const invitesToNext50 = 50 - (directCount % 50);
  const percentToNext50 = ((directCount % 50) / 50) * 100;

  // reward ladder preview up to 10 entries (for display)
  const ladderPreview = useMemo(() => {
    const arr: { i: number; usd: number }[] = [];
    for (let i = 1; i <= Math.max(10, Math.min(50, Math.max(directCount + 5, 10))); i++) {
      arr.push({ i, usd: layer1PerInviteUSD(i) });
    }
    return arr;
  }, [directCount]);

  // UX helpers
  const short = (s?: string | null) => s ? s : '-';

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#021014] to-[#03121a] text-slate-100 p-5">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="bg-[#051617] border border-white/6 rounded-xl p-4 flex gap-4 items-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center text-xl font-bold text-[#012021]">
            {userMember?.full_name ? userMember.full_name.split(' ').map(n => n[0]).slice(0,2).join('') : 'U'}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold">{userMember?.full_name ?? 'اسم المستخدم'}</h1>
                <div className="text-sm text-slate-300">{userMember?.email ?? '—'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-300">دولتك</div>
                <div className="font-medium">{short(userMember?.country)}</div>
              </div>
            </div>

            <div className="mt-3 flex gap-3 items-center">
              <div className="px-3 py-2 bg-[#022b2a] rounded">
                <div className="text-xs text-slate-300">واتساب</div>
                <div className="font-medium">{short(userMember?.whatsapp)}</div>
              </div>

              <div className="px-3 py-2 bg-[#022b2a] rounded">
                <div className="text-xs text-slate-300">كود الدعوة</div>
                <div className="font-medium">{short(userMember?.invite_code)}</div>
              </div>

              <div className="px-3 py-2 bg-[#022b2a] rounded">
                <div className="text-xs text-slate-300">الطبقة</div>
                <div className="font-medium">هرم ذو طبقتين</div>
              </div>
            </div>
          </div>
        </header>

        {/* Summary cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#041e1a] p-4 rounded-xl border border-white/4">
            <div className="text-sm text-slate-300">دعوات مباشرة (الطبقة الأولى)</div>
            <div className="mt-2 text-2xl font-bold">{directCount}</div>
            <div className="text-xs text-slate-400 mt-1">إجمالي المدعوين الذين استخدموا كودك مباشرة</div>
          </div>

          <div className="bg-[#041e1a] p-4 rounded-xl border border-white/4">
            <div className="text-sm text-slate-300">دعوات ثانوية (الطبقة الثانية)</div>
            <div className="mt-2 text-2xl font-bold">{totalInvitesLayer2}</div>
            <div className="text-xs text-slate-400 mt-1">المدعوين عبر دعوات المدعوين المباشرين</div>
          </div>

          <div className="bg-[#041e1a] p-4 rounded-xl border border-white/4">
            <div className="text-sm text-slate-300">أرباح متوقعة</div>
            <div className="mt-2 text-2xl font-bold">{usd(totalUSD)}</div>
            <div className="text-xs text-slate-400 mt-1">{formatCurrencyLS(totalLS)} ل.س (تقريبي)</div>
          </div>
        </section>

        {/* Ladder + progress */}
        <section className="bg-[#051f1c] border border-white/6 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">سلم المكافآت — الطبقة الأولى</h2>
            <div className="text-sm text-slate-300">كل 50 دعوة تمنح مكافأة إضافية 2,500$</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <div className="space-y-2">
                {ladderPreview.map(item => {
                  const reached = item.i <= directCount;
                  const usdAmt = item.usd;
                  const lsAmt = Math.round(usdAmt * LS_PER_USD);
                  return (
                    <div key={item.i} className={`flex items-center justify-between p-3 rounded ${reached ? 'bg-[#062b2b]' : 'bg-[#022221]'} border border-white/6`}>
                      <div>
                        <div className="text-sm text-slate-300">دعوة رقم {item.i}</div>
                        <div className="font-medium">{usd(usdAmt)} • {formatCurrencyLS(lsAmt)} ل.س</div>
                      </div>
                      <div className="text-xs text-slate-400">{reached ? 'مُسجل' : 'لم يتحقق بعد'}</div>
                    </div>
                  );
                })}

                {/* milestone info */}
                <div className="mt-3 p-3 rounded bg-[#022a27] border border-white/6">
                  <div className="text-sm text-slate-300">التقدم للمكافأة التالية (كل 50 دعوة)</div>
                  <div className="mt-2">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-[#02221f] rounded overflow-hidden">
                        <div className="h-3 bg-emerald-400" style={{ width: `${percentToNext50}%` }} />
                      </div>
                      <div className="text-xs text-slate-300">{directCount % 50} / 50</div>
                    </div>
                    <div className="text-xs text-slate-300 mt-2">باقي {invitesToNext50} دعوات للحصول على مكافأة 2,500$</div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="p-3 bg-[#021916] rounded border border-white/6">
              <div className="text-sm text-slate-300">الدعوة القادمة</div>
              <div className="mt-2 font-semibold text-lg">{usd(nextPerInviteUSD)} <span className="text-sm text-slate-400">({formatCurrencyLS(nextPerInviteUSD * LS_PER_USD)} ل.س)</span></div>
              <div className="text-xs text-slate-300 mt-2">احصل على هذه القيمة عندما يُسجل المدعو رقم {nextDirectIndex}</div>

              <div className="mt-4 border-t border-white/6 pt-3">
                <div className="text-sm text-slate-300">إجمالي أرباح الطبقة الثانية</div>
                <div className="mt-2 font-semibold">{usd(layer2USD)} <span className="text-sm text-slate-400">({formatCurrencyLS(layer2LS)} ل.س)</span></div>
                <div className="text-xs text-slate-400 mt-2">الطبقة الثانية تمنح {usd(10)} لكل دعوة</div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard?.writeText(userMember?.invite_code ?? '');
                  alert('تم نسخ كود الدعوة إلى الحافظة');
                }}
                className="mt-4 w-full px-3 py-2 bg-cyan-600 rounded text-black font-semibold"
              >
                نسخ كود الدعوة
              </button>
            </aside>
          </div>
        </section>

        {/* Hierarchy lists */}
        <section className="bg-[#051f1c] border border-white/6 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">قائمة الأشخاص المدعوين</h2>
            <div className="text-sm text-slate-300">هرم ذو طبقتين</div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm text-slate-300 mb-2">دعوات مباشرة ({directCount})</h3>
              {directs.length === 0 && <div className="text-sm text-slate-400">لم يتم دعوة أي شخص بعد. شارك كودك لتبدأ الكسب.</div>}
              <ul className="space-y-2">
                {directs.map(d => (
                  <li key={d.id} className="p-3 bg-[#021917] rounded border border-white/6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{d.full_name}</div>
                        <div className="text-xs text-slate-400">{d.whatsapp} • {d.country}</div>
                        <div className="text-xs text-slate-400 mt-1">انضم: {d.created_at ? new Date(d.created_at).toLocaleString() : '-'}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-slate-300">{d.invite_code}</div>
                        <div className="text-xs text-slate-400 mt-1">دعواته: {(indirectMap[d.id!] || []).length}</div>
                      </div>
                    </div>

                    {/* indirect under each direct */}
                    <div className="mt-3 bg-[#031f1c] p-3 rounded">
                      <div className="text-xs text-slate-300 mb-2">أشخاص تم الانضمام عن طريق {d.full_name}</div>
                      {(indirectMap[d.id!] || []).length === 0 && <div className="text-xs text-slate-400">لا يوجد مدعوين بعد.</div>}
                      <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(indirectMap[d.id!] || []).map(ii => (
                          <li key={ii.id} className="p-2 bg-[#021a19] rounded">
                            <div className="font-medium text-sm">{ii.full_name}</div>
                            <div className="text-xs text-slate-400">{ii.country} • {ii.created_at ? new Date(ii.created_at).toLocaleDateString() : '-'}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section className="bg-gradient-to-r from-[#083434] to-[#06323a] rounded-xl p-4 text-center">
          <h3 className="text-xl font-bold">استمر في النمو — كل دعوة تقربك أكثر من المكافآت</h3>
          <p className="mt-2 text-slate-300">شارك كودك الآن، تابع تقدمك هنا، واحصل على مكافآت دورية عند الوصول إلى كل 50 دعوة.</p>

          <div className="mt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => navigator.clipboard?.writeText(userMember?.invite_code ?? '')} className="px-4 py-2 bg-white text-[#05201b] rounded font-semibold">نسخ كود الدعوة</button>
            <button onClick={() => alert('شارك رابط التسجيل مع كود الدعوة المرفق أو عبر الشبكات الاجتماعية')} className="px-4 py-2 bg-emerald-600 text-black rounded font-semibold">مشاركة</button>
          </div>
        </section>

        <footer className="text-center text-xs text-slate-400">© {new Date().getFullYear()} المنصة — احرص على متابعة القواعد وشروط السحب</footer>
      </div>

      {loading && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-black/50 p-6 rounded text-white">جارٍ التحميل...</div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-6 right-6 bg-rose-600 text-white px-4 py-2 rounded">{error}</div>
      )}
    </main>
  );
}