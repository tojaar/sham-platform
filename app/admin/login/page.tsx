'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  // 3D tilt + parallax refs
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const layersRef = useRef<NodeListOf<Element> | null>(null);

  useEffect(() => {
    const scene = sceneRef.current;
    const card = cardRef.current;
    if (!scene || !card) return;

    layersRef.current = scene.querySelectorAll('[data-depth]');

    const handleMove = (e: MouseEvent) => {
      const rect = scene.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const px = x / rect.width - 0.5;
      const py = y / rect.height - 0.5;

      // tilt card
      const rotX = py * 10;
      const rotY = -px * 10;
      card.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(0);`

      // parallax layers
      layersRef.current?.forEach((layer) => {
        const depth = parseFloat(layer.getAttribute('data-depth') || '0');
        const moveX = -px * depth * 30;
        const moveY = -py * depth * 30;
        (layer as HTMLElement).style.transform = `translate3d(${moveX}px, ${moveY}px, 0);`
      });
    };

    const handleLeave = () => {
      card.style.transform = 'rotateX(0deg) rotateY(0deg) translateZ(0)';
      layersRef.current?.forEach((layer) => {
        (layer as HTMLElement).style.transform = 'translate3d(0,0,0)';
      });
    };

    scene.addEventListener('mousemove', handleMove);
    scene.addEventListener('mouseleave', handleLeave);
    return () => {
      scene.removeEventListener('mousemove', handleMove);
      scene.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error ?? 'فشل تسجيل الدخول');
        setLoading(false);
        return;
      }
      router.push('/admin');
    } catch {
      setErr('خطأ في الاتصال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      ref={sceneRef}
      className="relative min-h-screen overflow-hidden text-white antialiased flex items-center justify-center"
    >
      {/* BACKGROUND: dark abyss + nebula + grid */}
      <div className="absolute inset-0 -z-10">
        {/* abyss gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#02040a_0%,#04060e_25%,#050713_55%,#000000_100%)]" />
        {/* haunted nebula */}
        <div className="absolute -top-20 -left-24 w-[800px] h-[800px] rounded-full blur-3xl"
             style={{ background: 'conic-gradient(from 30deg at 50% 50%, #0b1b2b 0%, #0f0f22 12%, #2b0b1b 25%, #120a24 38%, #0b1b2b 50%, #0f0f22 62%, #2b0b1b 75%, #120a24 88%, #0b1b2b 100%)', opacity: .25 }}
             data-depth="0.12" />
        {/* sinister glow */}
        <div className="absolute -bottom-24 -right-16 w-[720px] h-[720px] rounded-full blur-3xl"
             style={{ background: 'radial-gradient(circle, rgba(54,0,0,.7) 0%, rgba(12,0,0,0) 70%)', opacity: .35 }}
             data-depth="0.1" />

        {/* subtle grid */}
        <svg className="absolute inset-0 opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M40 0 H0 V40" fill="none" stroke="#6b7280" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>

        {/* moving fog layers */}
        <div className="pointer-events-none absolute inset-0 mix-blend-screen opacity-[0.14]">
          <div className="absolute inset-0 bg-[url('/noise.svg')] animate-pulse" />
        </div>
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.06)_50%,transparent_100%)] animate-[drift_12s_linear_infinite]" />
        </div>
      </div>

      {/* TITLE: glitch neon */}
      <div className="absolute top-12 text-center select-none">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
          <span className="relative inline-block">
            <span className="relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-fuchsia-500 to-cyan-400">
              بوابة الظِلال
            </span>
            {/* glitch layers */}
            <span className="absolute inset-0 blur-[2px] text-red-500 opacity-40 translate-x-[2px] translate-y-[1px]">بوابة الظِلال</span>
            <span className="absolute inset-0 blur-[2px] text-cyan-400 opacity-40 -translate-x-[2px] -translate-y-[1px]">بوابة الظِلال</span>
          </span>
        </h1>
        <p className="mt-2 text-sm text-white/60">فقط من يعرف الكلمة… يعبر.</p>
      </div>

      {/* LOGIN CARD: 3D, glass, neon edges */}
      <div
        ref={cardRef}
        className="relative w-[92%] max-w-md"
        style={{ transformStyle: 'preserve-3d', transition: 'transform .18s ease-out' }}
      >
        {/* floating decoration edges */}
        <div className="absolute -inset-1 rounded-2xl opacity-60 blur-md"
             style={{ background: 'linear-gradient(90deg, rgba(255,0,90,.25), rgba(0,255,255,.25))' }}
             data-depth="0.04" />

        <form
          onSubmit={submit}
          className="relative z-10 rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(10,12,20,.85),rgba(6,8,14,.85))] backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,.6)] p-6 sm:p-7"
          style={{ transform: 'translateZ(20px)' }}
        >
          {/* skull header */}
          <div className="flex items-center gap-4 mb-5">
            <div className="w-12 h-12 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center shadow-inner">
              <span className="text-2xl">💀</span>
            </div>
            <div>
              <div className="text-lg font-bold">تسجيل دخول المشرف</div>
              <div className="text-xs text-white/50">أدخل الكلمة لتفتح البوابة</div>
            </div>
          </div>

          {/* input */}
          <label className="block text-xs text-white/60 mb-2">كلمة السر</label>
          <div className="relative mb-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-black/40 border border-white/10 outline-none text-white placeholder:text-white/40 focus:border-fuchsia-500/60 focus:ring-2 focus:ring-fuchsia-500/20 transition"
            />
            <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-white/5" />
          </div>

          {/* error */}
          {err && (
            <div className="mb-3 px-3 py-2 rounded-md bg-red-900/40 border border-red-500/30 text-sm text-red-200">
              {err}
            </div>
          )}

          {/* actions */}
          <button
            className="w-full mt-2 relative overflow-hidden rounded-lg font-bold px-4 py-3 text-black transition"
            disabled={loading}
            style={{ background: 'linear-gradient(90deg,#ff004c,#7c3aed,#06b6d4)' }}
          >
            <span className="relative z-10">{loading ? 'جارٍ...' : 'دخول'}</span>
            <span className="absolute inset-0 opacity-0 hover:opacity-20 transition bg-[radial-gradient(circle_at_30%_20%,#ffffff_0%,transparent_50%)]" />
          </button>

          {/* subtle bottom note */}
          <div className="mt-3 text-[11px] text-white/40 text-center">
            هذه البوابة محمية — عند ادخال كلمة السر فانت توافق على اعطائنة موقعك وكل بياناتك بما في ذلك معلوماتك الشخصية 
          </div>
        </form>

        {/* bottom glow */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-48 h-24 blur-2xl opacity-70"
             style={{ background: 'radial-gradient(ellipse at center, rgba(124,58,237,.5), rgba(0,0,0,0))' }}
             data-depth="0.05" />
      </div>

      {/* FOREGROUND: floating bats silhouettes (decor) */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute top-[18%] left-[12%] w-8 h-4 bg-black/70 rotate-[12deg] blur-[.5px] animate-[float_6s_ease_infinite]"
             style={{ clipPath: 'polygon(0 50%, 30% 0, 50% 50%, 70% 0, 100% 50%, 70% 100%, 50% 50%, 30% 100%)' }}
             data-depth="0.08" />
        <div className="absolute top-[60%] right-[10%] w-10 h-5 bg-black/70 -rotate-[6deg] blur-[.5px] animate-[float_8s_ease_infinite]"
             style={{ clipPath: 'polygon(0 50%, 30% 0, 50% 50%, 70% 0, 100% 50%, 70% 100%, 50% 50%, 30% 100%)' }}
             data-depth="0.06" />
      </div>

      {/* keyframes */}
      <style jsx>{`
        @keyframes drift {
          0% { transform: translateY(0); }
          50% { transform: translateY(25px); }
          100% { transform: translateY(0); }
        }
        @keyframes float {
          0% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}