// app/search/seeker/page.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import 'leaflet/dist/leaflet.css';

/**
 * صفحة الباحثين — ملف كامل
 * - بطاقات تشبه فيسبوك
 * - مودال تفاصيل أصغر للهاتف مع إطار غامق وأنيق
 * - حفظ الإعجابات بشكل متفائل (optimistic) مع استرجاع عند الفشل
 * - علامة الموقع على الخريطة كنقطة حمراء (CircleMarker)
 *
 * استبدل مسار '@/lib/supabase' بمسار Supabase في مشروعك إذا اختلف.
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
  payment_code?: string | null;
  payment_id?: string | null;
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

  // like local state (optimistic + animation)
  const [likedLocal, setLikedLocal] = useState<Record<string, boolean>>({});
  const [likeAnimating, setLikeAnimating] = useState<Record<string, boolean>>({});

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
      setSeekers(Array.isArray(data) ? (data as Seeker[]) : []);
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

  /* ---------- filtering ---------- */
  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return seekers.filter((s) => {
      if (country && s.country !== country) return false;
      if (province && s.province !== province) return false;
      if (city && s.city !== city) return false;
      if (!qLower) return true;
      return (s.profession ?? '').toString().toLowerCase().includes(qLower);
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

  /* ---------- persistLikeToDb with result ---------- */
  const persistLikeToDb = useCallback(async (id: string, newCount: number) => {
    try {
      const supabase = await getSupabase();
      const { data, error } = await supabase.from('seeker_requests').update({ likes: newCount }).eq('id', id);
      if (error) {
        console.error('Supabase update error', error);
        return { ok: false, error };
      }
      return { ok: true, data };
    } catch (err) {
      console.error('persistLikeToDb error', err);
      return { ok: false, error: err };
    }
  }, []);

  /* ---------- incrementLike (optimistic + rollback on failure) ---------- */
  const incrementLike = useCallback(
    async (id: string) => {
      if (likedLocal[String(id)]) return;

      // حفظ القيمة القديمة للرجوع عند الفشل
      let oldLikes = 0;
      setSeekers((prev) =>
        prev.map((h) => {
          if (String(h.id) === String(id)) {
            oldLikes = Number(h.likes ?? 0);
            return { ...h, likes: oldLikes + 1 };
          }
          return h;
        })
      );

      setLikedLocal((s) => ({ ...s, [String(id)]: true }));
      setLikeAnimating((s) => ({ ...s, [String(id)]: true }));

      const res = await persistLikeToDb(String(id), oldLikes + 1);
      if (!res.ok) {
        // فشل الحفظ: ارجع القيمة القديمة وامسح علامة الإعجاب المحلية
        setSeekers((prev) => prev.map((h) => (String(h.id) === String(id) ? { ...h, likes: oldLikes } : h)));
        setLikedLocal((s) => {
          const copy = { ...s };
          delete copy[String(id)];
          return copy;
        });
        setMessage('تعذر حفظ الإعجاب. حاول مرة أخرى.');
        setTimeout(() => setMessage(null), 2500);
      }

      // إيقاف الأنيميشن بعد فترة
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

  const formatCount = (n?: number | null) => {
    const v = Number(n ?? 0);
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (v >= 1_000) return (v / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    return String(v);
  };

  /* ---------- Render ---------- */
  return (
    <>
      <style>{`
        /* Facebook-like post cards */
        .fb-card {
          background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.04);
          box-shadow: 0 10px 30px rgba(2,6,23,0.55);
          transition: transform .16s ease, box-shadow .16s ease;
        }
        .fb-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(2,6,23,0.65); }
        .fb-sep { height: 12px; }

        .post-actions-bar {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:8px;
          padding-top:10px;
          border-top: 1px solid rgba(255,255,255,0.02);
          margin-top:12px;
        }
        .action-btn {
          display:inline-flex;
          align-items:center;
          gap:8px;
          padding:8px 12px;
          border-radius:10px;
          background:transparent;
          color:inherit;
          cursor:pointer;
          border:1px solid transparent;
        }
        .action-btn:hover { background: rgba(255,255,255,0.02); transform: translateY(-2px); }

        /* details modal darker elegant backdrop */
        .details-overlay {
          position: fixed;
          inset: 0;
          background: rgba(2,6,23,0.92);
          backdrop-filter: blur(6px) saturate(1.05);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 16px;
        }

        .details-frame {
          width:100%;
          max-width: 360px;
          border-radius: 14px;
          padding: 14px;
          background: linear-gradient(180deg, #071018, #0b1220);
          border: 1px solid rgba(255,255,255,0.04);
          box-shadow: 0 22px 60px rgba(2,6,23,0.8), inset 0 1px 0 rgba(255,255,255,0.01);
          overflow: hidden;
        }
        @media (min-width: 640px) {
          .details-frame { max-width: 520px; }
        }

        .details-image { border-radius: 10px; border:1px solid rgba(255,255,255,0.03); background:#061216; padding:6px; }

        /* Intelligence-style table */
        .intel-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
          background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.005));
          border-radius: 8px;
          overflow: hidden;
        }
        .intel-table th, .intel-table td {
          padding: 10px 12px;
          font-size: 0.9rem;
          vertical-align: middle;
        }
        .intel-table th {
          text-align: left;
          color: rgba(255,255,255,0.75);
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.9px;
        }
        .intel-table td {
          color: #e6eef6;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace;
          background: rgba(255,255,255,0.01);
          border-top: 1px solid rgba(255,255,255,0.02);
        }
        .intel-key {
          width: 40%;
          color: rgba(255,255,255,0.65);
          font-weight: 700;
        }
        .intel-val {
          width: 60%;
          color: #dbeafe;
          font-weight: 600;
        }

        .intel-badge {
          display:inline-block;
          padding:6px 10px;
          border-radius:8px;
          background: linear-gradient(90deg,#0ea5e9,#06b6d4);
          color:#02121a;
          font-weight:800;
          font-size:0.78rem;
          box-shadow: 0 6px 18px rgba(6,182,212,0.08);
        }
      `}</style>

      <main className="min-h-screen bg-[#071118] text-white antialiased relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#071118] via-[#071827] to-[#021018]" />

        <div className="max-w-6xl mx-auto px-4 py-6">
          <header className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">ابحث عن عمال أو موظفين </h1>
              <p className="mt-1 text-sm text-white/70">تصفح المنشورات كما في فيسبوك — تفاعل واطّلع على التفاصيل</p>
            </div>

            <div className="w-full sm:w-[520px]">
              <label className="block text-xs text-white/60 mb-2">بحث في المهنة</label>
              <div className="flex gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="مثال: نجّار، مطور ويب، سائق..."
                  className="flex-1 px-4 py-2 rounded-lg bg-[#0f1721] border border-white/6 focus:border-cyan-400 outline-none transition"
                />
                <button
                  onClick={() => fetchSeekers()}
                  className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium"
                >
                  بحث
                </button>
              </div>
            </div>
          </header>

          <section className="bg-[#071827] border border-white/6 rounded-lg p-4 mb-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-white/60">الدولة</label>
                <select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setProvince('');
                    setCity('');
                  }}
                  className="w-full mt-1 px-3 py-2 rounded-md bg-[#071a21] border border-white/6"
                >
                  <option value="">كل الدول</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-0">
                <label className="text-xs text-white/60">المحافظة</label>
                <select
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    setCity('');
                  }}
                  className="w-full mt-1 px-3 py-2 rounded-md bg-[#071a21] border border-white/6"
                >
                  <option value="">كل المحافظات</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-0">
                <label className="text-xs text-white/60">المدينة</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-md bg-[#071a21] border border-white/6"
                >
                  <option value="">كل المدن</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 items-end">
                <button
                  onClick={() => {
                    setCountry('');
                    setProvince('');
                    setCity('');
                    setQ('');
                    fetchSeekers();
                  }}
                  className="px-4 py-2 text-sm rounded-md bg-white/6 hover:bg-white/10"
                >
                  إعادة الضبط
                </button>
                <div className="text-sm text-white/60 mt-1">
                  النتائج: <span className="font-medium">{filtered.length}</span>
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
              <ul className="space-y-3 pb-8">
                {filtered.map((s) => (
                  <li key={s.id}>
                    <article className="fb-card p-4 flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                          {getImageFor(s) ? (
                            <Image src={getImageFor(s) as string} alt="" width={48} height={48} className="object-cover" unoptimized />
                          ) : (
                            <span className="text-sm">{(s.profession ?? 'مهنة').slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{s.name ?? s.profession ?? '—'}</div>
                              <div className="text-xs text-white/60 truncate">{s.profession ?? '—'}</div>
                              <div className="text-xs text-white/50 truncate mt-1">
                                {s.city ?? '—'}
                                {s.province ? ` • ${s.province}` : ''}
                              </div>
                            </div>
                            <div className="text-xs text-white/60 text-right">{s.created_at ? new Date(s.created_at).toLocaleString() : ''}</div>
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-white/80">
                        <div className="mb-2">{s.address ?? ''}</div>
                        {getImageFor(s) && (
                          <div className="w-full rounded-lg overflow-hidden border border-white/6">
                            <Image src={getImageFor(s) as string} alt="منشور" width={1200} height={720} className="w-full h-auto object-cover" unoptimized />
                          </div>
                        )}
                      </div>

                      <div className="post-actions-bar">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => incrementLike(String(s.id))}
                            className={`action-btn ${likeAnimating[String(s.id)] ? 'like-animate' : ''}`}
                            aria-label="اعجبني"
                          >
                            <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 21s-6-4.35-9-7.5C-1 9.5 3 4 8 4c2.5 0 3.5 1.5 4 2.5.5-1 1.5-2.5 4-2.5 5 0 9 5.5 5 9.5C18 16.65 12 21 12 21z" />
                            </svg>
                            <span className="text-sm font-medium">{formatCount(s.likes)}</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openDetails(s);
                            }}
                            className="px-3 py-1 rounded-md bg-white/6 hover:bg-white/10 text-sm"
                          >
                            عرض التفاصيل
                          </button>
                        </div>
                      </div>
                    </article>

                    <div className="fb-sep" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Details Modal darker elegant backdrop with intelligence table */}
        {selected && (
          <div className="details-overlay" role="dialog" aria-modal="true">
            <div className="details-frame relative z-10">
              <button
                onClick={closeDetails}
                aria-label="اغلاق"
                className="absolute top-3 right-3 z-20 bg-white/6 hover:bg-white/10 text-white p-2 rounded-md shadow"
              >
                ✕
              </button>

              <div className="overflow-auto" style={{ maxHeight: '82vh' }}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-base font-bold">{selected.profession ?? '—'}</div>
                    <div className="text-sm text-white/70 mt-1">{selected.name ?? '—'}</div>
                  </div>
                  <div className="intel-badge">ملف استخباراتي</div>
                </div>

                <div className="w-full flex items-center justify-center mb-3">
                  {getImageFor(selected) ? (
                    <div className="details-image w-full max-w-xs">
                      <Image src={getImageFor(selected) as string} alt="صورة المستخدم كبيرة" width={800} height={600} className="w-full h-auto object-contain rounded-lg" unoptimized />
                    </div>
                  ) : (
                    <div className="w-full max-w-xs h-36 bg-white/6 rounded-lg flex items-center justify-center text-white/50">لا توجد صورة</div>
                  )}
                </div>

                <table className="intel-table" role="table" aria-label="تفاصيل الباحث">
                  <tbody>
                    <tr>
                      <th className="intel-key">المعرف</th>
                      <td className="intel-val">{selected.id}</td>
                    </tr>

                    <tr>
                      <th className="intel-key">الحالة</th>
                      <td className="intel-val">{selected.approved === true ? 'مقبول' : selected.approved === false ? 'مرفوض' : selected.status ?? 'بانتظار'}</td>
                    </tr>

                    <tr>
                      <th className="intel-key">الهاتف</th>
                      <td className="intel-val">{selected.phone ?? '—'}</td>
                    </tr>

                    <tr>
                      <th className="intel-key">العمر</th>
                      <td className="intel-val">{(() => { const a = (selected as Record<string, unknown>)['age']; return typeof a === 'number' || typeof a === 'string' ? a : '—'; })()}</td>
                    </tr>

                    <tr>
                      <th className="intel-key">الشهادات</th>
                      <td className="intel-val">{selected.certificates ?? '—'}</td>
                    </tr>

                    <tr>
                      <th className="intel-key">العنوان</th>
                      <td className="intel-val">{selected.address ?? '—'}</td>
                    </tr>

                    <tr>
                      <th className="intel-key">الموقع</th>
                      <td className="intel-val">{(selected.city ?? '—') + (selected.province ? ` • ${selected.province}` : '') + (selected.country ? ` • ${selected.country}` : '')}</td>
                    </tr>

                    <tr>
                      <th className="intel-key">تاريخ الإنشاء</th>
                      <td className="intel-val">{selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</td>
                    </tr>

                    <tr>
                      <th className="intel-key">إعجابات</th>
                      <td className="intel-val">{formatCount(selected.likes)}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4 flex items-center gap-2 justify-end">
                  <button onClick={() => setShowMap((v) => !v)} className="px-3 py-2 rounded-md bg-white/6 hover:bg-white/10 text-sm">
                    {showMap ? 'إخفاء الخريطة' : 'إظهار الخريطة'}
                  </button>
                </div>

                {showMap && (
                  <div className="mt-3 h-56 sm:h-72 bg-black rounded-md overflow-hidden border border-white/6">
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
                          radius={8}
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

                <div style={{ height: 12 }} />

                <div className="mt-3">
                  <button onClick={closeDetails} className="w-full px-4 py-2 rounded-md bg-white/6 hover:bg-white/10">
                    ← رجوع
                  </button>
                </div>

                <div style={{ height: 8 }} />
              </div>
            </div>
          </div>
        )}</main>
    </>
  );
}