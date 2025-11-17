// components/RewardsClient.tsx
"use client";
import React, { useEffect, useState } from "react";

type Member = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  created_at?: string | null;
  rewardSyp?: number;
  rewardUsd?: number;
  index?: number;
  invite_code_self?: string | null;
};

type Props = {
  level1: Member[]; // direct invites ordered oldest-first, with reward fields
  level2: Member[]; // indirect invites (display + totals only)
  level1Totals: { totalSyp: number; totalUsd: number };
  level2Totals: { totalSyp: number; totalUsd: number };
  combinedSyp: number;
  combinedUsd: number;
  perDirectWithRewards: Member[]; // same as level1
  progressCount?: number; // level1Count % 50 from server
  progressTarget?: number;
  sparklinePoints?: number[];
};

function formatSyp(n: number) { return n.toLocaleString("en-US") + " ل.س"; }
function formatUsd(n: number) { return "$" + n.toLocaleString("en-US"); }

// Deterministic date formatter to avoid SSR/CSR mismatches.
// We force latin digits (u-nu-latn) and fixed options so server and client produce the same string.
const dateFormatter = new Intl.DateTimeFormat("en-GB-u-nu-latn", {
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hour12: true
});

export default function RewardsClient({
  level1, level2, level1Totals, level2Totals, combinedSyp, combinedUsd, perDirectWithRewards,
  progressCount = 0, progressTarget = 50, sparklinePoints = []
}: Props) {
  const [currency, setCurrency] = useState<"SYP" | "USD">("SYP");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("preferred_currency");
      if (saved === "USD" || saved === "SYP") setCurrency(saved as "SYP" | "USD");
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("preferred_currency", currency);
    } catch { /* ignore */ }
  }, [currency]);

  // authoritative direct invites count (level1 only)
  const directCount = Array.isArray(perDirectWithRewards) ? perDirectWithRewards.length : 0;

  // progress strictly from level1
  const progressValue = typeof progressCount === "number" ? progressCount : (directCount % (progressTarget || 50));
  const progressPercent = Math.min(100, Math.round((progressValue / (progressTarget || 50)) * 100));
  const remaining = Math.max(0, (progressTarget || 50) - progressValue);

  const milestoneRewardSyp = 25_000_000;
  const milestoneRewardUsd = 2_500;

  // sparkline builder (from level1 only)
  const sparkline = (() => {
    if (!sparklinePoints || sparklinePoints.length === 0) return null;
    const w = 140, h = 36, pad = 4;
    const max = Math.max(...sparklinePoints, 1);
    const step = (w - pad * 2) / Math.max(1, sparklinePoints.length - 1);
    const pts = sparklinePoints.map((v, i) => {
      const x = pad + i * step;
      const y = pad + (1 - v / max) * (h - pad * 2);
      return `${x},${y};`;
    }).join(" ");
    return { w, h, path: pts };
  })();

  // =========================
  // المراتب القادمة — غير محدودة عملياً
  // =========================
  const highlightedIndex = directCount;
  const ladderPreview = Array.from({ length: Math.max(100, directCount + 100) }).map((_, idx) => {
    const index = idx + 1;
    let syp = 1_000_000, usd = 100;
    switch (index) {
      case 1: syp = 500_000; usd = 50; break;
      case 2: syp = 600_000; usd = 60; break;
      case 3: syp = 700_000; usd = 70; break;
      case 4: syp = 800_000; usd = 80; break;
      case 5: syp = 900_000; usd = 90; break;
      case 6: syp = 1_000_000; usd = 100; break;
      default: syp = 1_000_000; usd = 100; break;
    }
    return { index, syp, usd };
  });

  const formatDateDeterministic = (iso?: string | null) => {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    return dateFormatter.format(d);
  };

  return (
    <div style={{
      borderRadius: 14,
      padding: 14,
      background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
      boxShadow: "0 14px 36px rgba(2,6,23,0.6)",
      color: "#e6f7ff"
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900 }}>لوحة أرباح الدعوات</div>
          <div style={{ color: "#9fcfff", fontSize: 13 }}>سلم المكافآت وتقدّمك (المباشر )</div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ textAlign: "right", fontWeight: 800 }}>
            <div style={{ fontSize: 14 }}>{directCount} مباشر</div>
            <div style={{ color: "#9ff1d6", fontSize: 12 }}>{level2.length} غير مباشر</div>
          </div>

          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setCurrency("SYP")} style={{
              padding: "8px 12px", borderRadius: 10, fontWeight: 800, cursor: "pointer",
              background: currency === "SYP" ? "#ffd166" : "transparent", color: currency === "SYP" ? "#08121a" : "#e6ffe7ff",
              border: currency === "SYP" ? "none" : "1px solid rgba(255,255,255,0.04)"
            }}>ل.س</button>

            <button onClick={() => setCurrency("USD")} style={{
              padding: "8px 12px", borderRadius: 10, fontWeight: 800, cursor: "pointer",
              background: currency === "USD" ? "#06b6d4" : "transparent", color: currency === "USD" ? "#051822" : "#ffe6eeff",
              border: currency === "USD" ? "none" : "1px solid rgba(255,255,255,0.04)"
            }}>USD</button>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: "1 1 220px", minWidth: 220 }}>
          <div style={{ fontSize: 13, color: "#1fb92fff", marginBottom: 6 }}>التقدّم نحو مكافأة الـ{progressTarget}</div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: 10, borderRadius: 12 }}>
            <div style={{ height: 12, background: "rgba(255,255,255,0.04)", borderRadius: 8, position: "relative", overflow: "hidden" }}>
              <div style={{ width: `${progressPercent}%`, height: "100%", background: "linear-gradient(90deg,#ffd166,#f59e0b)", transition: "width .5s ease" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, color: "#1fad1fff", fontSize: 13 }}>
              <div>اكتملت: {progressPercent}%</div>
              <div>المتبقي: {remaining}</div>
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ background: "linear-gradient(135deg,#fde68a,#f59e0b)", color: "#92400e", padding: "6px 10px", borderRadius: 10, fontWeight: 800 }}>
                {currency === "SYP" ? formatSyp(milestoneRewardSyp) : formatUsd(milestoneRewardUsd)}
              </div>
              <div style={{ color: "#b98280ff", fontSize: 13 }}>مكافأة كل {progressTarget} مباشر</div>
            </div>
          </div>
        </div>

        <div style={{ width: 150, minWidth: 120 }}>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: 8, borderRadius: 10 }}>
            {sparkline ? (
              <svg width={140} height={36} viewBox={`0 0 140 36`} style={{ display: "block" }}>
                <polyline points={sparkline.path} fill="none" stroke="#06b6d4" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={sparkline.path} fill="none" stroke="rgba(6,182,212,0.12)" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : <div style={{ color: "#9fb7ff", fontSize: 13 }}>لا بيانات</div>}
          </div>
        </div>
      </div>

      {/* Stats & totals */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
          <div style={{ color: "#bcd3ff", fontSize: 13 }}>المدعوّون المباشرون</div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{directCount}</div>
          <div style={{ color: "#9fb7ff", marginTop: 6 }}>ربح الطبقة الأولى: {currency === "SYP" ? formatSyp(level1Totals.totalSyp) : formatUsd(level1Totals.totalUsd)}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,0.02)" }}>
          <div style={{ color: "#bcd3ff", fontSize: 13 }}>المدعوّون غير المباشرون</div>
          <div style={{ fontSize: 20, fontWeight: 900 }}>{level2.length}</div>
          <div style={{ color: "#9ff1d6", marginTop: 6 }}>ربح الطبقة الثانية: {currency === "SYP" ? formatSyp(level2Totals.totalSyp) : formatUsd(level2Totals.totalUsd)}</div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12, padding: 12, borderRadius: 12, background: "linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))" }}>
        <div style={{ color: "#bcd3ff" }}>المجموع المتوقع</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "#ffd166" }}>{currency === "SYP" ? formatSyp(combinedSyp) : formatUsd(combinedUsd)}</div>
      </div>

      {/* Ladder preview (unbounded window, highlights directCount) */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: "#6c9af0ff", fontSize: 13, marginBottom: 8 }}>المراتب القادمة (غير محدودة)</div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
          {ladderPreview.map(item => (
            <div key={item.index} style={{
              minWidth: 110,
              padding: 10,
              borderRadius: 10,
              background: item.index === highlightedIndex ? "linear-gradient(90deg,#ffd166,#f59e0b)" : "rgba(255,255,255,0.02)",
              color: item.index === highlightedIndex ? "#08121a" : "#cd984972",
              boxShadow: item.index === highlightedIndex ? "0 10px 30px rgba(32, 245, 57, 0.89)" : "none"
            }}>
              <div style={{ fontWeight: 900 }}>#{item.index}</div>
              <div style={{ marginTop: 6, fontWeight: 900 }}>{currency === "SYP" ? formatSyp(item.syp) : formatUsd(item.usd)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Lists: direct (level1) and indirect (level2) */}
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 900 }}>المدعوّون المباشرون</div>
            <div style={{ color: "#9ec14eff" }}>{directCount}</div>
          </div>
          <div style={{ maxHeight: 260, overflow: "auto", padding: 8 }}>
            {perDirectWithRewards.length ? perDirectWithRewards.map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: 10, borderRadius: 8, marginBottom: 8, background: "linear-gradient(180deg, rgba(255,255,255,0.01), transparent)" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{p.full_name ?? p.email ?? "—"}</div>
                  <div style={{ color: "#9fb7ff", fontSize: 12 }}>{formatDateDeterministic(p.created_at)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900 }}>{currency === "SYP" ? formatSyp(p.rewardSyp ?? 0) : formatUsd(p.rewardUsd ?? 0)}</div>
                  <div style={{ color: "#bcd3ff", fontSize: 12 }}>#{p.index}</div>
                </div>
              </div>
            )) : <div style={{ color: "#9fb7ff", padding: 8 }}>لا يوجد</div>}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.02)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 10, borderBottom: "1px solid rgba(255,255,255,0.03)", display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 900 }}>المدعوّون غير المباشرون</div>
            <div style={{ color: "#19c88eff" }}>{level2.length}</div>
          </div>
          <div style={{ maxHeight: 260, overflow: "auto", padding: 8 }}>
            {level2.length ? level2.map(s => (
              <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: 10, borderRadius: 8, marginBottom: 8 }}>
                <div>
                  <div style={{ fontWeight: 900 }}>{s.full_name ?? s.email ?? "—"}</div>
                  <div style={{ color: "#9fb7ff", fontSize: 12 }}>{formatDateDeterministic(s.created_at)}</div>
                </div>
                <div style={{ fontWeight: 900, color: "#9ff1d6" }}>{currency === "SYP" ? formatSyp(100_000) : formatUsd(10)}</div>
              </div>
            )) : <div style={{ color: "#516dc2ff", padding: 8 }}>لا يوجد</div>}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center" }}>
        <button style={{ padding: "10px 14px", borderRadius: 12, background: "linear-gradient(90deg,#06b6d4,#0b5cff)", border: "none", color: "#fff", fontWeight: 900 }}>شارك رمزك لزيادة ارباحك</button>
        <button style={{ padding: "10px 14px", borderRadius: 12, background: "transparent", border: "1px solid rgba(40, 239, 44, 0.55)", color: "#e6f7ff", fontWeight: 800 }}>  انت الان عضو منتج في شركة تجار العالمية   </button>
      </div>تصلك الارباح خلال 24 ساعة الى محفظتك بشكل مباشر من شركة تجار العالمية
    </div>
  );
}