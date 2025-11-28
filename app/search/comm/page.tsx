// app/search/comm/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  [key: string]: unknown;
};

type LatLng = { lat: number; lng: number };

type LeafletComponents = {
  MapContainer?: React.JSXElementConstructor<unknown>;
  TileLayer?: React.JSXElementConstructor<unknown>;
  Marker?: React.JSXElementConstructor<unknown>;
  Popup?: React.JSXElementConstructor<unknown>;
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

// MapAutoCenter component (used when map instance is available)
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
      setComms((data ?? []) as Comm[]);
    } catch (err: unknown) {
      console.error('fetchComms error', err);
      const msg = err instanceof Error ? err.message : String(err ?? 'خطأ غير متوقع');
      setMessage('تعذر جلب البيانات: ' + msg);
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

  /* ---------- Render ---------- */
  return (
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
                className="flex-1 px-4 py-2 rounded-lg bg-[#0f1721] border border-white/6 focus:border-cyan-400 outline-none transition"
              />
              <button onClick={() => { /* no-op, filtering reactive */ }} className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium">
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
                <button onClick={() => setViewMode('list')} className={`px-3 py-2 rounded ${viewMode === 'list' ? 'bg-cyan-600' : 'bg-gray-800'}`}>قائمة</button>
                <button onClick={() => setViewMode('grid')} className={`px-3 py-2 rounded ${viewMode === 'grid' ? 'bg-cyan-600' : 'bg-gray-800'}`}>شبكة</button>
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
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((c) => {
                const img = c.company_logo ?? c.image_url ?? null;
                return (
                  <article key={c.id} className="bg-[#07191f] hover:bg-[#0b2330] border border-white/6 rounded-lg p-3 transition flex flex-col">
                    <div className="flex items-start gap-3">
                      <div className="w-20 h-20 rounded-md bg-[#06121a] overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {img ? <img src={String(img)} alt={c.title ?? 'صورة'} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xs text-white/60">لا صورة</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold truncate">{c.title ?? c.company ?? '—'}</h3>
                        <p className="text-xs text-white/60 mt-1 truncate">{c.city ?? '—'}{c.province ? ` • ${c.province}` : ''}</p>
                        <div className="mt-2 text-sm text-white/70">{c.price ?? ''}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="text-xs text-white/60">{fmtDate(c.created_at)}</div>
                      <button onClick={() => openDetails(c)} className="px-3 py-1 rounded bg-white/6 hover:bg-white/10 text-sm">عرض</button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <ul className="space-y-3 pb-8">
              {filtered.map((c) => {
                const loc = `parseLocation(c.location ?? (c.location_lat != null && c.location_lng != null ? ${c.location_lat},${c.location_lng} : undefined));`
                return (
                  <li key={c.id}>
                    <article className="group bg-[#07191f] hover:bg-[#0b2330] border border-white/6 rounded-lg p-4 flex items-center gap-4 transition">
                      <div className="w-12 h-12 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        <span className="text-sm">{(c.category ?? 'إعلان').slice(0, 2).toUpperCase()}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm sm:text-base font-semibold truncate">{c.title ?? c.company ?? '—'}</h3>
                          <time className="text-xs text-white/60">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</time>
                        </div>

                        <div className="flex items-center gap-3 mt-2">
                          {getImageFor(c) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={getImageFor(c) as string} alt="صورة" width={40} height={40} className="rounded-full border border-white/10 object-cover" />
                          ) : (
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-[10px] text-white/50">لا صورة</div>
                          )}
                          <div className="min-w-0">
                            <p className="text-xs text-white/70 truncate max-w-[220px]">{c.company ?? c.contact ?? '—'}</p>
                            <p className="text-xs text-white/60 truncate">{c.city ?? '—'}{c.province ? ` • ${c.province}` : ''}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <button onClick={() => openDetails(c)} className="px-3 py-1 rounded-md bg-white/6 hover:bg-white/10 text-sm">عرض</button>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Details modal */}
      {selected && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />
          <div className="relative max-w-4xl w-full bg-[#061017] border border-white/6 rounded-lg overflow-hidden shadow-xl z-10">
            <div className="flex items-start justify-between p-4 border-b border-white/6">
              <div className="flex items-center gap-3">
                {selected.image_url ? (
                  <div className="w-12 h-12 rounded-md overflow-hidden bg-[#07121a] flex items-center justify-center border border-white/6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={String(selected.image_url)} alt="شعار" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-md flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-600 text-black font-semibold">Co</div>
                )}

                <div>
                  <h2 className="text-lg font-bold">{selected.title ?? selected.category ?? '—'}</h2>
                  <p className="text-sm text-white/70">{selected.company ?? selected.contact ?? '—'}</p>
                  <div className="text-xs text-white/60">{fmtDate(selected.created_at)}</div>
                </div>
              </div>

              <button onClick={() => setSelected(null)} aria-label="اغلاق" className="text-white/60 hover:text-white p-2 rounded">✕</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
              <div className="space-y-3">
                {/* show full image without cropping */}
                {selected.company_logo ? (
                  <div className="w-full h-56 rounded-md border border-white/6 bg-[#07171b] overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={String(selected.company_logo)} alt="صورة الإعلان" className="max-w-full max-h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-full h-56 bg-[#07171b] rounded-md border border-white/6 flex items-center justify-center text-white/60">لا توجد صورة</div>
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

              <div className="h-64 lg:h-full bg-black rounded-md overflow-hidden border border-white/6">
                {/* react-leaflet map (no iframe) */}
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
                    const MarkerComp = comps.Marker;
                    const PopupComp = comps.Popup;

                    if (!MapContainerComp || !TileLayerComp || !MarkerComp || !PopupComp) {
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
                        MarkerComp as React.JSXElementConstructor<unknown>,
                        { position: [loc.lat, loc.lng] },
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
                className="px-4 py-2 rounded-md bg-cyan-600 hover:bg-cyan-700"
              >
                افتح في الخرائط
              </a>
              <button onClick={() => setSelected(null)} className="px-4 py-2 rounded-md bg-white/6">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}