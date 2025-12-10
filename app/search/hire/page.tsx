// app/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Image from 'next/image';
import 'leaflet/dist/leaflet.css';

/* ---------- Supabase client (client-only import) ---------- */
async function getSupabase() {
  const mod = await import('@/lib/supabase');
  return mod.supabase;
}

/* ---------- Leaflet components (client-only) ---------- */
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), { ssr: false });

/* ---------- Icons (dynamic, typed) ---------- */
const loadFaUser = () =>
  import('react-icons/fa').then((mod) => {
    const Icon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(mod.FaUser as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>, props);
    return Icon;
  });
const loadFaStore = () =>
  import('react-icons/fa').then((mod) => {
    const Icon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(mod.FaStore as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>, props);
    return Icon;
  });
const loadFaTools = () =>
  import('react-icons/fa').then((mod) => {
    const Icon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(mod.FaTools as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>, props);
    return Icon;
  });
const loadFaBriefcase = () =>
  import('react-icons/fa').then((mod) => {
    const Icon = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement(mod.FaBriefcase as unknown as React.ComponentType<React.SVGProps<SVGSVGElement>>, props);
    return Icon;
  });

const FaUser = dynamic(loadFaUser, { ssr: false }) as React.ComponentType<React.SVGProps<SVGSVGElement>>;
const FaStore = dynamic(loadFaStore, { ssr: false }) as React.ComponentType<React.SVGProps<SVGSVGElement>>;
const FaTools = dynamic(loadFaTools, { ssr: false }) as React.ComponentType<React.SVGProps<SVGSVGElement>>;
const FaBriefcase = dynamic(loadFaBriefcase, { ssr: false }) as React.ComponentType<React.SVGProps<SVGSVGElement>>;

/* ---------- Types ---------- */
type Hire = {
  id: string;
  title?: string | null;
  profession?: string | null;
  name?: string | null;
  phone?: string | null;
  salary?: number | null;
  description?: string | null;
  hours?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  job_location?: string | null;
  location?: string | null;
  map_location?: string | null;
  image_url?: string | null;
  image?: string | null;
  photo?: string | null;
  approved?: boolean | null;
  created_at?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  likes?: number | null;
  [key: string]: unknown;
};

