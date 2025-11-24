// app/admin/member/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Member = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  status?: string | null;
  invite_code?: string | null;
  invite_code_self?: number | null;
  usdt_trc20?: string | null;
  sham_cash_link?: string | null;
  sham_payment_code?: string | null;
  usdt_txid?: string | null;
  user_id?: string | null;
  created_at?: string | null;
  invited_selected?: boolean | null;
  [key: string]: unknown;
};

export default function MemberDetailPage() {
  const params = useParams();
  const id = params?.id as string | undefined;

  const [member, setMember] = useState<Member | null>(null);
  const [level1, setLevel1] = useState<Member[]>([]);
  const [level2, setLevel2] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedL1, setSelectedL1] = useState<Record<string, boolean>>({});
  const [selectedL2, setSelectedL2] = useState<Record<string, boolean>>({});
  const [batchProcessing, setBatchProcessing] = useState(false);

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  async function fetchDetail(): Promise<void> {
    if (!id) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/admin/members/${id}`);
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        alert(j?.message || j?.error || 'فشل جلب التفاصيل');
        setMember(null);
        setLevel1([]);
        setLevel2([]);
        return;
      }

      setMember((j.member ?? null) as Member | null);
      const l1 = Array.isArray(j.referrals?.level1) ? (j.referrals.level1 as Member[]) : [];
      const l2 = Array.isArray(j.referrals?.level2) ? (j.referrals.level2 as Member[]) : [];
      setLevel1(l1);
      setLevel2(l2);

      // ابني حالات التحديد من الحقل persisted invited_selected
      const s1: Record<string, boolean> = {};
      l1.forEach((x: Member) => { if (x?.id) s1[x.id] = !!x.invited_selected; });
      setSelectedL1(s1);

      const s2: Record<string, boolean> = {};
      l2.forEach((x: Member) => { if (x?.id) s2[x.id] = !!x.invited_selected; });
      setSelectedL2(s2);
    } catch (err) {
      console.error('fetchDetail error', err);
      alert('خطأ في الشبكة أثناء جلب التفاصيل');
      setMember(null);
      setLevel1([]);
      setLevel2([]);
    } finally {
      setLoading(false);
    }
  }

  async function doAction(action: 'approve' | 'reject' | 'delete'): Promise<void> {
    if (!id) return;
    if (!confirm(`تاكيد ${action}`)) return;
    try {
      const resp = await fetch(`/api/admin/members/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const j = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        alert(j?.message || j?.error || 'فشل العملية');
      } else {
        alert('تم التحديث');
        await fetchDetail();
      }
    } catch (err) {
      console.error(err);
      alert('خطأ في الشبكة أثناء التحديث');
    }
  }

  // حفظ حالة اختيار مفردة فورياً
  async function toggleSelected(level: 1 | 2, memberId: string): Promise<void> {
    const current = level === 1 ? !!selectedL1[memberId] : !!selectedL2[memberId];
    // تحديث واجهة فورية
    if (level === 1) setSelectedL1(s => ({ ...s, [memberId]: !current }));
    else setSelectedL2(s => ({ ...s, [memberId]: !current }));

    // احفظ في DB
    try {
      const resp = await fetch(`/api/admin/members/${memberId}/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selected: !current }),
      });
      if (!resp.ok) {
        // تراجع محلي عند الفشل
        if (level === 1) setSelectedL1(s => ({ ...s, [memberId]: current }));
        else setSelectedL2(s => ({ ...s, [memberId]: current }));
        const txt = await resp.text().catch(() => '');
        console.error('persist selection failed', txt);
        alert('فشل حفظ الاختيار على الخادم');
      }
    } catch (err) {
      if (level === 1) setSelectedL1(s => ({ ...s, [memberId]: current }));
      else setSelectedL2(s => ({ ...s, [memberId]: current }));
      console.error(err);
      alert('خطأ في الشبكة عند حفظ الاختيار');
    }
  }

  // batch action على المحددين (approve/reject/delete)
  async function batchActionOnSelected(level: 1 | 2, action: 'approve' | 'reject' | 'delete'): Promise<void> {
    const selectedIds = level === 1
      ? Object.keys(selectedL1).filter(k => selectedL1[k])
      : Object.keys(selectedL2).filter(k => selectedL2[k]);

    if (selectedIds.length === 0) { alert('اختر عناصر أولاً'); return; }
    if (!confirm(`تاكيد ${action} على ${selectedIds.length} عضواً؟`)) return;

    setBatchProcessing(true);
    try {
      for (const memberId of selectedIds) {
        const r1 = await fetch(`/api/admin/members/${memberId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        if (!r1.ok) {
          console.error('batch item failed', memberId, await r1.text().catch(() => ''));
        }
      }
      alert('اكتمل التحديث للمحددين');
      await fetchDetail();
    } catch (err) {
      console.error('batchAction error', err);
      alert('خطأ في الشبكة أثناء العملية الجماعية');
    } finally {
      setBatchProcessing(false);
    }
  }

  // إلغاء/تحديد جميع عناصر المستوى
  function toggleSelectAll(level: 1 | 2, value: boolean) {
    if (level === 1) {
      const s: Record<string, boolean> = {};
      level1.forEach(x => { if (x?.id) s[x.id] = value; });
      setSelectedL1(s);
    } else {
      const s: Record<string, boolean> = {};
      level2.forEach(x => { if (x?.id) s[x.id] = value; });
      setSelectedL2(s);
    }
  }

  return (
    <main className="p-6 bg-gradient-to-b from-[#02121a] to-[#000814] min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{member?.full_name ?? 'تفاصيل العضو'}</h2>
            <div className="text-sm text-neutral-400">{member?.email ?? ''}</div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/dashboard" className="px-3 py-1 bg-white/6 rounded">العودة</Link>
            <button onClick={() => doAction('approve')} className="px-3 py-1 bg-emerald-600 rounded">قبول</button>
            <button onClick={() => doAction('reject')} className="px-3 py-1 bg-orange-500 rounded">رفض</button>
            <button onClick={() => doAction('delete')} className="px-3 py-1 bg-red-600 rounded">حذف</button>
          </div>
        </div>

        {loading ? <div>جاري التحميل...</div> : member ? (
          <div className="grid grid-cols-1 gap-4">
            <section className="p-4 bg-[#041018] rounded shadow">
              <h3 className="font-semibold mb-3">المعلومات الأساسية</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div className="break-words"><strong>الاسم:</strong> {member.full_name}</div>
                <div className="break-words"><strong>الحالة:</strong> <span className="px-2 py-1 rounded bg-yellow-600 text-sm">{member.status}</span></div>
                <div className="break-words"><strong>البريد:</strong> {member.email ?? '-'}</div>
                <div className="break-words"><strong>واتساب:</strong> {member.whatsapp ?? '-'}</div>
                <div className="break-words"><strong>الدولة:</strong> {member.country ?? '-'}</div>
                <div className="break-words"><strong>المحافظة / المدينة:</strong> {(member.province ?? '-') + ' / ' + (member.city ?? '-')}</div>
                <div className="md:col-span-2 break-words"><strong>العنوان:</strong> {member.address ?? '-'}</div>
                <div className="break-words"><strong>invite_code (used):</strong> {member.invite_code ?? '-'}</div>
                <div className="break-words"><strong>invite_code_self:</strong> {member.invite_code_self ?? '-'}</div>
                <div className="break-words"><strong>USDT TRC20:</strong> {member.usdt_trc20 ?? '-'}</div>
                <div className="break-words"><strong>شام كاش:</strong> {member.sham_cash_link ?? '-'} / {member.sham_payment_code ?? '-'}</div>
                <div className="md:col-span-2 break-words"><strong>TXID:</strong> {member.usdt_txid ?? '-'}</div>
                <div className="break-words"><strong>معرّف المستخدم Auth:</strong> {member.user_id ?? '-'}</div>
                <div className="break-words"><strong>تاريخ الإنشاء:</strong> {member.created_at ? new Date(member.created_at).toLocaleString() : '-'}</div>
              </div>
            </section>

            <section className="p-4 bg-[#041018] rounded shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">هرم الدعوات — مستويان</h3>
                <div className="flex gap-2 items-center">
                  <button disabled={batchProcessing} onClick={() => batchActionOnSelected(1, 'approve')} className="px-2 py-1 bg-emerald-600 rounded text-sm">قبول المحدد (مستوى1)</button>
                  <button disabled={batchProcessing} onClick={() => batchActionOnSelected(2, 'approve')} className="px-2 py-1 bg-emerald-600 rounded text-sm">قبول المحدد (مستوى2)</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* LEVEL 1 */}
                <div className="p-3 bg-[#02121a] rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">المستوى الأول ({level1.length})</div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-neutral-400">تحديد الكل</label>
                      <input type="checkbox" onChange={(e) => toggleSelectAll(1, e.target.checked)} />
                    </div>
                  </div>

                  <ul className="space-y-2 max-h-64 overflow-auto">
                    {level1.map(l => (
                      <li key={l.id} className="flex items-start justify-between p-2 bg-[#07171b] rounded">
                        <div className="flex gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={!!selectedL1[l.id]}
                            onChange={() => toggleSelected(1, l.id)}
                            aria-label={`select-level1-${l.id}`}
                          />
                          <div className="min-w-0">
                            <div className="font-medium break-words">{l.full_name}</div>
                            <div className="text-xs text-neutral-400 break-words">{l.email ?? '-'} • {l.whatsapp ?? '-'}</div>
                            <div className="text-xs text-neutral-300 break-words">invite_code: {l.invite_code ?? '-'} — invite_code_self: {l.invite_code_self ?? '-'}</div>
                            <div className="text-xs text-neutral-300 break-words">موقع: {(l.country ? l.country + ' / ' : '') + (l.city ?? '')}</div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className={`px-2 py-1 rounded text-sm ${l.status === 'approved' ? 'bg-emerald-600' : l.status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'}`}>
                            {l.status ?? 'pending'}
                          </div>
                          <Link href={`/admin/member/${l.id}`} className="text-xs underline">عرض</Link>
                        </div>
                      </li>
                    ))}
                    {level1.length === 0 && <li className="text-sm text-neutral-400">لا مدعوين مباشرين</li>}
                  </ul>
                </div>

                {/* LEVEL 2 */}
                <div className="p-3 bg-[#02121a] rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">المستوى الثاني ({level2.length})</div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-neutral-400">تحديد الكل</label>
                      <input type="checkbox" onChange={(e) => toggleSelectAll(2, e.target.checked)} />
                    </div>
                  </div>

                  <ul className="space-y-2 max-h-64 overflow-auto">
                    {level2.map(l => (
                      <li key={l.id} className="flex items-start justify-between p-2 bg-[#07171b] rounded">
                        <div className="flex gap-3 min-w-0">
                          <input
                            type="checkbox"
                            checked={!!selectedL2[l.id]}
                            onChange={() => toggleSelected(2, l.id)}
                            aria-label={`select-level2-${l.id}`}
                          />
                          <div className="min-w-0">
                            <div className="font-medium break-words">{l.full_name}</div>
                            <div className="text-xs text-neutral-400 break-words">{l.email ?? '-'} • {l.whatsapp ?? '-'}</div>
                            <div className="text-xs text-neutral-300 break-words">invite_code: {l.invite_code ?? '-'} — invite_code_self: {l.invite_code_self ?? '-'}</div>
                            <div className="text-xs text-neutral-300 break-words">موقع: {(l.country ? l.country + ' / ' : '') + (l.city ?? '')}</div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className={`px-2 py-1 rounded text-sm ${l.status === 'approved' ? 'bg-emerald-600' : l.status === 'rejected' ? 'bg-red-600' : 'bg-yellow-600'}`}>
                            {l.status ?? 'pending'}
                          </div>
                          <Link href={`/admin/member/${l.id}`} className="text-xs underline">عرض</Link>
                        </div>
                      </li>
                    ))}
                    {level2.length === 0 && <li className="text-sm text-neutral-400">لا مدعوين في المستوى الثاني</li>}
                  </ul>
                </div>
              </div>
            </section>
          </div>
        ) : <div className="p-4 bg-[#041018] rounded">المستخدم غير موجود</div>}
      </div>
    </main>
  );
}