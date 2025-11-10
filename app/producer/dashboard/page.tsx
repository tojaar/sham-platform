'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

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

const LS_PER_USD = 10000;

function usd(value: number) { return `$${value.toLocaleString('en-US')}`; }
function formatLS(v: number) { return v.toLocaleString('en-US'); }

export default function ProducerDashboardPage(): JSX.Element {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userMember, setUserMember] = useState<Member | null>(null);
  const [directs, setDirects] = useState<Member[]>([]);
  const [indirectMap, setIndirectMap] = useState<Record<string, Member[]>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = (sessionData as any)?.session;
        if (!session) {
          // لا جلسة — أعِد توجيه إلى صفحة الدخول
          router.push('/producer/signin');
          return;
        }
        const user = session.user;
        if (!user) {
          router.push('/producer/signin');
          return;
        }

        // fetch the member row for this user
        const { data: memberByUser, error: memErr } = await supabase
          .from<Member>('producer_members')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        let member = memberByUser ?? null;
        // fallback by email
        if (!member) {
          const { data: mByEmail } = await supabase
            .from<Member>('producer_members')
            .select('*')
            .eq('email', user.email)
            .maybeSingle();
          member = mByEmail ?? null;
        }

        if (!member) {
          setError('لم نعثر على صفحة مُنتج مرتبطة بحسابك. تواصل مع الدعم.');
          setLoading(false);
          return;
        }

        setUserMember(member);

        // load directs and indirects (exact same logic as قبل)
        const { data: directRows } = await supabase
          .from<Member>('producer_members')
          .select('*')
          .eq('referrer_id', member.id);

        const directsList = (directRows ?? []).sort((a: any, b: any) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
        setDirects(directsList);

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

          Object.keys(indirectMapTmp).forEach(k => {
            indirectMapTmp[k].sort((a: any, b: any) => new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime());
          });
        }

        setIndirectMap(indirectMapTmp);
      } catch (err: any) {
        console.error('dashboard load error', err);
        setError(String(err?.message ?? err));
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  // compute summary
  const directCount = directs.length;
  const indirectCountTotal = useMemo(() => Object.values(indirectMap).reduce((s, arr) => s + (arr?.length || 0), 0), [indirectMap]);

  // reward calc (same as previous logic)
  const layer1PerInviteUSD = (n: number) => {
    if (n <= 1) return 50;
    if (n === 2) return 60;
    if (n === 3) return 70;
    if (n === 4) return 80;
    if (n === 5) return 90;
    if (n <= 50) return 90;
    return 90;
  };

  const computeLayer1Earnings = (n: number) => {
    let usdTotal = 0;
    for (let i = 1; i <= n; i++) {
      usdTotal += layer1PerInviteUSD(i);
      if (i % 50 === 0) usdTotal += 2500;
    }
    return usdTotal;
  };

  const layer1USD = computeLayer1Earnings(directCount);
  const layer2USD = indirectCountTotal * 10;
  const totalUSD = layer1USD + layer2USD;

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#021014] to-[#03121a] text-slate-100 p-5">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="bg-[#051617] border border-white/6 rounded-xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-400 flex items-center justify-center text-lg font-bold text-[#012021]">
            {userMember?.full_name ? userMember.full_name.split(' ').map(n => n[0]).slice(0,2).join('') : 'U'}
          </div>
          <div>
            <div className="text-lg font-bold">{userMember?.full_name}</div>
            <div className="text-sm text-slate-300">{userMember?.email} • {userMember?.whatsapp}</div>
            <div className="text-xs text-slate-400 mt-1">{userMember?.country}</div>
          </div>
        </header>

        {/* Summary */}
        <section className="bg-[#041e1a] p-4 rounded-xl flex gap-4">
          <div className="flex-1">
            <div className="text-xs text-slate-300">دعوات مباشرة</div>
            <div className="text-2xl font-bold">{directCount}</div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-300">دعوات ثانوية</div>
            <div className="text-2xl font-bold">{indirectCountTotal}</div>
          </div>
          <div className="flex-1">
            <div className="text-xs text-slate-300">أرباح تقريبية</div>
            <div className="text-2xl font-bold">{usd(totalUSD)} <span className="text-xs text-slate-400">({formatLS(Math.round(totalUSD * LS_PER_USD))} ل.س)</span></div>
          </div>
        </section>

        {/* Hierarchy (compact) */}
        <section className="bg-[#051f1c] p-4 rounded-xl">
          <h2 className="font-bold mb-2">هرم الدعوات</h2>
          {directs.length === 0 ? (
            <div className="text-sm text-slate-400">لم تتلقَ دعوات بعد. شارك كودك وابدأ الربح.</div>
          ) : (
            <div className="space-y-3">
              {directs.map(d => (
                <div key={d.id} className="p-3 bg-[#021917] rounded border border-white/6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{d.full_name}</div>
                      <div className="text-xs text-slate-400">{d.whatsapp} • {d.country}</div>
                    </div>
                    <div className="text-sm text-slate-300">دعواته: {(indirectMap[d.id!] || []).length}</div>
                  </div>

                  {(indirectMap[d.id!] || []).length > 0 && (
                    <div className="mt-2 text-xs text-slate-300">دعوات ثانوية:</div>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(indirectMap[d.id!] || []).map(ii => (
                      <div key={ii.id} className="p-2 bg-[#021a19] rounded text-xs">
                        <div className="font-medium">{ii.full_name}</div>
                        <div className="text-xs text-slate-400">{ii.country}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-[#083434] to-[#06323a] rounded-xl p-4 text-center">
          <h3 className="text-lg font-bold">واصل المشاركة — اربح أكثر كلما نمت شبكتك</h3>
          <p className="text-sm text-slate-300 mt-2">نسخ كود الدعوة أو شاركه عبر الشبكات الاجتماعية الآن</p>

          <div className="mt-4 flex gap-3 justify-center">
            <button onClick={() => { navigator.clipboard.writeText(userMember?.invite_code ?? ''); alert('تم نسخ الكود'); }} className="px-4 py-2 bg-white text-[#05201b] rounded font-semibold">نسخ كود الدعوة</button>
            <button onClick={() => alert('مشاركة مباشرة')} className="px-4 py-2 bg-emerald-600 rounded font-semibold text-black">مشاركة</button>
          </div>
        </section>

        <footer className="text-center text-xs text-slate-400">© {new Date().getFullYear()} المنصة</footer>
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