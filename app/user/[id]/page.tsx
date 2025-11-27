// app/user/[id]/page.tsx
import React from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import CopyInvite from "../../../components/CopyInvite";
import RewardsClient from "../../../components/RewardsClient";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// لا نرمي استثناء أو ننشئ العميل عند مستوى الوحدة لتجنّب فشل البناء.
// نستخدم مصنعًا يعيد عميل Supabase عند الطلب داخل الـ server component.
function getSupabaseAdmin(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

type Props = { params: { id: string } };
type Member = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  created_at?: string | null; // keep ISO string from DB
  invite_code?: string | null;
  invite_code_self?: string | null;
  status?: string | null;
};

function safeStr(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v).trim();
  try {
    return JSON.stringify(v).trim();
  } catch {
    return "";
  }
}

function calcLevelOneRewardForIndex(index: number) {
  switch (index) {
    case 1: return { syp: 500_000, usd: 50 };
    case 2: return { syp: 600_000, usd: 60 };
    case 3: return { syp: 700_000, usd: 70 };
    case 4: return { syp: 800_000, usd: 80 };
    case 5: return { syp: 900_000, usd: 90 };
    case 6: return { syp: 1_000_000, usd: 100 };
    default: return { syp: 1_000_000, usd: 100 };
  }
}
function calcLevelOneTotalForList(count: number) {
  let totalSyp = 0, totalUsd = 0;
  for (let i = 1; i <= count; i++) {
    const r = calcLevelOneRewardForIndex(i);
    totalSyp += r.syp; totalUsd += r.usd;
    if (i % 50 === 0) { totalSyp += 2_500_000; totalUsd += 2_500; }
  }
  return { totalSyp, totalUsd };
}
function calcLevelTwoTotals(countLevelTwo: number) {
  return { totalSyp: countLevelTwo * 100_000, totalUsd: countLevelTwo * 10 };
}

export default async function UserPage({ params }: Props) {
  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    // نعيد رسالة واضحة بدل رمي استثناء عند وقت البناء
    return <main style={{ padding: 20 }}><h1>خطأ: إعدادات Supabase غير مضبوطة على الخادم</h1></main>;
  }

  const id = String(params.id ?? "");
  if (!id) return <main style={{ padding: 20 }}><h1>خطأ: معرف المستخدم غير موجود</h1></main>;

  // fetch owner
  let owner: Member | null = null;
  {
    const res = await supabaseAdmin
      .from("producer_members")
      .select("id, full_name, email, invite_code_self")
      .eq("id", id)
      .single();
    if (!res.error && res.data) owner = res.data as Member;
    else owner = null;
  }

  if (!owner) return <main style={{ padding: 20 }}><h1>المستخدم غير موجود</h1></main>;

  const ownerCode = safeStr(owner.invite_code_self ?? "");
  if (!ownerCode) return <main style={{ padding: 20 }}><h1>لا يوجد رمز دعوة لهذا المستخدم</h1></main>;

  // LEVEL 1: direct invites (exact match, approved, oldest-first)
  let level1: Member[] = [];
  {
    const res = await supabaseAdmin
      .from("producer_members")
      .select("id, full_name, email, created_at, invite_code, invite_code_self, status")
      .eq("invite_code", ownerCode)
      .eq("status", "approved")
      .order("created_at", { ascending: true });

    if (!res.error && Array.isArray(res.data)) {
      // keep created_at as ISO string exactly as DB returned it
      level1 = res.data as Member[];
    } else {
      level1 = [];
    }
  }

  // LEVEL 2: indirect invites (invite_code IN invite_code_self of level1)
  let level2: Member[] = [];
  {
    const l1InviteSelfs = level1.map(m => safeStr(m.invite_code_self)).filter(Boolean);
    if (l1InviteSelfs.length) {
      const res = await supabaseAdmin
        .from("producer_members")
        .select("id, full_name, email, created_at, invite_code, invite_code_self, status")
        .in("invite_code", l1InviteSelfs)
        .eq("status", "approved")
        .order("created_at", { ascending: true });

      if (!res.error && Array.isArray(res.data)) {
        const l1Ids = new Set(level1.map(x => x.id));
        level2 = (res.data as Member[]).filter(x => !l1Ids.has(x.id));
      } else {
        level2 = [];
      }
    }
  }

  // counts/totals
  const level1Count = level1.length;
  const level2Count = level2.length;
  const level1Totals = calcLevelOneTotalForList(level1Count);
  const level2Totals = calcLevelTwoTotals(level2Count);
  const combinedSyp = level1Totals.totalSyp + level2Totals.totalSyp;
  const combinedUsd = level1Totals.totalUsd + level2Totals.totalUsd;

  // assign rewards to level1 by position (oldest-first => index 1)
  const perDirectWithRewards = level1.map((d, idx) => {
    const i = idx + 1;
    const r = calcLevelOneRewardForIndex(i);
    return { ...d, index: i, rewardSyp: r.syp, rewardUsd: r.usd };
  });

  // sparkline from level1 (last 8 weeks) — computed on server as counts (numbers only)
  const countsByWeek: number[] = (() => {
    try {
      const weeks = 8; const msWeek = 7 * 24 * 60 * 60 * 1000; const now = Date.now();
      const buckets = new Array(weeks).fill(0);
      level1.forEach(x => {
        if (!x.created_at) return;
        const t = new Date(x.created_at).getTime();
        const diff = Math.max(0, now - t);
        const idx = Math.floor(diff / msWeek);
        if (idx < weeks) buckets[weeks - 1 - idx] += 1;
      });
      return buckets;
    } catch (_err: unknown) {
      return new Array(8).fill(0);
    }
  })();

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg,#01121a 0%, #041826 60%, #051822 100%)",
      padding: 14,
      color: "#11d258ff",
      fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial"
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <header style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{
              width: 52, height: 52, borderRadius: 12,
              background: "linear-gradient(135deg,#06b6d4,#0b5cff)",
              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff"
            }}>
              {(owner.full_name || owner.email || "U").toString().charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{owner.full_name ?? "المستخدم"}</div>
              <div style={{ fontSize: 13, color: "#9fcfff" }}>{owner.email ?? "—"}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: 12 }}>
              رمز الدعوة الخاص بك: <strong style={{ color: "#ffd166" }}>{owner.invite_code_self ?? "—"}</strong>
            </div>
            <CopyInvite code={owner.invite_code_self ?? undefined} />
          </div>
        </header>

        <RewardsClient
          level1={perDirectWithRewards}              // direct invites (items include created_at as raw ISO)
          level2={level2}
          level1Totals={level1Totals}
          level2Totals={level2Totals}
          combinedSyp={combinedSyp}
          combinedUsd={combinedUsd}
          perDirectWithRewards={perDirectWithRewards}
          progressCount={level1Count % 50}
          progressTarget={50}
          sparklinePoints={countsByWeek}
        />

        <footer style={{ marginTop: 18, textAlign: "center", color: "#93bfff", fontSize: 13 }}>
          استمر بدعوة الأصدقاء — تحصد الجوائز كلما تقدمت
        </footer>
      </div>
    </main>
  );
}