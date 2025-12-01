// app/search/comm/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Head from 'next/head';
import 'leaflet/dist/leaflet.css';

/**
 * IMPORTANT:
 * لا تستورد supabase على مستوى الوحدة لتجنّب خطأ prerender ("supabaseKey is required").
 * استورد العميل ديناميكياً داخل الدوال التي تعمل على جهة العميل فقط.
 */
async function getSupabase() {
  const mod = await import('@/lib/supabase');
  return mod.supabase;
}

/* ---------- Types ---------- */
type Comm = {
  id: string;
  title?: string | null;
  company?: string | null;
  contact?: string | null;
  phone?: string | null;
  category?: string | null;
  price?: string | null;
  description?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  location?: string | null; // نص أو "lat,lng"
  image_url?: string | null;
  company_logo?: string | null;
  status?: string | null;
  approved?: boolean | null;
  created_at?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  likes?: number | null;
  [key: string]: unknown;
};

type LatLng = { lat: number; lng: number };

type LeafletComponents = {
  MapContainer?: React.JSXElementConstructor<unknown>;
  TileLayer?: React.JSXElementConstructor<unknown>;
  Marker?: React.JSXElementConstructor<unknown>;
  Popup?: React.JSXElementConstructor<unknown>;
  CircleMarker?: React.JSXElementConstructor<unknown>;
};

/* ---------- Helpers ---------- */

