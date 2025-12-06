// app/auth/login/page.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);

  // Canvas animation (portal background)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const starsCount = Math.min(260, Math.floor((w * h) / 12000));
    const stars = Array.from({ length: starsCount }).map(() => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * 0.9 + 0.1,
      r: Math.random() * 1.5 + 0.4,
      tw: Math.random() * Math.PI * 2,
      sp: Math.random() * 0.5 + 0.1,
    }));

    let t = 0;
    const draw = () => {
      t += 0.008;

      // background gradient
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#020617");
      g.addColorStop(0.45, "#051229");
      g.addColorStop(0.85, "#071730");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // radial portal glow
      const rg = ctx.createRadialGradient(
        w / 2,
        h / 2,
        0,
        w / 2,
        h / 2,
        Math.min(w, h) / 1.3
      );
      rg.addColorStop(0, "rgba(11,92,255,0.46)");
      rg.addColorStop(0.35, "rgba(6,182,212,0.22)");
      rg.addColorStop(0.66, "rgba(255,209,102,0.10)");
      rg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, Math.min(w, h) / 1.4, 0, Math.PI * 2);
      ctx.fill();

      // spiral waves
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `rgba(194,233,255,${0.12 - i * 0.02});`
        ctx.lineWidth = 1.4 - i * 0.18;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 4; a += 0.03) {
          const r = Math.min(w, h) / 4.6 + Math.sin(a * 1.6 + t * 2 + i) * 18;
          const x = w / 2 + Math.cos(a + t + i * 0.48) * r;
          const y = h / 2 + Math.sin(a + t + i * 0.48) * r;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // stars
      stars.forEach((s) => {
        s.tw += 0.04 * s.sp;
        const alpha = 0.25 + Math.sin(s.tw) * 0.2;
        ctx.fillStyle = `rgba(194,233,255,${alpha});`
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * s.z, 0, Math.PI * 2);
        ctx.fill();

        s.x += Math.sin(t * 0.35 + s.tw) * 0.05;
        s.y += Math.cos(t * 0.22 + s.tw) * 0.04;
        if (s.x < -10) s.x = w + 10;
        if (s.x > w + 10) s.x = -10;
        if (s.y < -10) s.y = h + 10;
        if (s.y > h + 10) s.y = -10;
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener("resize", onResize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // Map server error responses to friendly messages
  function friendlyAuthMessage(resStatus: number | null, data: unknown) {
    const d = (data as Record<string, unknown> | null) ?? null;
    const serverMsg = String(d?.message ?? d?.error ?? "").toLowerCase();

    // treat explicit not-found / notfound / not_found, or 404/401/unauthorized as wrong creds
    if (resStatus === 401 || resStatus === 404) return "البريد الإلكتروني أو كلمة السر خاطئان";
    if (
      serverMsg.includes("not_found") ||
      serverMsg.includes("notfound") ||
      serverMsg.includes("not-found")
    )
      return "البريد الإلكتروني أو كلمة السر خاطئان";

    // otherwise show server msg if meaningful
    if (serverMsg) return (d?.message as string) ?? (d?.error as string) ?? "خطأ أثناء تسجيل الدخول";

    return "خطأ أثناء تسجيل الدخول";
  }

  // Submit handler: improved error messages
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!email || !password) {
      setMsg("الرجاء إدخال البريد وكلمة السر");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMsg(friendlyAuthMessage(res.status, data));
        setLoading(false);
        return;
      }

      // success -> redirect
      const userId = data?.user?.id;
      if (userId) {
        router.push(`/user/${userId}`);
      } else {
        setMsg("تم تسجيل الدخول لكن لم نستطع الحصول على معرف المستخدم");
      }
    } catch (err) {
      console.error(err);
      setMsg("خطأ في الشبكة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      dir="rtl"
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "#020617",
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, Arial",
      }}
    >
      <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0 }} />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          padding: 28,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 620,
            borderRadius: 20,
            padding: 22,
            background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.03))",
            boxShadow: "0 40px 110px rgba(6,92,255,0.14), 0 20px 60px rgba(0,0,0,0.6)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(194,233,255,0.12)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Top row: logo + welcome */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* small tojar logo (place file at /public/assets/tojar.png) */}
              <img
                src="/assets/tojar.png"
                alt="tojar"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 12,
                  objectFit: "cover",
                  boxShadow: "0 12px 34px rgba(11,92,255,0.18)",
                  transform: "translateZ(28px)",
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: "#e6f7ff",
                    transform: "translateZ(24px)",
                  }}
                >
                    ENTER SPAECE
                </div>
                <div style={{ fontSize: 13, color: "#bfe9ff", marginTop: 2 }}>
                  مرحباً بك في شركة انترسبيس العالمية
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={() => router.push("/producer/register")}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  fontWeight: 800,
                  background: "linear-gradient(90deg,#0b5cff,#06b6d4)",
                  color: "#fff",
                  border: "none",
                  boxShadow: "0 12px 30px rgba(6,182,212,0.18)",
                  cursor: "pointer",
                  transform: "translateZ(22px)",
                }}
              >
                إنشاء حساب
              </button>
            </div>
          </div>

          {/* main 3D card */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 16,
              padding: 18,
              borderRadius: 14,
              background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
              boxShadow: "0 26px 70px rgba(2,6,23,0.6), inset 0 1px 0 rgba(255,255,255,0.03)",
              transform: "translateZ(18px) rotateX(0.8deg)",
            }}
          >
            <h1
              style={{
                fontSize: 24,
                margin: 0,
                color: "#e6f7ff",
                fontWeight: 900,
                letterSpacing: "0.6px",
                textShadow: "0 6px 20px rgba(11,92,255,0.22)",
              }}
            >
              تسجيل الدخول
            </h1>

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
              {/* email */}
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#bcd3ff", fontWeight: 800 }}>البريد الإلكتروني</span>
                <div
                  style={{
                    position: "relative",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 8px 30px rgba(2,6,23,0.45)",
                  }}
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@example.com"
                    autoComplete="email"
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      background: "transparent",
                      color: "#e6f7ff",
                      border: "none",
                      outline: "none",
                      fontSize: 15,
                    }}
                    aria-label="البريد الإلكتروني"
                  />
                </div>
              </label>

              {/* password */}
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 13, color: "#bcd3ff", fontWeight: 800 }}>كلمة السر</span>
                <div
                  style={{
                    position: "relative",
                    borderRadius: 12,
                    overflow: "hidden",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 8px 30px rgba(2,6,23,0.45)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: "100%",
                      padding: "14px 54px 14px 16px",
                      background: "transparent",
                      color: "#e6f7ff",
                      border: "none",
                      outline: "none",
                      fontSize: 15,
                    }}
                    aria-label="كلمة السر"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    aria-label={showPwd ? "إخفاء كلمة السر" : "إظهار كلمة السر"}
                    style={{
                      position: "absolute",
                      left: 10,
                      top: 10,
                      padding: "6px 10px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.02)",
                      color: "#e6f7ff",
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                      boxShadow: "0 6px 18px rgba(2,6,23,0.5)",
                    }}
                  >
                    {showPwd ? "إخفاء" : "إظهار"}
                  </button>
                </div>
              </label>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <label style={{ display: "flex", gap: 6, alignItems: "center", color: "#bcd3ff", fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      onChange={() => {}}
                      style={{ width: 16, height: 16 }}
                      aria-label="تذكرني"
                    />
                    تذكرني
                  </label>
                </div>

                <div style={{ color: "#9fcfff", fontSize: 13, cursor: "pointer" }} onClick={() => router.push("/auth/forgot")}>
                  نسيت كلمة السر؟
                </div>
              </div>

              {/* message with optional notification icon */}
              {msg && (
                <div
                  role="alert"
                  style={{
                    marginTop: 4,
                    padding: "10px 12px",
                    borderRadius: 12,
                    background: "rgba(176,0,32,0.12)",
                    color: "#ffd1d1",
                    border: "1px solid rgba(255,102,122,0.28)",
                    fontSize: 13,
                    fontWeight: 800,
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  {/* optional small notification icon file: put at /public/assets/notification.png */}
                  <img
                    src="/assets/notification.png"
                    alt="notif"
                    style={{ width: 28, height: 28, objectFit: "contain" }}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div>{msg}</div>
                </div>
              )}

              {/* submit */}
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: "14px 16px",
                    borderRadius: 12,
                    border: "none",
                    cursor: loading ? "default" : "pointer",
                    fontWeight: 900,
                    letterSpacing: "0.6px",
                    color: "#08121a",
                    background: loading ? "linear-gradient(90deg,#9fb7ff,#bcd3ff)" : "linear-gradient(90deg,#ffd166,#f59e0b)",
                    boxShadow: loading ? "0 14px 36px rgba(159,183,255,0.28)" : "0 20px 48px rgba(245,158,11,0.28)",
                    transform: loading ? "translateY(0)" : "translateY(-2px)",
                    transition: "transform .12s ease, box-shadow .12s ease, opacity .12s ease",
                  }}
                >
                  {loading ? "جاري..." : "ادخل الآن"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/producer/register")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "transparent",
                    color: "#bfe9ff",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 8px 24px rgba(2,6,23,0.45)",
                  }}
                >
                  إنشاء حساب
                </button>
              </div>
            </form>

            {/* third-dimension decorative band */}
            <div
              style={{
                marginTop: 8,
                height: 12,
                borderRadius: 8,
                background: "linear-gradient(90deg, rgba(255,215,102,0.14), rgba(6,182,212,0.06))",
                boxShadow: "0 6px 18px rgba(6,92,255,0.06), inset 0 -8px 18px rgba(2,6,23,0.45)",
              }}
            />
          </div>
        </div>
      </div>

      {/* corner glows */}
      <div
        style={{
          position: "fixed",
          right: -80,
          top: -80,
          width: 260,
          height: 260,
          zIndex: 1,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,182,212,0.28), rgba(6,182,212,0) 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          left: -100,
          bottom: -100,
          width: 340,
          height: 340,
          zIndex: 1,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,209,102,0.22), rgba(255,209,102,0) 70%)",
          pointerEvents: "none",
        }}
      />
    </main>
  );
}