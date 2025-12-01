// app/search/seeker/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Head from 'next/head';
import 'leaflet/dist/leaflet.css';

/**
 * استيراد Supabase ديناميكيًا داخل الدوال التي تعمل على جهة العميل فقط
 * لتجنّب إنشاء العميل أثناء SSR/prerender (يمنع خطأ "supabaseKey is required").
 */
async function getSupabase() {
  const mod = await import('@/lib/supabase');
  return mod.supabase;
}

/* Leaflet components (client-only) */
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then((m) => m.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });

type Seeker = {
  id: string;
  name?: string | null;
  phone?: string | null;
  profession?: string | null;
  certificates?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  location?: string | null; // "lat,lng"
  approved?: boolean | null;
  status?: string | null;
  created_at?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  image?: string | null;
  age?: number | string | null;
  likes?: number | null;
  [key: string]: unknown;
};

export default function SearchSeekerForm() {
  const [seekers, setSeekers] = useState<Seeker[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [country, setCountry] = useState<string>('');
  const [province, setProvince] = useState<string>('');
  const [city, setCity] = useState<string>('');

  const [selected, setSelected] = useState<Seeker | null>(null);
  const [showMap, setShowMap] = useState(true);

  // like local state (optimistic)
  const [likedLocal, setLikedLocal] = useState<Record<string, boolean>>({});
  const [likeAnimating, setLikeAnimating] = useState<Record<string, boolean>>({});

  /* ---------- helpers ---------- */
  const formatCount = (n?: number | null) => {
    const v = Number(n ?? 0);
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(v);
  };

  /* ---------- fetchSeekers (client-only supabase) ---------- */
  const fetchSeekers = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase
        .from('seeker_requests')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .range(0, 99999);

      if (error) throw error;
      const arr = Array.isArray(data) ? (data as Seeker[]) : [];
      // ensure likes field exists
      setSeekers(arr.map((r) => ({ ...r, likes: (r.likes ?? 0) })));
    } catch (err: unknown) {
      console.error('fetchSeekers error', err);
      const msg = err instanceof Error ? err.message : String(err ?? 'خطأ غير متوقع');
      setMessage('تعذر جلب البيانات: ' + msg);
      setSeekers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeekers();
    return () => {
      document.body.style.overflow = '';
    };
  }, [fetchSeekers]);

  /* ---------- derived lists ---------- */
  const countries = useMemo(() => {
    const s = new Set<string>();
    seekers.forEach((x) => {
      if (typeof x.country === 'string' && x.country) s.add(x.country);
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [seekers]);

  const provinces = useMemo(() => {
    const s = new Set<string>();
    seekers
      .filter((x) => (country ? x.country === country : true))
      .forEach((x) => {
        if (typeof x.province === 'string' && x.province) s.add(x.province);
      });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [seekers, country]);

  const cities = useMemo(() => {
    const s = new Set<string>();
    seekers
      .filter((x) => (country ? x.country === country : true))
      .filter((x) => (province ? x.province === province : true))
      .forEach((x) => {
        if (typeof x.city === 'string' && x.city) s.add(x.city);
      });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [seekers, country, province]);

  /* ---------- filtering (مُعاد ومُحسّن) ---------- */
  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    const tokens = qLower.split(/\s+/).filter(Boolean);

    return seekers.filter((s) => {
      if (country && s.country !== country) return false;
      if (province && s.province !== province) return false;
      if (city && s.city !== city) return false;

      if (!tokens.length) return true;

      const hay = [
        s.name ?? '',
        s.profession ?? '',
        s.city ?? '',
        s.province ?? '',
        s.address ?? '',
      ].join(' | ').toLowerCase();

      return tokens.every((t) => hay.includes(t));
    });
  }, [seekers, country, province, city, q]);

  /* ---------- helpers ---------- */
  const getImageFor = (s?: Seeker | null): string | null => {
    if (!s) return null;
    const candidate = s.image_url ?? s.imageUrl ?? s.image ?? null;
    return typeof candidate === 'string' ? candidate : null;
  };

  function parseLocation(loc?: string | null) {
    if (!loc) return null;
    const parts = String(loc).split(',').map((s) => s.trim());
    if (parts.length !== 2) return null;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

  /* ---------- like handler (optimistic + persist) ---------- */
  const persistLikeToDb = useCallback(async (id: string, newCount: number) => {
    try {
      const supabase = await getSupabase();
      await supabase.from('seeker_requests').update({ likes: newCount }).eq('id', id);
    } catch (err) {
      console.error('persistLikeToDb error', err);
      setMessage('تعذر حفظ الإعجاب في الخادم');
      setTimeout(() => setMessage(null), 2500);
    }
  }, []);

  const incrementLike = useCallback(
    (id: string) => {
      if (likedLocal[String(id)]) return;

      setSeekers((prev) =>
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
    },
    [likedLocal, persistLikeToDb]
  );

  const openDetails = (s: Seeker) => {
    setSelected(s);
    setShowMap(true);
    document.body.style.overflow = 'hidden';
  };

  const closeDetails = () => {
    setSelected(null);
    setShowMap(true);
    document.body.style.overflow = '';
  };

  /* ---------- Render ---------- */
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <style>{`
          /* Facebook-like feed aesthetics */
          :root {
            --accent: #ef4444;
            --glass: rgba(255,255,255,0.06);
          }

          .fb-post {
            background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
            border-radius: 12px;
            overflow: hidden;
            transition: transform .18s ease, box-shadow .18s ease;
            border: 1px solid rgba(255,255,255,0.04);
          }
          .fb-post:hover { transform: translateY(-6px); box-shadow: 0 18px 40px rgba(2,6,23,0.6); }

          .post-header { display:flex; gap:12px; align-items:center; padding:12px; }
          .post-header .avatar { width:44px; height:44px; border-radius:50%; overflow:hidden; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-weight:700; background:linear-gradient(135deg,#06b6d4,#0ea5e9); color:white; }
          .post-body { padding: 0 12px 12px 12px; color: #e6eef6; }
          .post-text { margin-bottom: 10px; color: #dbeafe; line-height:1.45; }
          .post-image { width:100%; max-height:420px; overflow:hidden; display:block; border-radius:8px; margin-top:8px; background:#07171b; }
          .post-actions { display:flex; justify-content:space-between; align-items:center; padding:8px 12px 12px 12px; gap:8px; }
          .action-btn { display:inline-flex; align-items:center; gap:8px; padding:8px 12px; border-radius:8px; background:transparent; color:inherit; cursor:pointer; }
          .action-btn:hover { background: rgba(255,255,255,0.02); }

          /* Like animation */
          @keyframes like-pop {
            0% { transform: scale(1); opacity: 1; }
            40% { transform: scale(1.35); opacity: 1; }
            100% { transform: scale(1); opacity: 1; }
          }
          .like-animate { animation: like-pop 0.45s cubic-bezier(.2,.9,.3,1); }
          .like-burst { position: relative; display: inline-block; }
          .burst-dot {
            position: absolute;
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: rgba(239,68,68,0.95);
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.6);
            transition: transform 0.35s ease, opacity 0.35s ease;
          }
          .like-burst.animate .burst-dot { opacity: 1; transform: translate(-50%, -50%) scale(1.6); }

          /* small separator between posts */
          .post-sep { height: 10px; }

          /* Card shadow */
          .card-shadow { box-shadow: 0 8px 30px rgba(2,6,23,0.55); }

          /* Details modal smaller for mobile */
          .details-modal { max-width: 92vw; border-radius: 14px; }
          @media (min-width: 640px) { .details-modal { max-width: 460px; } }

          /* Accessibility focus */
          button:focus, a:focus { outline: none; box-shadow: 0 0 0 4px rgba(239,68,68,0.12); border-radius: 10px; }

          /* Reduce spacing on very small screens */
          @media (max-width: 420px) {
            .post-header { padding:10px; }
            .post-body { padding: 0 10px 10px 10px; }
            .post-image { border-radius:6px; }
          }
        `}</style>
      </Head>

      <main className="min-h-screen bg-[#071118] text-white antialiased relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#071118] via-[#071827] to-[#021018]" />

        <div className="max-w-3xl mx-auto px-4 py-6">
          <header className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">آخر المنشورات</h1>
              <p className="mt-1 text-sm text-white/70">تصفح المنشورات كما في فيسبوك — تفاعل، اعجب، واطّلع على التفاصيل</p>
            </div>

            <div className="w-full sm:w-[360px]">
              <label className="block text-xs text-white/60 mb-2">بحث في المهنة أو الاسم أو المدينة</label>
              <div className="flex gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="مثال: نجّار، مطور ويب، دمشق..."
                  className="flex-1 px-4 py-2 rounded-lg bg-[#0f1721] border border-white/6 focus:border-cyan-400 outline-none transition"
                />
                <button
                  onClick={() => fetchSeekers()}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium"
                >
                  بحث
                </button>
              </div>

              {/* فلترة بالدولة والمحافظة والمدينة */}
              <div className="mt-3 grid grid-cols-3 gap-2">
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); setProvince(''); setCity(''); }}
                  className="px-2 py-2 rounded-md bg-[#071a21] border border-white/6 text-xs"
                >
                  <option value="">كل الدول</option>
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  value={province}
                  onChange={(e) => { setProvince(e.target.value); setCity(''); }}
                  className="px-2 py-2 rounded-md bg-[#071a21] border border-white/6 text-xs"
                >
                  <option value="">كل المحافظات</option>
                  {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>

                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="px-2 py-2 rounded-md bg-[#071a21] border border-white/6 text-xs"
                >
                  <option value="">كل المدن</option>
                  {cities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
          </header>

          <section className="space-y-4">
            {loading ? (
              <div className="py-20 text-center text-white/70">جاري التحميل...</div>
            ) : message ? (
              <div className="py-12 text-center text-red-400">{message}</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-white/60">لا توجد منشورات حالياً.</div>
            ) : (
              filtered.map((s) => {
                const image = getImageFor(s);
                return (
                  <div key={s.id}>
                    <article id={`post-${s.id}`} className="fb-post card-shadow">
                      {/* رأس المنشور مع صورة مصغرة صغيرة بجانب الاسم */}
                      <div className="post-header">
                        <div className="flex items-center gap-3 w-full">
                          {/* صورة مصغرة صغيرة بجانب الاسم */}
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-cyan-500 to-blue-600">
                            {image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={image} alt={`${s.name ?? s.profession} صورة`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-semibold text-sm">
                                {(s.profession ?? 'مهنة').slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold truncate">{s.name ?? s.profession ?? '—'}</div>
                                <div className="text-xs text-white/60 truncate">{s.profession ?? '—'}</div>
                                {/* يظهر الموقع أعلى المنشور */}
                                <div className="text-xs text-white/50 truncate mt-1">{s.city ?? '—'}{s.province ? ` • ${s.province}` : ''}</div>
                              </div>
                              <div className="text-xs text-white/60 text-right">
                                {s.created_at ? new Date(s.created_at).toLocaleString() : ''}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="post-body">
                        <div className="post-text">{s.address ?? ''}</div>

                        {image && (
                          <div className="post-image">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={image} alt="منشور" className="w-full h-auto object-cover" />
                          </div>
                        )}

                        {/* أزرار التفاعل تظهر أسفل المنشور (مثل فيسبوك) */}
                        <div className="post-actions">
                          <div className="flex items-center gap-2">
                            <div className={`like-burst ${likeAnimating[String(s.id)] ? 'animate' : ''}`}>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  incrementLike(String(s.id));
                                }}
                                className={`action-btn ${likeAnimating[String(s.id)] ? 'like-animate' : ''}`}
                                aria-label="اعجبني"
                              >
                                <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 21s-6-4.35-9-7.5C-1 9.5 3 4 8 4c2.5 0 3.5 1.5 4 2.5.5-1 1.5-2.5 4-2.5 5 0 9 5.5 5 9.5C18 16.65 12 21 12 21z" />
                                </svg>
                                <span className="text-sm">{formatCount(s.likes)}</span>
                              </button>
                              <span className="burst-dot" style={{ left: '10%', top: '20%' }} />
                              <span className="burst-dot" style={{ left: '85%', top: '25%' }} />
                              <span className="burst-dot" style={{ left: '25%', top: '80%' }} />
                              <span className="burst-dot" style={{ left: '75%', top: '75%' }} />
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openDetails(s);
                              }}
                              className="action-btn"
                            >
                              <svg className="w-5 h-5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                              </svg>
                              <span className="text-sm">تعليق</span>
                            </button>

                            <button
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(window.location.href + '#post-' + s.id); }}
                              className="action-btn"
                            >
                              <svg className="w-5 h-5 text-white/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 7h4v4" />
                                <path d="M10 14L21 3" />
                                <path d="M21 21H3V3" />
                              </svg>
                              <span className="text-sm">مشاركة</span>
                            </button>
                          </div>

                          <div className="text-xs text-white/60">
                            {s.city ?? '—'}{s.province ? ` • ${s.province}` : ''}
                          </div>
                        </div>

                        {/* زر عرض التفاصيل أسفل المنشور (واضح ومباشر) */}
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); openDetails(s); }}
                            className="px-3 py-1 rounded-md bg-white/6 hover:bg-white/10 text-sm"
                          >
                            عرض التفاصيل
                          </button>
                        </div>
                      </div>
                    </article>

                    {/* فاصل صغير بين المنشورات */}
                    <div className="post-sep" />
                  </div>
                );
              })
            )}
          </section>
        </div>

        {/* Details Modal (أصغر لتناسب الهاتف) */}
        {selected && (
          <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3">
            <div className="absolute inset-0 bg-black/70" onClick={closeDetails} />
            <div className="relative w-full details-modal bg-[#041018] border border-white/6 rounded p-3 z-10 overflow-y-auto" style={{ maxHeight: '86vh' }}>
              <button onClick={closeDetails} aria-label="اغلاق" className="absolute top-3 right-3 z-20 bg-white/6 hover:bg-white/10 text-white p-2 rounded-md shadow">✕</button>

              <div className="p-3 overflow-auto" style={{ maxHeight: '80vh' }}>
                <div className="w-full flex items-center justify-center mb-3">
                  {getImageFor(selected) ? (
                    <Image
                      src={getImageFor(selected) as string}
                      alt="صورة المستخدم كبيرة"
                      width={800}
                      height={448}
                      className="w-full max-w-xs h-32 sm:h-40 object-cover rounded-lg border border-white/10 shadow"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full max-w-xs h-32 sm:h-40 bg-white/6 rounded-lg flex items-center justify-center text-white/50">
                      لا توجد صورة
                    </div>
                  )}
                </div>

                <h2 className="text-base font-bold">{selected.profession ?? '—'}</h2>
                <p className="text-sm text-white/70 mt-1">{selected.name ?? '—'}</p>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/80">
                  <div className="space-y-2">
                    <div><strong>الهاتف:</strong> <span className="text-white/70 ml-2">{selected.phone ?? '—'}</span></div>
                    <div><strong>العمر:</strong> <span className="text-white/70 ml-2">{(() => { const ageVal = (selected as Record<string, unknown>)['age']; return typeof ageVal === 'number' || typeof ageVal === 'string' ? ageVal : '—'; })()}</span></div>
                    <div><strong>الشهادات:</strong> <span className="text-white/70 ml-2">{selected.certificates ?? '—'}</span></div>
                    <div><strong>مكان السكن:</strong> <span className="text-white/70 ml-2">{selected.address ?? '—'}</span></div>
                  </div>

                  <div className="space-y-2">
                    <div><strong>المدينة:</strong> <span className="text-white/70 ml-2">{selected.city ?? '—'}</span></div>
                    <div><strong>المحافظة:</strong> <span className="text-white/70 ml-2">{selected.province ?? '—'}</span></div>
                    <div><strong>الدولة:</strong> <span className="text-white/70 ml-2">{selected.country ?? '—'}</span></div>
                    <div><strong>الحالة:</strong> <span className="text-white/70 ml-2">{selected.approved === true ? 'مقبول' : selected.approved === false ? 'مرفوض' : selected.status ?? 'بانتظار'}</span></div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 justify-end">
                  <button onClick={() => setShowMap((v) => !v)} className="px-3 py-2 rounded-md bg-white/6 hover:bg-white/10 text-sm">
                    {showMap ? 'إخفاء الخريطة' : 'إظهار الخريطة'}
                  </button>
                </div>

                {showMap && (
                  <div className="mt-3 h-36 sm:h-48 bg-black rounded-md overflow-hidden border border-white/6">
                    {parseLocation(selected.location) ? (
                      <MapContainer
                        center={[parseLocation(selected.location)!.lat, parseLocation(selected.location)!.lng]}
                        zoom={13}
                        style={{ height: '100%', width: '100%' }}
                        scrollWheelZoom={false}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <CircleMarker
                          center={[parseLocation(selected.location)!.lat, parseLocation(selected.location)!.lng]}
                          radius={7}
                          pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.95 }}
                        >
                          <Popup>{selected.name} <br /> {selected.location}</Popup>
                        </CircleMarker>
                      </MapContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-center p-4 text-white/70">لا توجد إحداثيات صحيحة للعرض</div>
                    )}
                  </div>
                )}

                <div style={{ height: 14 }} />
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}