// parse location strings like "lat,lng" or JSON-ish
const parseLocation = (loc?: string | null) => {
  if (!loc) return null;
  try {
    const s = String(loc).trim();
    const parts = s.includes(',') ? s.split(',') : s.split(/\s+/);
    if (parts.length >= 2) {
      const lat = Number(parts[0]);
      const lng = Number(parts[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    if (s.startsWith('{')) {
      const parsed = JSON.parse(s.replace(/(\w+)\s*:/g, '"$1":'));
      const lat = Number(parsed.lat ?? parsed.latitude ?? parsed.latitiude);
      const lng = Number(parsed.lng ?? parsed.longitude ?? parsed.long);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    return null;
  } catch {
    return null;
  }
};

const formatCount = (n?: number | null) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(v);
};

/* ---------- MapAutoCenter component (used when map instance is available) ---------- */
function MapAutoCenter({ map, coords }: { map: unknown; coords: { lat: number; lng: number } | null }) {
  useEffect(() => {
    if (!map || !coords) return;
    try {
      const m = map as {
        invalidateSize?: () => void;
        setView?: (center: [number, number], zoom: number, opts?: unknown) => void;
        getZoom?: () => number;
      } | null;
      m?.invalidateSize?.();
      const currentZoom = typeof m?.getZoom === 'function' ? (m!.getZoom!() as number) : undefined;
      const zoomTo = currentZoom ? Math.max(12, currentZoom) : 13;
      m?.setView?.([coords.lat, coords.lng], zoomTo, { animate: false } as unknown);
    } catch {}
  }, [map, coords]);
  return null;
}

/* ---------- Component ---------- */

export default function SearchCommForm() {
  const [comms, setComms] = useState<Comm[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [q, setQ] = useState(''); // search text
  const [country, setCountry] = useState<string | ''>('');
  const [province, setProvince] = useState<string | ''>('');
  const [city, setCity] = useState<string | ''>('');
  const [category, setCategory] = useState<string | ''>('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [selected, setSelected] = useState<Comm | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const mapRef = useRef<unknown>(null);

  // dynamic leaflet/react-leaflet state
  const [LeafletLoaded, setLeafletLoaded] = useState(false);
  const LeafletRef = useRef<LeafletComponents | null>(null);

  // likes local tracking and animation state
  const [likedLocal, setLikedLocal] = useState<Record<string, boolean>>({});
  const [likeAnimating, setLikeAnimating] = useState<Record<string, boolean>>({});

  // small helper to safely read string properties from Comm
  const getString = (obj: Comm | null, key: string) => {
    if (!obj) return undefined;
    const v = obj[key];
    return typeof v === 'string' && v ? v : undefined;
  };

  /* ---------- fetch data (client-only supabase) ---------- */
  const fetchComms = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .range(0, 99999);

      if (error) throw error;
      // ensure likes field exists locally
      const arr = (data ?? []) as Comm[];
      setComms(arr.map((r) => ({ ...r, likes: (r as any).likes ?? 0 })));
    } catch (err: unknown) {
      console.error('fetchComms error', err);
      const msg = err instanceof Error ? err.message : String(err ?? 'خطأ غير متوقع');
      setMessage('تعذر جلب البيانات تأكد من الشبكة: ' + msg);
      setComms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- dynamic leaflet loader (client-only) ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window === 'undefined') return;
      try {
        // inject leaflet css only once (avoid TypeScript dynamic CSS import issue)
        if (typeof document !== 'undefined' && !document.querySelector('link[data-leaflet-css]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.dataset.leafletCss = '1';
          try {
            link.href = new URL('leaflet/dist/leaflet.css', import.meta.url).toString();
          } catch {
            link.href = '/node_modules/leaflet/dist/leaflet.css';
          }
          await new Promise<void>((resolve) => {
            link.onload = () => resolve();
            link.onerror = () => resolve();
            document.head.appendChild(link);
          });
        }

        const [leafletModule, reactLeafletModule] = await Promise.all([import('leaflet'), import('react-leaflet')]);

        // fix default icon paths (safe reflection)
        try {
          const leafletUnknown: unknown = leafletModule;
          if (leafletUnknown && typeof leafletUnknown === 'object') {
            const Icon = Reflect.get(leafletUnknown as object, 'Icon') as unknown;
            if (Icon && typeof Icon === 'object') {
              const Default = Reflect.get(Icon as object, 'Default') as unknown;
              if (Default && typeof Default === 'object') {
                const proto = Reflect.get(Default as object, 'prototype') as Record<string, unknown> | undefined;
                if (proto && '_getIconUrl' in proto) {
                  Reflect.deleteProperty(proto, '_getIconUrl');
                }
                const mergeOptions = Reflect.get(Default as object, 'mergeOptions') as ((opts: Record<string, string>) => void) | undefined;
                mergeOptions?.({
                  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
                  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
                  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
                });
              }
            }
          }
        } catch (err) {
          console.warn('leaflet icon fix failed', err);
        }

        LeafletRef.current = {
          MapContainer: (reactLeafletModule as Record<string, unknown>).MapContainer as React.JSXElementConstructor<unknown>,
          TileLayer: (reactLeafletModule as Record<string, unknown>).TileLayer as React.JSXElementConstructor<unknown>,
          Marker: (reactLeafletModule as Record<string, unknown>).Marker as React.JSXElementConstructor<unknown>,
          Popup: (reactLeafletModule as Record<string, unknown>).Popup as React.JSXElementConstructor<unknown>,
          CircleMarker: (reactLeafletModule as Record<string, unknown>).CircleMarker as React.JSXElementConstructor<unknown>,
        };

        if (mounted) setLeafletLoaded(true);
      } catch (err) {
        console.error('failed loading leaflet/react-leaflet', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* ---------- derived lists ---------- */
  const countries = useMemo(() => {
    const s = new Set<string>();
    comms.forEach((c) => { if (typeof c.country === 'string' && c.country) s.add(c.country); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [comms]);

  const provinces = useMemo(() => {
    const s = new Set<string>();
    comms.filter((x) => (country ? x.country === country : true)).forEach((x) => { if (typeof x.province === 'string' && x.province) s.add(x.province); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [comms, country]);

  const cities = useMemo(() => {
    const s = new Set<string>();
    comms
      .filter((x) => (country ? x.country === country : true))
      .filter((x) => (province ? x.province === province : true))
      .forEach((x) => { if (typeof x.city === 'string' && x.city) s.add(x.city); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [comms, country, province]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    comms.forEach((x) => { if (typeof x.category === 'string' && x.category) s.add(x.category); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [comms]);

  /* ---------- filtering ---------- */
  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    const tokens = qLower.split(/\s+/).filter(Boolean);

    return comms.filter((c) => {
      if (country && c.country !== country) return false;
      if (province && c.province !== province) return false;
      if (city && c.city !== city) return false;
      if (category && c.category !== category) return false;

      if (!tokens.length) return true;

      const hay = [
        c.title ?? '',
        c.company ?? '',
        c.category ?? '',
        c.description ?? '',
        c.city ?? '',
        c.province ?? '',
        c.price ?? '',
      ].join(' | ').toLowerCase();

      return tokens.every((t) => hay.includes(t));
    });
  }, [comms, category, country, province, city, q]);

  /* ---------- helpers ---------- */
  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleString() : '');

  const openDetails = (c: Comm) => {
    setSelected(c);
    setMapKey((k) => k + 1);
    setTimeout(() => {
      try { (mapRef.current as { invalidateSize?: () => void })?.invalidateSize?.(); } catch {}
    }, 200);
  };

  const closeDetails = () => setSelected(null);

  const getImageFor = (c?: Comm | null) => {
    if (!c) return null;
    return (c.image_url ?? c.company_logo ?? null) as string | null;
  };

  /* ---------- like handler (optimistic + persist) ---------- */
  const persistLikeToDb = useCallback(async (id: string, newCount: number) => {
    try {
      const supabase = await getSupabase();
      await supabase.from('ads').update({ likes: newCount }).eq('id', id);
    } catch (err) {
      console.error('persistLikeToDb error', err);
      setMessage('تعذر حفظ الإعجاب في الخادم');
      setTimeout(() => setMessage(null), 2500);
    }
  }, []);

  const incrementLike = useCallback((id: string) => {
    if (likedLocal[String(id)]) return;

    setComms((prev) =>
      prev.map((h) => {
        if (String(h.id) === String(id)) {
          const newLikes = Number(h.likes ?? 0) + 1;
          persistLikeToDb(String(id), newLikes);
          return { ...h, likes: newLikes };
        }
        return h;
      })
    );

    setLikedLocal((s) => ({ ...s, [String(id)]: true }));

    setLikeAnimating((s) => ({ ...s, [String(id)]: true }));
    setTimeout(() => {
      setLikeAnimating((s) => ({ ...s, [String(id)]: false }));
    }, 700);
  }, [likedLocal, persistLikeToDb]);

  /* ---------- Render ---------- */
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>{`
          /* Like button animation */
          @keyframes like-pop {
            0% { transform: scale(1); opacity: 1; }
            40% { transform: scale(1.35); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          .like-animate {
            animation: like-pop 0.45s cubic-bezier(.2,.9,.3,1);
          }
          .like-burst { position: relative; display: inline-block; }
          .like-burst .burst-dot {
            position: absolute;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(239,68,68,0.95); /* red */
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.6);
            transition: transform 0.35s ease, opacity 0.35s ease;
          }
          .like-burst.animate .burst-dot { opacity: 1; transform: translate(-50%, -50%) scale(1.6); }

          /* Facebook-like post card tweaks */
          .fb-post .post-header { padding: 12px; display:flex; gap:12px; align-items:center; }
          .fb-post .post-body { padding: 0 12px 12px 12px; }
          .fb-post .post-image { width:100%; border-radius:8px; overflow:hidden; margin-top:8px; }
          .fb-post .post-actions { padding: 8px 12px 12px 12px; display:flex; justify-content:space-between; align-items:center; gap:8px; }
        `}</style>
      </Head>

      <main className="min-h-screen bg-[#071118] text-white antialiased relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#071118] via-[#071827] to-[#021018]" />

        <div className="max-w-6xl mx-auto px-4 py-6">
          <header className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">إعلانات تجارية</h1>
              <p className="mt-1 text-sm text-white/70">استعرض الإعلانات التجارية — بحث متقدم، معاينة وسائط، وخريطة تفاعلية</p>
            </div>

            <div className="w-full sm:w-[520px]">
              <label className="block text-xs text-white/60 mb-2">بحث متقدم</label>
              <div className="flex gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="بحث: عنوان، شركة، فئة، مدينة..."
                  className="flex-1 px-4 py-2 rounded-lg bg-[#0f1721] border border-white/6 focus:border-red-400 outline-none transition"
                />
                <button onClick={() => { /* no-op, filtering reactive */ }} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium">
                  بحث
                </button>
              </div>
            </div>
          </header>

          <section className="bg-[#071827] border border-white/6 rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-4 gap-3">
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); setProvince(''); setCity(''); }}
                  className="w-full px-3 py-2 rounded-md bg-[#071a21] border border-white/6"
                >
                  <option value="">كل الدول</option>
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  value={province}
                  onChange={(e) => { setProvince(e.target.value); setCity(''); }}
                  className="w-full px-3 py-2 rounded-md bg-[#071a21] border border-white/6"
                >
                  <option value="">كل المحافظات</option>
                  {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-[#071a21] border border-white/6"
                >
                  <option value="">كل المدن</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-[#071a21] border border-white/6"
                >
                  <option value="">كل الفئات</option>
                  {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="flex gap-2 items-end">
                <button
                  onClick={() => { setCountry(''); setProvince(''); setCity(''); setCategory(''); setQ(''); }}
                  className="px-4 py-2 text-sm rounded-md bg-white/6 hover:bg-white/10"
                >
                  إعادة الضبط
                </button>
                <div className="text-sm text-white/60 mt-1">النتائج: <span className="font-medium">{filtered.length}</span></div>
                <div className="ml-4 flex gap-2">
                  <button onClick={() => setViewMode('list')} className={`px-3 py-2 rounded ${viewMode === 'list' ? 'bg-red-600' : 'bg-gray-800'}`}>قائمة</button>
                  <button onClick={() => setViewMode('grid')} className={`px-3 py-2 rounded ${viewMode === 'grid' ? 'bg-red-600' : 'bg-gray-800'}`}>شبكة</button>
                </div>
              </div>
            </div>
          </section>

          <section>
            {loading ? (
              <div className="py-20 text-center text-white/70">جاري التحميل...</div>
            ) : message ? (
              <div className="py-12 text-center text-red-400">{message}</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-white/60">لا توجد نتائج تطابق بحثك الآن.</div>
            ) : (
              /* Facebook-like feed: use list of cards (grid mode will still show cards but arranged) */
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
                {filtered.map((c) => {
                  const image = getImageFor(c);
                  return (
                    <article
                      key={c.id}
                      className="fb-post bg-white/3 hover:bg-white/5 border border-white/6 rounded-lg overflow-hidden shadow-sm"
                      onClick={() => openDetails(c)}
                    >
                      {/* header */}
                      <div className="post-header">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center flex-shrink-0 ml-1">
                          {image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={String(image)} alt="avatar" className="object-cover w-full h-full" />
                          ) : (
                            <div className="text-xs text-white/60">لا صورة</div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{c.title ?? c.company ?? c.category ?? '—'}</div>
                              <div className="text-[12px] text-white/60 truncate">{c.company ?? c.contact ?? '—'}</div>
                            </div>
                            <time className="text-[11px] text-white/60">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</time>
                          </div>
                        </div>
                      </div>

                      {/* body */}
                      <div className="post-body">
                        <div className="text-[14px] text-slate-300 mb-2 px-1 line-clamp-3">{c.description ?? ''}</div>

                        {image && (
                          <div className="post-image bg-[#07171b]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={String(image)} alt="post image" className="w-full h-auto object-cover" />
                          </div>
                        )}

                        <div className="mt-3 px-1 text-[13px] text-white/70">
                          <div className="flex flex-wrap gap-3">
                            <div><strong>المدينة:</strong> {c.city ?? '—'}</div>
                            <div><strong>السعر:</strong> {c.price ?? '—'}</div>
                          </div>
                        </div>
                      </div>

                      {/* actions */}
                      <div className="post-actions">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); openDetails(c); }}
                            className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-xs sm:text-sm text-white"
                          >
                            عرض
                          </button>

                          <div className={`like-burst ${likeAnimating[String(c.id)] ? 'animate' : ''}`}>
                            <button
                              onClick={(e) => { e.stopPropagation(); incrementLike(String(c.id)); }}
                              className={`flex items-center gap-2 px-2 py-1 rounded-md ${likeAnimating[String(c.id)] ? 'like-animate' : ''} bg-white/6 hover:bg-white/10 text-xs sm:text-sm`}
                              aria-label="اعجبني"
                            >
                              <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 21s-6-4.35-9-7.5C-1 9.5 3 4 8 4c2.5 0 3.5 1.5 4 2.5.5-1 1.5-2.5 4-2.5 5 0 9 5.5 5 9.5C18 16.65 12 21 12 21z" />
                              </svg>
                              <span>{formatCount(c.likes)}</span>
                            </button>
                            <span className="burst-dot" style={{ left: '10%', top: '20%' }} />
                            <span className="burst-dot" style={{ left: '85%', top: '25%' }} />
                            <span className="burst-dot" style={{ left: '25%', top: '80%' }} />
                            <span className="burst-dot" style={{ left: '75%', top: '75%' }} />
                          </div>
                        </div>

                        <div className="text-[12px] text-white/60">
                          <div>{c.city ?? '—'}</div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Details modal */}
        {selected && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ perspective: 1000 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
            <div className="relative w-full max-w-[95vw] sm:max-w-2xl bg-[#061017] border border-white/6 rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(2,6,23,0.8)] z-10 transform-gpu">
              <div className="absolute -inset-0.5 rounded-2xl pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.06), rgba(6,182,212,0.03))', filter: 'blur(6px)' }} />

              <div className="flex items-start justify-between p-4 border-b border-white/6">
                <div className="flex items-center gap-3">
                  {selected.image_url ? (
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-[#07121a] flex items-center justify-center border border-white/6">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={String(selected.image_url)} alt="شعار" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-md flex items-center justify-center bg-gradient-to-br from-red-500 to-red-700 text-black font-semibold">Co</div>
                  )}

                  <div>
                    <h2 className="text-lg font-bold">{selected.title ?? selected.category ?? '—'}</h2>
                    <p className="text-sm text-white/70">{selected.company ?? selected.contact ?? '—'}</p>
                    <div className="text-xs text-white/60">{fmtDate(selected.created_at)}</div>
                  </div>
                </div>

                <button onClick={() => setSelected(null)} aria-label="اغلاق" className="text-white/60 hover:text-white p-2 rounded bg-white/3">✕</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                <div className="space-y-3">
                  {selected.company_logo ? (
                    <div className="w-full h-48 sm:h-56 rounded-xl border border-white/6 bg-[#07171b] overflow-hidden flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={String(selected.company_logo)} alt="صورة الإعلان" className="max-w-full max-h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-full h-48 sm:h-56 bg-[#07171b] rounded-xl border border-white/6 flex items-center justify-center text-white/60">لا توجد صورة</div>
                  )}

                  <div className="text-sm text-white/70 space-y-2">
                    <p><strong>العنوان / الفئة: </strong>{selected.title ?? selected.category ?? '—'}</p>
                    <p><strong>الوصف: </strong>{selected.description ?? '—'}</p>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div><strong>الشركة:</strong> <div className="text-white/70 inline">{getString(selected, 'name') ?? '—'}</div></div>
                      <div><strong>هاتف:</strong> <div className="text-white/70 inline">{selected.phone ?? '—'}</div></div>
                      <div><strong>السعر:</strong> <div className="text-white/70 inline">{selected.price ?? '—'}</div></div>
                      <div><strong>العنوان:</strong> <div className="text-white/70 inline">{selected.address ?? '—'}</div></div>
                    </div>

                    <div className="mt-2 text-xs text-white/60">
                      <div><strong>الموقع:</strong> {selected.country ?? '—'} / {selected.province ?? '—'} / {selected.city ?? '—'}</div>
                      <div className="mt-1"><strong>تاريخ النشر:</strong> {fmtDate(selected.created_at)}</div>
                    </div>
                  </div>
                </div>

                <div className="h-56 lg:h-full bg-black rounded-xl overflow-hidden border border-white/6">
                  {(() => {
                    const loc =
                      parseLocation(selected.location ?? undefined) ??
                      (selected.location_lat != null && selected.location_lng != null ? { lat: selected.location_lat, lng: selected.location_lng } : null);

                    if (loc) {
                      if (!LeafletLoaded || !LeafletRef.current) {
                        return <div className="w-full h-full flex items-center justify-center text-white/60 px-4">تحميل الخريطة...</div>;
                      }
                      const comps = LeafletRef.current as LeafletComponents;
                      const MapContainerComp = comps.MapContainer;
                      const TileLayerComp = comps.TileLayer;
                      const CircleMarkerComp = comps.CircleMarker;
                      const PopupComp = comps.Popup;

                      if (!MapContainerComp || !TileLayerComp || !CircleMarkerComp || !PopupComp) {
                        return <div className="w-full h-full flex items-center justify-center text-white/60 px-4">تحميل الخريطة...</div>;
                      }

                      return React.createElement(
                        MapContainerComp as React.JSXElementConstructor<unknown>,
                        {
                          key: mapKey,
                          whenCreated: (m: unknown) => {
                            mapRef.current = m;
                            setTimeout(() => {
                              try {
                                (m as { invalidateSize?: () => void }).invalidateSize?.();
                              } catch {}
                            }, 120);
                          },
                          center: [loc.lat, loc.lng],
                          zoom: 13,
                          style: { height: '100%', width: '100%' },
                          scrollWheelZoom: false,
                        },
                        React.createElement(TileLayerComp as React.JSXElementConstructor<unknown>, {
                          url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                          attribution: '&copy; OpenStreetMap contributors',
                        }),
                        React.createElement(MapAutoCenter as React.JSXElementConstructor<unknown>, { map: mapRef.current, coords: loc }),
                        React.createElement(
                          CircleMarkerComp as React.JSXElementConstructor<unknown>,
                          { center: [loc.lat, loc.lng], radius: 8, pathOptions: { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.95 } },
                          React.createElement(PopupComp as React.JSXElementConstructor<unknown>, null, `${selected.title ?? 'موقع'}\n${selected.address ?? ''}`)
                        )
                      );
                    }
                    return <div className="w-full h-full flex items-center justify-center text-white/60 px-4">لا توجد إحداثيات صالحة لعرض الخريطة</div>;
                  })()}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 border-t border-white/6">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(((selected.location ?? '') + ' ' + (selected.address ?? '') + ' ' + (selected.city ?? '')).trim())}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
                >
                  افتح في الخرائط
                </a>
                <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-md bg-white/6">إغلاق</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}