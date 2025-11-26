'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import 'leaflet/dist/leaflet.css';

// تحميل مكونات react-leaflet ديناميكيًا مع تعطيل SSR
const MapContainer = dynamic(() => import('react-leaflet').then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then((m) => m.Popup), { ssr: false });

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
  [key: string]: unknown;
};

export default function SearchHirePage() {
  const [hires, setHires] = useState<Hire[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [q, setQ] = useState('');
  const [country, setCountry] = useState<string | ''>('');
  const [province, setProvince] = useState<string | ''>('');
  const [city, setCity] = useState<string | ''>('');

  const [selected, setSelected] = useState<Hire | null>(null);

  // مفتاح لإعادة إنشاء الخريطة داخل الـ modal عند تغيير العنصر المحدد
  const [mapKey, setMapKey] = useState(0);

  // إصلاح مسارات أيقونات Leaflet في المتصفح فقط (بدون require)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (async () => {
      try {
        const L = await import('leaflet');
        try {
          if (L && L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
            // حذف الخاصية بطريقة آمنة
            try {
              // Reflect.deleteProperty يتجنب eslint no-dynamic-delete
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

  // تطبيع بيانات Supabase لتوحيد الحقول
  const normalize = (rawInput: unknown): Hire => {
    const raw = (rawInput && typeof rawInput === 'object') ? (rawInput as Record<string, unknown>) : {};

    const getStr = (k: string) => {
      const v = raw[k];
      return typeof v === 'string' && v ? v : undefined;
    };
    const getNum = (k: string) => {
      const v = raw[k];
      return typeof v === 'number' ? v : (typeof v === 'string' && v.trim() !== '' ? Number(v) : undefined);
    };

    const imageCandidates = [
      raw['image_url'],
      raw['image'],
      raw['photo'],
      raw['img'],
      raw['picture'],
    ].map((v) => (typeof v === 'string' ? v : undefined)).filter(Boolean) as string[];

    const profession =
      (typeof raw['profession'] === 'string' && raw['profession']) ||
      (typeof raw['job_type'] === 'string' && raw['job_type']) ||
      (typeof raw['role'] === 'string' && raw['role']) ||
      (typeof raw['title'] === 'string' && raw['title']) ||
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
      const lat = coords['lat']; const lng = coords['lng'];
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
      name: typeof raw['name'] === 'string' ? raw['name'] : (typeof raw['full_name'] === 'string' ? raw['full_name'] : null),
      phone: typeof raw['phone'] === 'string' ? raw['phone'] : (typeof raw['mobile'] === 'string' ? raw['mobile'] : null),
      salary: getNum('salary') ?? getNum('wage') ?? null,
      description: typeof raw['description'] === 'string' ? raw['description'] : (typeof raw['details'] === 'string' ? raw['details'] : null),
      hours: typeof raw['hours'] === 'string' ? raw['hours'] : null,
      country: typeof raw['country'] === 'string' ? raw['country'] : null,
      province: typeof raw['province'] === 'string' ? raw['province'] : null,
      city: typeof raw['city'] === 'string' ? raw['city'] : null,
      job_location: typeof raw['job_location'] === 'string' ? raw['job_location'] : (typeof raw['work_place'] === 'string' ? raw['work_place'] : null),
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
      ...raw,
    } as Hire;
  };

  // جلب البيانات (مغلف بـ useCallback لتجنب تحذير deps)
  const fetchHires = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from('hire_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .range(0, 99999);

      if (error) throw error;
      const arr = Array.isArray(data) ? data : [];
      const normalized = arr.map((d) => normalize(d));
      setHires(normalized);
    } catch (err: unknown) {
      console.error('fetchHires error', err);
      const msg = err instanceof Error ? err.message : String(err ?? 'خطأ غير متوقع');
      setMessage('تعذر جلب البيانات: ' + msg);
      setHires([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHires();
  }, [fetchHires]);

  const countries = useMemo(() => {
    const s = new Set<string>();
    hires.forEach((x) => { if (typeof x.country === 'string' && x.country) s.add(x.country); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [hires]);

  const provinces = useMemo(() => {
    const s = new Set<string>();
    hires.filter((x) => (country ? x.country === country : true)).forEach((x) => { if (typeof x.province === 'string' && x.province) s.add(x.province); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [hires, country]);

  const cities = useMemo(() => {
    const s = new Set<string>();
    hires
      .filter((x) => (country ? x.country === country : true))
      .filter((x) => (province ? x.province === province : true))
      .forEach((x) => { if (typeof x.city === 'string' && x.city) s.add(x.city); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [hires, country, province]);

  const parseLocation = (loc?: string | null) => {
    if (!loc) return null;
    try {
      const s = String(loc).trim();
      if ((s.startsWith('{') || s.startsWith('[')) && (s.includes('lat') || s.includes('lng'))) {
        try {
          const parsed = JSON.parse(s.replace(/(\w+)\s*:/g, '"$1":'));
          const lat = parsed.lat ?? parsed.latitude ?? null;
          const lng = parsed.lng ?? parsed.longitude ?? null;
          if (lat != null && lng != null) return { lat: Number(lat), lng: Number(lng) };
        } catch {}
      }
      const parts = s.includes(',') ? s.split(',') : s.split(/\s+/);
      if (parts.length < 2) return null;
      const lat = Number(parts[0]);
      const lng = Number(parts[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return { lat, lng };
    } catch {
      return null;
    }
  };

  const safeImage = (u?: string | null) => {
    if (!u) return null;
    const s = String(u).trim();
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('data:')) return s;
    return null;
  };

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return hires.filter((h) => {
      if (country && h.country !== country) return false;
      if (province && h.province !== province) return false;
      if (city && h.city !== city) return false;
      if (!qLower) return true;
      const fields = [h.profession, h.title, h.name, h.description, h.city, h.province].filter(Boolean).map(String);
      return fields.some((f) => f.toLowerCase().includes(qLower));
    });
  }, [hires, country, province, city, q]);

  // عند تغيير العنصر المحدد، نعيد إنشاء الخريطة داخل الـ modal بضبط المفتاح
  useEffect(() => {
    if (!selected) return;
    setMapKey((k) => k + 1);
  }, [selected]);

  return (
    <main className="min-h-screen bg-[#071118] text-white antialiased relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#071118] via-[#071827] to-[#021018]" />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">منشورات التوظيف</h1>
            <p className="mt-1 text-sm text-white/70">استخدم الفلاتر للعثور على إعلان التوظيف المناسب.</p>
          </div>

          <div className="w-full sm:w-[520px]">
            <label className="block text-xs text-white/60 mb-2">بحث في العنوان أو المهنة</label>
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="مثال: مطور ويب، سائق..."
                className="flex-1 px-4 py-2 rounded-lg bg-[#0f1721] border border-white/6 focus:border-cyan-400 outline-none transition"
              />
              <button className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium">بحث</button>
            </div>
          </div>
        </header>

        <section className="bg-[#071827] border border-white/6 rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex-1 min-w-0">
              <label className="text-xs text-white/60">الدولة</label>
              <select value={country} onChange={(e) => { setCountry(e.target.value); setProvince(''); setCity(''); }} className="w-full mt-1 px-3 py-2 rounded-md bg-[#071a21] border border-white/6">
                <option value="">كل الدول</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex-1 min-w-0">
              <label className="text-xs text-white/60">المحافظة</label>
              <select value={province} onChange={(e) => { setProvince(e.target.value); setCity(''); }} className="w-full mt-1 px-3 py-2 rounded-md bg-[#071a21] border border-white/6">
                <option value="">كل المحافظات</option>
                {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="flex-1 min-w-0">
              <label className="text-xs text-white/60">المدينة</label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md bg-[#071a21] border border-white/6">
                <option value="">كل المدن</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="flex gap-2 items-end">
              <button onClick={() => { setCountry(''); setProvince(''); setCity(''); setQ(''); }} className="px-4 py-2 text-sm rounded-md bg-white/6 hover:bg-white/10">إعادة الضبط</button>
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
            <ul className="space-y-3">
              {filtered.map((h) => {
                const image = safeImage(h.image_url ?? (typeof h.image === 'string' ? h.image : null) ?? (typeof h.photo === 'string' ? h.photo : null));
                return (
                  <li key={String(h.id)}>
                    <article onClick={() => { setSelected(h); setMapKey((k) => k + 1); }} className="group cursor-pointer bg-[#07191f] hover:bg-[#0b2330] border border-white/6 rounded-lg p-4 flex items-center gap-4 transition">
                      <div className="w-14 h-14 rounded-md overflow-hidden bg-gray-800 flex items-center justify-center flex-shrink-0">
                        {image ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={image} alt={h.profession ?? h.title ?? 'صورة'} className="w-full h-full object-cover" />
                          </>
                        ) : (
                          <div className="text-xs text-white/60 px-2 text-center">لا صورة</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-sm sm:text-base font-semibold truncate">{h.profession ?? h.title ?? '—'}</h3>
                          <time className="text-xs text-white/60">{h.created_at ? new Date(h.created_at).toLocaleString() : ''}</time>
                        </div>

                        <div className="mt-2 flex items-center gap-3 text-xs text-white/60">
                          <span>{h.city ?? '—'}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline">{h.province ?? '—'}</span>
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <button className="px-3 py-1 rounded-md bg-white/6 hover:bg-white/10 text-sm">عرض التفاصيل</button>
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
              <div>
                <h2 className="text-lg font-bold">{selected.title ?? selected.profession ?? '—'}</h2>
                <p className="text-sm text-white/70">{selected.name ?? '—'}</p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="اغلاق" className="text-white/60 hover:text-white p-2 rounded">✕</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
              <div className="space-y-2">
                {safeImage(selected.image_url ?? (typeof selected.image === 'string' ? selected.image : null) ?? (typeof selected.photo === 'string' ? selected.photo : null)) ? (
                  <div className="w-full h-56 rounded-md border border-white/6 bg-[#07171b] flex items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={safeImage(selected.image_url ?? (typeof selected.image === 'string' ? selected.image : null) ?? (typeof selected.photo === 'string' ? selected.photo : null)) as string}
                      alt="صورة المنشور"
                      className="max-w-full max-h-full object-contain"
                      style={{ display: 'block' }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-56 bg-[#07171b] rounded-md border border-white/6 flex items-center justify-center text-white/60">لا توجد صورة</div>
                )}

                <div className="text-sm text-white/70">
                  <p><strong>المهنة المطلوبة: </strong>{selected.profession ?? selected.title ?? '—'}</p>
                  <p className="mt-2"><strong>الوصف: </strong>{selected.description ?? '—'}</p>
                </div>

                <div className="space-y-2 mt-3">
                  <div className="text-sm text-white/70"><strong>الهاتف:</strong> {selected.phone ?? '—'}</div>
                  <div className="text-sm text-white/70"><strong>الراتب او الاجور:</strong> {selected.salary ?? '—'}</div>
                  <div className="text-sm text-white/70"><strong>عدد ساعات العمل في اليوم:</strong> {selected.hours ?? '—'}</div>
                  <div className="text-sm text-white/70"><strong>مكان العمل:</strong> {selected.job_location ?? '—'}</div>
                  <div className="text-sm text-white/70"><strong>الدولة:</strong> {selected.country ?? '—'}</div>
                  <div className="text-sm text-white/70"><strong>المحافظة:</strong> {selected.province ?? '—'}</div>
                  <div className="text-sm text-white/70"><strong>المدينة:</strong> {selected.city ?? '—'}</div>
                  <div className="text-sm text-white/70"><strong>الحالة:</strong> {selected.approved === true ? 'مقبول' : selected.approved === false ? 'مرفوض' : 'بانتظار'}</div>
                  <div className="text-sm text-white/70"><strong>تاريخ النشر:</strong> {selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</div>
                </div>
              </div>

              <div className="h-64 lg:h-full bg-black rounded-md overflow-hidden border border-white/6">
                {parseLocation(selected.location) ? (
                  <MapContainer
                    key={mapKey}
                    center={[parseLocation(selected.location)!.lat, parseLocation(selected.location)!.lng]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution="&copy; OpenStreetMap contributors"
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[parseLocation(selected.location)!.lat, parseLocation(selected.location)!.lng]}>
                      <Popup>
                        {selected.profession ?? selected.title ?? 'موقع'} <br /> {selected.location}
                      </Popup>
                    </Marker>
                  </MapContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/60 px-4">
                    لا توجد إحداثيات صالحة لعرض الخريطة
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-white/6">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((selected.location ?? '') + ' ' + (selected.address ?? '') + ' ' + (selected.city ?? ''))}`}
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