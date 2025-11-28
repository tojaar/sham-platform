'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
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
const MapContainer = dynamic(() => import('react-leaflet').then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(m => m.Popup), { ssr: false });

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
    return () => { document.body.style.overflow = ''; };
  }, [fetchSeekers]);

  /* ---------- derived lists ---------- */
  const countries = useMemo(() => {
    const s = new Set<string>();
    seekers.forEach((x) => { if (typeof x.country === 'string' && x.country) s.add(x.country); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [seekers]);

  const provinces = useMemo(() => {
    const s = new Set<string>();
    seekers.filter((x) => (country ? x.country === country : true)).forEach((x) => { if (typeof x.province === 'string' && x.province) s.add(x.province); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [seekers, country]);

  const cities = useMemo(() => {
    const s = new Set<string>();
    seekers
      .filter((x) => (country ? x.country === country : true))
      .filter((x) => (province ? x.province === province : true))
      .forEach((x) => { if (typeof x.city === 'string' && x.city) s.add(x.city); });
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
    const parts = String(loc).split(',').map(s => s.trim());
    if (parts.length !== 2) return null;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  }

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
    <main className="min-h-screen bg-[#071118] text-white antialiased relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#071118] via-[#071827] to-[#021018]" />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">الباحثون عن عمل</h1>
            <p className="mt-1 text-sm text-white/70">استخدم الفلاتر للعثور على المرشح المناسب.</p>
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
                onChange={(e) => { setCountry(e.target.value); setProvince(''); setCity(''); }}
                className="w-full mt-1 px-3 py-2 rounded-md bg-[#071a21] border border-white/6"
              >
                <option value="">كل الدول</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex-1 min-w-0">
              <label className="text-xs text-white/60">المحافظة</label>
              <select
                value={province}
                onChange={(e) => { setProvince(e.target.value); setCity(''); }}
                className="w-full mt-1 px-3 py-2 rounded-md bg-[#071a21] border border-white/6"
              >
                <option value="">كل المحافظات</option>
                {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
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
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex gap-2 items-end">
              <button
                onClick={() => { setCountry(''); setProvince(''); setCity(''); setQ(''); fetchSeekers(); }}
                className="px-4 py-2 text-sm rounded-md bg-white/6 hover:bg-white/10"
              >
                إعادة الضبط
              </button>
              <div className="text-sm text-white/60 mt-1">النتائج: <span className="font-medium">{filtered.length}</span></div>
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
                  <article className="group bg-[#07191f] hover:bg-[#0b2330] border border-white/6 rounded-lg p-4 flex items-center gap-4 transition">
                    <div className="w-12 h-12 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                      <span className="text-sm">{(s.profession ?? 'مهنة').slice(0, 2).toUpperCase()}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm sm:text-base font-semibold truncate">{s.profession ?? '—'}</h3>
                        <time className="text-xs text-white/60">{s.created_at ? new Date(s.created_at).toLocaleString() : ''}</time>
                      </div>

                      <div className="flex items-center gap-3 mt-2">
                        {getImageFor(s) ? (
                          <Image
                            src={getImageFor(s) as string}
                            alt="صورة"
                            width={40}
                            height={40}
                            className="rounded-full border border-white/10 object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-[10px] text-white/50">لا صورة</div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs text-white/70 truncate max-w-[220px]">{s.name ?? 'اسم غير متوفر'}</p>
                          <p className="text-xs text-white/60 truncate">{s.city ?? '—'}{s.province ? ` • ${s.province}` : ''}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); openDetails(s); }}
                        className="px-3 py-1 rounded-md bg-white/6 hover:bg-white/10 text-sm"
                      >
                        عرض التفاصيل
                      </button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Details Modal with Leaflet map like admin page */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        >
          <div
            className="absolute inset-0 bg-black/60"
            onClick={closeDetails}
          />
          <div className="relative w-full max-w-4xl bg-[#041018] border border-white/6 rounded p-4 z-10 overflow-y-auto" style={{ maxHeight: '90vh' }}>
            <button
              onClick={closeDetails}
              aria-label="اغلاق"
              className="absolute top-3 right-3 z-20 bg-white/6 hover:bg-white/10 text-white p-2 rounded-md shadow"
            >
              ✕
            </button>

            <div className="p-4 overflow-auto" style={{ maxHeight: '90vh' }}>
              <div className="w-full flex items-center justify-center mb-4">
                {getImageFor(selected) ? (
                  <Image
                    src={getImageFor(selected) as string}
                    alt="صورة المستخدم كبيرة"
                    width={800}
                    height={448}
                    className="w-full max-w-md h-48 sm:h-64 object-cover rounded-lg border border-white/10 shadow"
                    unoptimized
                  />
                ) : (
                  <div className="w-full max-w-md h-48 sm:h-64 bg-white/6 rounded-lg flex items-center justify-center text-white/50">
                    لا توجد صورة
                  </div>
                )}
              </div>

              <h2 className="text-lg font-bold">{selected.profession ?? '—'}</h2>
              <p className="text-sm text-white/70 mt-1">{selected.name ?? '—'}</p>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-white/80">
                <div className="space-y-2">
                  <div><strong>الهاتف:</strong> <span className="text-white/70 ml-2">{selected.phone ?? '—'}</span></div>
                  <div>
                    <strong>العمر:</strong>{' '}
                    <span className="text-white/70 ml-2">
                      {(() => {
                        const ageVal = (selected as Record<string, unknown>)['age'];
                        return (typeof ageVal === 'number' || typeof ageVal === 'string') ? ageVal : '—';
                      })()}
                    </span>
                  </div>
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

              <div className="mt-4 flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowMap((v) => !v)}
                  className="px-4 py-2 rounded-md bg-white/6 hover:bg-white/10"
                >
                  {showMap ? 'إخفاء الخريطة' : 'إظهار الخريطة'}
                </button>
              </div>

              {showMap && (
                <div className="mt-4 h-56 sm:h-72 bg-black rounded-md overflow-hidden border border-white/6">
                  {parseLocation(selected.location) ? (
                    <MapContainer
                      center={[parseLocation(selected.location)!.lat, parseLocation(selected.location)!.lng]}
                      zoom={13}
                      style={{ height: '100%', width: '100%' }}
                      scrollWheelZoom={false}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={[parseLocation(selected.location)!.lat, parseLocation(selected.location)!.lng]}>
                        <Popup>
                          {selected.name} <br /> {selected.location}
                        </Popup>
                      </Marker>
                    </MapContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-center p-4 text-white/70">
                      لا توجد إحداثيات صحيحة للعرض
                    </div>
                  )}
                </div>
              )}

              <div style={{ height: 22 }} />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}