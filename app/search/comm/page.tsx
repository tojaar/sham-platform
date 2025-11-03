'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
  status?: string | null;
  approved?: boolean | null;
  created_at?: string | null;
  [key: string]: any;
};

export default function SearchCommPage(): JSX.Element {
  const [comms, setComms] = useState<Comm[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [q, setQ] = useState(''); // بحث بالعناوين أو التصنيف
  const [country, setCountry] = useState<string | ''>('');
  const [province, setProvince] = useState<string | ''>('');
  const [city, setCity] = useState<string | ''>('');
  const [category, setCategory] = useState<string | ''>('');

  const [selected, setSelected] = useState<Comm | null>(null);

  const fetchComms = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .range(0, 99999);

      if (error) throw error;
      setComms(data || []);
    } catch (err: any) {
      console.error('fetchComms error', err);
      setMessage('تعذر جلب البيانات: ' + (err.message || String(err)));
      setComms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComms();
  }, []);

  const countries = useMemo(() => {
    const s = new Set<string>();
    comms.forEach((x) => { if (x.country) s.add(x.country); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [comms]);

  const provinces = useMemo(() => {
    const s = new Set<string>();
    comms.filter((x) => (country ? x.country === country : true)).forEach((x) => { if (x.province) s.add(x.province); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [comms, country]);

  const cities = useMemo(() => {
    const s = new Set<string>();
    comms
      .filter((x) => (country ? x.country === country : true))
      .filter((x) => (province ? x.province === province : true))
      .forEach((x) => { if (x.city) s.add(x.city); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [comms, country, province]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    comms.forEach((x) => { if (x.category) s.add(x.category); });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [comms]);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    return comms.filter((c) => {
      if (country && c.country !== country) return false;
      if (province && c.province !== province) return false;
      if (city && c.city !== city) return false;
      if (category && c.category !== category) return false;
      if (!qLower) return true;
      const fields = [c.title, c.company, c.category, c.description, c.city, c.province].filter(Boolean).map(String);
      return fields.some(f => f.toLowerCase().includes(qLower));
    });
  }, [comms, country, province, city, category, q]);

  const mapEmbedUrlFor = (c: Comm) => {
    const parts: string[] = [];
    if (c.location && typeof c.location === 'string' && c.location.trim()) parts.push(c.location.trim());
    if (c.address && typeof c.address === 'string' && c.address.trim()) parts.push(c.address.trim());
    if (c.city && typeof c.city === 'string' && c.city.trim()) parts.push(c.city.trim());
    if (c.province && typeof c.province === 'string' && c.province.trim()) parts.push(c.province.trim());
    if (c.country && typeof c.country === 'string' && c.country.trim()) parts.push(c.country.trim());
    const locRaw = parts.join(' ').trim();

    const coordsMatch = locRaw.match(/^(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)$/);
    if (coordsMatch) {
      const lat = coordsMatch[1];
      const lng = coordsMatch[3];
      return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}&output=embed;`
    }

    const encoded = encodeURIComponent(locRaw || '');
    return `https://www.google.com/maps?q=${encoded}&output=embed;`
  };

  return (
    <main className="min-h-screen bg-[#071118] text-white antialiased relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#071118] via-[#071827] to-[#021018]" />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">إعلانات تجارية</h1>
            <p className="mt-1 text-sm text-white/70">استعرض الإعلانات التجارية، ابحث حسب العنوان، الفئة أو الموقع.</p>
          </div>

          <div className="w-full sm:w-[520px]">
            <label className="block text-xs text-white/60 mb-2">بحث في العنوان أو الفئة</label>
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="مثال: تاجير معدات، بيع، محل، عرض خاص..."
                className="flex-1 px-4 py-2 rounded-lg bg-[#0f1721] border border-white/6 focus:border-cyan-400 outline-none transition"
              />
              <button
                onClick={() => { /* الفلترة تتم تلقائياً */ }}
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

            <div className="flex-1 min-w-0">
              <label className="text-xs text-white/60">الفئة</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-md bg-[#071a21] border border-white/6"
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
              {filtered.map((c) => (
                <li key={c.id}>
                  <article
                    onClick={() => setSelected(c)}
                    className="group cursor-pointer bg-[#07191f] hover:bg-[#0b2330] border border-white/6 rounded-lg p-4 flex items-center gap-4 transition"
                  >
                    <div className="w-12 h-12 rounded-md bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                      <span className="text-sm">{(c.category || c.title || 'إعلان').slice(0, 2).toUpperCase()}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-sm sm:text-base font-semibold truncate">{c.title || c.category || '—'}</h3>
                        <time className="text-xs text-white/60">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</time>
                      </div>
                      <p className="text-xs text-white/70 truncate mt-1">{c.company || c.contact || '—'}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-white/60">
                        <span>{c.city || '—'}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{c.province || '—'}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline">{c.price ? c.price : '—'}</span>
                      </div>
                      <div className="mt-2 text-xs text-white/60 line-clamp-2">{c.description || ''}</div>
                    </div>

                    <div className="flex-shrink-0">
                      <button className="px-3 py-1 rounded-md bg-white/6 hover:bg-white/10 text-sm">عرض التفاصيل</button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {selected && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSelected(null)} />

          <div className="relative max-w-4xl w-full bg-[#061017] border border-white/6 rounded-lg overflow-hidden shadow-xl z-10">
            <div className="flex items-start justify-between p-4 border-b border-white/6">
              <div>
                <h2 className="text-lg font-bold">{selected.title || selected.category || '—'}</h2>
                <p className="text-sm text-white/70">{selected.company || selected.contact || '—'}</p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="اغلاق" className="text-white/60 hover:text-white p-2 rounded">✕</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
              <div className="space-y-2">
                {selected.image_url ? (
                  <img src={selected.image_url} alt="صورة الإعلان" className="w-full h-56 object-cover rounded-md border border-white/6" />
                ) : (
                  <div className="w-full h-56 bg-[#07171b] rounded-md border border-white/6 flex items-center justify-center text-white/60">لا توجد صورة</div>
                )}

                <div className="text-sm text-white/70">
                  <p><strong>العنوان / الفئة: </strong>{selected.title || selected.category || '—'}</p>
                  <p className="mt-2"><strong>الوصف: </strong>{selected.description || '—'}</p>
                </div>

                <div className="space-y-2 mt-3">
                  <div className="text-sm text-white/70"><strong>الشركة / جهة العرض:</strong> {selected.company || '—'}</div>
                  <div className="text-sm text-white/70"><strong>جهة الاتصال:</strong> {selected.contact || '—'}</div>
                  <div className="text-sm text-white/70"><strong>الهاتف:</strong> {selected.phone || '—'}</div>
                  <div className="text-sm text-white/70"><strong>السعر:</strong> {selected.price || '—'}</div>
                  <div className="text-sm text-white/70"><strong>مكان السكن:</strong> {selected.address || '—'}</div>
                  <div className="text-sm text-white/70"><strong>الدولة:</strong> {selected.country || '—'}</div>
                  <div className="text-sm text-white/70"><strong>المحافظة:</strong> {selected.province || '—'}</div>
                  <div className="text-sm text-white/70"><strong>المدينة:</strong> {selected.city || '—'}</div>
                  <div className="text-sm text-white/70"><strong>الحالة:</strong> {selected.approved === true ? 'مقبول' : selected.approved === false ? 'مرفوض' : 'بانتظار'}</div>
                  <div className="text-sm text-white/70"><strong>تاريخ النشر:</strong> {selected.created_at ? new Date(selected.created_at).toLocaleString() : '—'}</div>
                </div>
              </div>

              <div className="h-64 lg:h-full bg-black rounded-md overflow-hidden border border-white/6">
                <iframe
                  title="خريطة الموقع"
                  src={mapEmbedUrlFor(selected)}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-white/6">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((selected.location || '') + ' ' + (selected.address || '') + ' ' + (selected.city || ''))}`}
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