/* ---------- Helpers ---------- */
const formatCount = (n?: number | null) => {
  const v = Number(n ?? 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(v);
};

const safeImage = (v?: unknown): string | null => {
  if (!v || typeof v !== 'string') return null;
  try {
    // basic validation: must be a URL or data URI
    if (v.startsWith('http') || v.startsWith('data:') || v.startsWith('/')) return v;
    return null;
  } catch {
    return null;
  }
};

type LatLng = { lat: number; lng: number } | null;
const parseLocation = (loc?: unknown): LatLng => {
  if (!loc) return null;
  if (typeof loc === 'string') {
    const s = loc.trim();
    // formats: "lat,lng" or "lat lng"
    const comma = s.split(',');
    if (comma.length === 2) {
      const lat = Number(comma[0]);
      const lng = Number(comma[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    const parts = s.split(/\s+/);
    if (parts.length === 2) {
      const lat = Number(parts[0]);
      const lng = Number(parts[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    return null;
  }
  if (typeof loc === 'object') {
    const o = loc as Record<string, unknown>;
    const lat = (o.lat ?? o.latitude ?? o.latitud) as unknown;
    const lng = (o.lng ?? o.longitude ?? o.long) as unknown;
    const nlat = typeof lat === 'string' ? Number(lat) : typeof lat === 'number' ? lat : NaN;
    const nlng = typeof lng === 'string' ? Number(lng) : typeof lng === 'number' ? lng : NaN;
    if (Number.isFinite(nlat) && Number.isFinite(nlng)) return { lat: nlat, lng: nlng };
  }
  return null;
};

/* ---------- Component ---------- */
export default function SearchHirePage() {
  const [hires, setHires] = useState<Hire[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [country, setCountry] = useState<string>('');
  const [province, setProvince] = useState<string>('');
  const [city, setCity] = useState<string>('');

  const [selected, setSelected] = useState<Hire | null>(null);
  const [mapKey, setMapKey] = useState(0);

  // track which posts the user liked this session to avoid double increments
  const [likedLocal, setLikedLocal] = useState<Record<string, boolean>>({});
  // animation state per post id
  const [likeAnimating, setLikeAnimating] = useState<Record<string, boolean>>({});

  /* ---------- Fix Leaflet icon paths (client-only) ---------- */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (async () => {
      try {
        const L = (await import('leaflet')) as typeof import('leaflet');
        try {
          if (L && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
            try {
              Reflect.deleteProperty(L.Icon.Default.prototype as object, '_getIconUrl');
            } catch {}
            L.Icon.Default.mergeOptions?.({
              iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
              iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
              shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
            });
          }
        } catch {}
      } catch {}
    })();
  }, []);

  /* ---------- normalize helper (stable) ---------- */
  const normalize = useCallback((rawInput: unknown): Hire => {
    const raw = rawInput && typeof rawInput === 'object' ? (rawInput as Record<string, unknown>) : {};

    const getNum = (k: string): number | undefined => {
      const v = raw[k];
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && v.trim() !== '') {
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      }
      return undefined;
    };

    const imageCandidates = [raw['image_url'], raw['image'], raw['photo'], raw['img'], raw['picture']]
      .map((v) => (typeof v === 'string' ? v : undefined))
      .filter(Boolean) as string[];

    const profession =
      (typeof raw['profession'] === 'string' && (raw['profession'] as string)) ||
      (typeof raw['job_type'] === 'string' && (raw['job_type'] as string)) ||
      (typeof raw['role'] === 'string' && (raw['role'] as string)) ||
      (typeof raw['title'] === 'string' && (raw['title'] as string)) ||
      null;

    let locationStr: string | null = null;

    if (typeof raw['location'] === 'string') {
      locationStr = raw['location'] as string;
    } else if (raw['location'] && typeof raw['location'] === 'object') {
      const locObj = raw['location'] as Record<string, unknown>;
      const lat = locObj['lat'] ?? locObj['latitude'] ?? null;
      const lng = locObj['lng'] ?? locObj['longitude'] ?? null;
      if (lat != null && lng != null) locationStr = `${Number(lat)},${Number(lng)};`
    } else if (raw['coords'] && typeof raw['coords'] === 'object') {
      const coords = raw['coords'] as Record<string, unknown>;
      const lat = coords['lat'];
      const lng = coords['lng'];
      if (lat != null && lng != null) locationStr = `${Number(lat)},${Number(lng)};`
    } else if (raw['lat'] != null && raw['lng'] != null) {
      locationStr = `${Number(raw['lat'])},${Number(raw['lng'])};`
    } else if (typeof raw['latlng'] === 'string') {
      locationStr = raw['latlng'] as string;
    } else if (typeof raw['map_location'] === 'string') {
      locationStr = raw['map_location'] as string;
    }

    const unifiedImage = imageCandidates.length ? imageCandidates[0] : null;

    return {
      id: String(raw['id'] ?? ''),
      title: typeof raw['title'] === 'string' ? raw['title'] : null,
      profession,
      name:
        typeof raw['name'] === 'string'
          ? raw['name']
          : typeof raw['full_name'] === 'string'
          ? raw['full_name']
          : null,
      phone:
        typeof raw['phone'] === 'string'
          ? raw['phone']
          : typeof raw['mobile'] === 'string'
          ? raw['mobile']
          : null,
      salary: getNum('salary') ?? getNum('wage') ?? null,
      description:
        typeof raw['description'] === 'string'
          ? raw['description']
          : typeof raw['details'] === 'string'
          ? raw['details']
          : null,
      hours: typeof raw['hours'] === 'string' ? raw['hours'] : null,
      country: typeof raw['country'] === 'string' ? raw['country'] : null,
      province: typeof raw['province'] === 'string' ? raw['province'] : null,
      city: typeof raw['city'] === 'string' ? raw['city'] : null,
      job_location:
        typeof raw['job_location'] === 'string'
          ? raw['job_location']
          : typeof raw['work_place'] === 'string'
          ? raw['work_place']
          : null,
      location: locationStr ?? null,
      map_location: locationStr ?? null,
      image_url: unifiedImage,
      image: unifiedImage,
      photo: unifiedImage,
      approved: typeof raw['approved'] === 'boolean' ? raw['approved'] : null,
      created_at: typeof raw['created_at'] === 'string' ? raw['created_at'] : null,
      address: typeof raw['address'] === 'string' ? raw['address'] : null,
      lat: getNum('lat') ?? null,
      lng: getNum('lng') ?? null,
      likes: getNum('likes') ?? 0,
      ...raw,
    } as Hire;
  }, []);

  /* ---------- fetchHires (stable) ---------- */
  const fetchHires = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('hire_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 99999);
      if (error) {
        setMessage('حدث خطأ أثناء جلب البيانات');
        setHires([]);
      } else if (!data) {
        setHires([]);
      } else {
        const normalized = (data as unknown[]).map((d) => normalize(d));
        setHires(normalized);
      }
    } catch (err) {
      setMessage('فشل الاتصال بالخادم');
      setHires([]);
    } finally {
      setLoading(false);
    }
  }, [normalize]);

  useEffect(() => {
    // initial load
    fetchHires();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- filtering ---------- */
  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return hires.filter((h) => {
      if (country && h.country !== country) return false;
      if (province && h.province !== province) return false;
      if (city && h.city !== city) return false;
      if (!qLower) return true;
      const fields = [h.profession, h.title, h.name, h.description, h.city, h.province]
        .filter(Boolean)
        .map(String);
      return fields.some((f) => f.toLowerCase().includes(qLower));
    });
  }, [hires, q, country, province, city]);

  /* ---------- derive lists for filters ---------- */
  const countries = useMemo(() => {
    const s = new Set<string>();
    hires.forEach((h) => {
      if (h.country) s.add(h.country);
    });
    return Array.from(s).sort();
  }, [hires]);

  const provinces = useMemo(() => {
    const s = new Set<string>();
    hires.forEach((h) => {
      if (h.province) s.add(h.province);
    });
    return Array.from(s).sort();
  }, [hires]);

  const cities = useMemo(() => {
    const s = new Set<string>();
    hires.forEach((h) => {
      if (h.city) s.add(h.city);
    });
    return Array.from(s).sort();
  }, [hires]);

  /* ---------- keep mapKey in sync with selected ---------- */
  useEffect(() => {
    if (!selected) return;
    setMapKey((k) => k + 1);
  }, [selected]);

  /* ---------- like increment (local + server) ---------- */
  const incrementLike = useCallback(
    async (id: string) => {
      if (likedLocal[id]) return;
      setLikedLocal((s) => ({ ...s, [id]: true }));
      setLikeAnimating((s) => ({ ...s, [id]: true }));
      setTimeout(() => setLikeAnimating((s) => ({ ...s, [id]: false })), 700);

      // optimistic UI update
      setHires((prev) => prev.map((p) => (String(p.id) === id ? { ...p, likes: (Number(p.likes ?? 0) + 1) } : p)));

      try {
        const supabase = await getSupabase();
        await supabase.from('hire_requests').update({ likes: (hires.find((x) => String(x.id) === id)?.likes ?? 0) + 1 }).eq('id', id);
      } catch {
        // ignore server error; we keep optimistic update
      }
    },
    [hires, likedLocal]
  );

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
          /* burst effect */
          .like-burst {
            position: relative;
          }
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
          .like-burst.animate .burst-dot {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.6);
          }
        `}</style>
      </Head>

      <main className="min-h-screen bg-[#071118] text-white antialiased relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#071118] via-[#071827] to-[#021018]" />

        <div className="max-w-3xl lg:max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Header */}
          <header className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 justify-between mb-4 sm:mb-6">
            <div>
              <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">ابحث عن عمل</h1>
              <p className="mt-1 text-xs sm:text-sm text-white/70">استخدم الفلاتر للعثور على إعلان التوظيف المناسب.</p>
            </div>

            <div className="w-full sm:w-[520px]">
              <label className="block text-[11px] sm:text-xs text-white/60 mb-2">بحث في العنوان أو المهنة</label>
              <div className="flex gap-2">
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="مثال: مطور ويب، سائق..." className="flex-1 px-3 sm:px-4 py-2 rounded-lg bg-[#0f1721] border border-white/6 focus:border-red-400 outline-none transition text-sm" />
                <button onClick={() => {}} className="px-3 sm:px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm">بحث</button>
              </div>
            </div>
          </header>

          {/* Filters */}
          <section className="bg-[#071827] border border-white/6 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex-1 min-w-0">
                <label className="text-[11px] sm:text-xs text-white/60">الدولة</label>
                <select value={country} onChange={(e) => { setCountry(e.target.value); setProvince(''); setCity(''); }} className="w-full mt-1 px-3 py-2 rounded-md bg-[#071a21] border border-white/6 text-sm">
                  <option value="">كل الدول</option>
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex-1 min-w-0">
                <label className="text-[11px] sm:text-xs text-white/60">المحافظة</label>
                <select value={province} onChange={(e) => { setProvince(e.target.value); setCity(''); }} className="w-full mt-1 px-3 py-2 rounded-md bg-[#071a21] border border-white/6 text-sm">
                  <option value="">كل المحافظات</option>
                  {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="flex-1 min-w-0">
                <label className="text-[11px] sm:text-xs text-white/60">المدينة</label>
                <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md bg-[#071a21] border border-white/6 text-sm">
                  <option value="">كل المدن</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex gap-2 items-end">
                <button onClick={() => { setCountry(''); setProvince(''); setCity(''); setQ(''); }} className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-md bg-white/6 hover:bg-white/10">إعادة الضبط</button>
                <div className="text-xs sm:text-sm text-white/60 mt-1">النتائج: <span className="font-medium">{filtered.length}</span></div>
              </div>
            </div>
          </section>

          {/* Posts list (Facebook-like) */}
          <section>
            {loading ? (
              <div className="py-16 sm:py-20 text-center text-white/70">جاري التحميل...</div>
            ) : message ? (
              <div className="py-10 sm:py-12 text-center text-red-400">{message}</div>
            ) : filtered.length === 0 ? (
              <div className="py-10 sm:py-12 text-center text-white/60">لا توجد نتائج تطابق بحثك الآن.</div>
            ) : (
              <ul className="space-y-4">
                {filtered.map((h) => {
                  const image = safeImage(h.image_url ?? (typeof h.image === 'string' ? h.image : null) ?? (typeof h.photo === 'string' ? h.photo : null));
                  const anim = Boolean(likeAnimating[String(h.id)]);
                  return (
                    <li key={String(h.id)}>
                      <article className="bg-white/3 hover:bg-white/5 border border-white/6 rounded-lg overflow-hidden shadow-sm">
                        {/* header */}
                        <div className="flex items-center gap-3 p-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center flex-shrink-0 ml-1">
                            {image ? <Image src={image} alt="avatar" width={40} height={40} className="object-cover w-full h-full" unoptimized /> : <div className="text-xs text-white/60">لا صورة</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">{h.profession ?? h.title ?? '—'}</div>
                                <div className="text-[12px] text-white/60 truncate">{h.name ?? '—'}</div>
                              </div>
                              <time className="text-[11px] text-white/60">{h.created_at ? new Date(h.created_at).toLocaleString() : ''}</time>
                            </div>
                          </div>
                        </div>

                        {/* body */}
                        <div className="px-3 pb-3">
                          <div className="text-[14px] text-slate-300 mb-3 line-clamp-3 px-1">{h.description ?? ''}</div>

                          {image && <div className="w-full rounded-md overflow-hidden bg-[#07171b] mb-3"><Image src={image} alt="post image" width={1200} height={675} className="w-full h-auto object-cover" unoptimized /></div>}

                          {/* actions row */}
                          <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2">
                              <button onClick={() => { setSelected(h); setMapKey((k) => k + 1); }} className="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-xs sm:text-sm">عرض</button>

                              {/* Like button with animation and local persistence */}
                              <div className={`like-burst ${anim ? 'animate' : ''}`}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); incrementLike(String(h.id)); }}
                                  className={`flex items-center gap-2 px-2 py-1 rounded-md ${anim ? 'like-animate' : ''} bg-white/6 hover:bg-white/10 text-xs sm:text-sm`}
                                  aria-label="اعجبني"
                                >
                                  <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 21s-6-4.35-9-7.5C-1 9.5 3 4 8 4c2.5 0 3.5 1.5 4 2.5.5-1 1.5-2.5 4-2.5 5 0 9 5.5 5 9.5C18 16.65 12 21 12 21z" />
                                  </svg>
                                  <span>{formatCount(h.likes)}</span>
                                </button>
                                {/* burst dots (4 positions) */}
                                <span className="burst-dot" style={{ left: '10%', top: '20%' }} />
                                <span className="burst-dot" style={{ left: '85%', top: '25%' }} />
                                <span className="burst-dot" style={{ left: '25%', top: '80%' }} />
                                <span className="burst-dot" style={{ left: '75%', top: '75%' }} />
                              </div>
                            </div>

                            <div className="flex items-center gap-3 text-[12px] text-white/60">
                              <div className="flex items-center gap-1"><span>•</span><div>{h.city ?? '—'}</div></div>
                            </div>
                          </div>
                        </div>
                      </article>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* sidebar */}
          <section className="mt-4 sm:mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <aside className="md:col-span-1 space-y-3">
              <div className="bg-[#021617] border border-white/6 rounded p-3">
                <h3 className="text-sm font-semibold mb-2">إحصائيات</h3>
                <div className="text-sm text-slate-300">العروض: <span className="font-medium">{hires.length}</span></div>
                <div className="text-sm text-slate-300 mt-1">مفلترة: <span className="font-medium">{filtered.length}</span></div>
              </div>

              <div className="bg-[#021617] border border-white/6 rounded p-3">
                <h3 className="text-sm font-semibold mb-2">خيارات</h3>
                <button onClick={() => { setQ(''); setCountry(''); setProvince(''); setCity(''); }} className="px-3 py-1 rounded bg-white/6 text-sm">مسح الفلاتر</button>
                <button onClick={() => fetchHires()} className="ml-2 px-3 py-1 rounded bg-red-600 text-sm">تحديث</button>
              </div>
            </aside>

            <div className="md:col-span-2" />
          </section>

          {/* Details modal - smaller luxurious framed design (REPLACED: table + scroll) */}
          {selected && (
            <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" style={{ perspective: 1000 }}>
              <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />

              {/* Modal frame */}
              <div
                className="relative w-full max-w-[95vw] sm:max-w-2xl bg-gradient-to-br from-[#07121a] to-[#071827] border border-white/8 rounded-2xl overflow-hidden shadow-[0_24px_60px_rgba(2,6,23,0.8)] z-10 transform-gpu"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div className="absolute -inset-0.5 rounded-2xl pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.06), rgba(6,182,212,0.03))', filter: 'blur(6px)' }} />

                <div className="relative p-3 sm:p-4 flex flex-col" style={{ gap: 12 }}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-lg sm:text-xl font-bold leading-tight truncate">{selected.title ?? selected.profession ?? '—'}</h2>
                      <p className="text-xs sm:text-sm text-white/70 truncate">{selected.name ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelected(null)} aria-label="اغلاق" className="text-white/60 hover:text-white p-2 rounded bg-white/3">✕</button>
                    </div>
                  </div>

                  {/* Content area: constrained height + scrollable */}
                  <div
                    className="w-full overflow-y-auto rounded-xl"
                    style={{
                      maxHeight: 'calc(100vh - 200px)',
                      paddingRight: 6,
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                      {/* Left: image (إن وُجد) + وصف مختصر */}
                      <div className="space-y-3">
                        {safeImage(selected.image_url ?? (typeof selected.image === 'string' ? selected.image : null) ?? (typeof selected.photo === 'string' ? selected.photo : null)) ? (
                          <div className="w-full h-48 sm:h-56 rounded-xl border border-white/6 bg-[#07171b] flex items-center justify-center overflow-hidden" style={{ touchAction: 'pinch-zoom' }}>
                            <Image
                              src={String(selected.image_url ?? (typeof selected.image === 'string' ? selected.image : null) ?? (typeof selected.photo === 'string' ? selected.photo : null))}
                              alt="صورة المنشور"
                              width={1200}
                              height={675}
                              className="object-contain max-w-none w-auto h-full"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-full h-48 sm:h-56 bg-[#07171b] rounded-xl border border-white/6 flex items-center justify-center text-white/60">لا توجد صورة</div>
                        )}

                        <div className="text-[14px] sm:text-sm text-white/70 space-y-2">
                          <p className="line-clamp-4">{selected.description ?? '—'}</p>
                        </div>
                      </div>

                      {/* Right: جدول التفاصيل */}
                      <div>
                        <div className="bg-transparent rounded-xl border border-white/6 p-2 sm:p-3">
                          <table className="w-full text-sm sm:text-base" style={{ borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                            <tbody>
                              <tr>
                                <td className="w-1/3 text-white/70 align-top py-2 px-2 font-semibold">المهنة</td>
                                <td className="text-white/90 align-top py-2 px-2">{selected.profession ?? selected.title ?? '—'}</td>
                              </tr>

                              <tr>
                                <td className="text-white/70 align-top py-2 px-2 font-semibold">الاسم</td>
                                <td className="text-white/90 align-top py-2 px-2">{selected.name ?? '—'}</td>
                              </tr>

                              <tr>
                                <td className="text-white/70 align-top py-2 px-2 font-semibold">الهاتف</td>
                                <td className="text-white/90 align-top py-2 px-2">{selected.phone ?? '—'}</td>
                              </tr>

                              <tr>
                                <td className="text-white/70 align-top py-2 px-2 font-semibold">الراتب</td>
                                <td className="text-white/90 align-top py-2 px-2">{selected.salary ?? '—'}</td>
                              </tr>

                              <tr>
                                <td className="text-white/70 align-top py-2 px-2 font-semibold">ساعات العمل</td>
                                <td className="text-white/90 align-top py-2 px-2">{selected.hours ?? '—'}</td>
                              </tr>

                              <tr>
                                <td className="text-white/70 align-top py-2 px-2 font-semibold">مكان العمل</td>
                                <td className="text-white/90 align-top py-2 px-2">{selected.job_location ?? '—'}</td>
                              </tr>

                              

                              <tr>
                                <td className="text-white/70 align-top py-2 px-2 font-semibold">الدولة</td>
                                <td className="text-white/90 align-top py-2 px-2">{selected.country ?? '—'}</td>
                              </tr>

                              <tr>
                                <td className="text-white/70 align-top py-2 px-2 font-semibold">المدينة</td>
                                <td className="text-white/90 align-top py-2 px-2">{selected.city ?? '—'}</td>
                              </tr>

                              

                              <tr>
                                <td className="text-white/70 align-top py-2 px-2 font-semibold">تاريخ الإنشاء</td>
                                <td className="text-white/90 align-top py-2 px-2">{selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</td>
                              </tr>

                              <tr>
                                <td className="text-white/70 align-top py-2 px-2 font-semibold">الإعجابات</td>
                                <td className="text-white/90 align-top py-2 px-2">{formatCount(selected.likes)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Map row (يبقى كما هو) */}
                    <div className="mt-3">
                      <div className="h-56 lg:h-64 bg-black rounded-xl overflow-hidden border border-white/6">
                        {parseLocation(selected.location) ? (
                          <MapContainer key={mapKey} center={[parseLocation(selected.location)!.lat, parseLocation(selected.location)!.lng]} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                            <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <CircleMarker center={[parseLocation(selected.location)!.lat, parseLocation(selected.location)!.lng]} radius={8} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.95 }}>
                              <Popup>{selected.profession ?? selected.title ?? 'موقع'} <br /> {selected.location}</Popup>
                            </CircleMarker>
                          </MapContainer>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/60 px-4">لا توجد إحداثيات صالحة لعرض الخريطة</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer actions: فتح في الخرائط + إغلاق */}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((selected.location ?? '') + ' ' + (selected.address ?? '') + ' ' + (selected.city ?? ''))}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded-md bg-red-600 hover:bg-red-700 text-sm"
                    >
                      افتح في الخرائط
                    </a>
                    <button onClick={() => setSelected(null)} className="px-3 py-2 rounded-md bg-white/6 text-sm">إغلاق</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}