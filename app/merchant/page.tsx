// app/merchant/page.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

type CommPayload = {
  category: string;
  name: string;
  phone?: string | null;
  is_company: boolean;
  company_logo?: string | null;
  image_url?: string | null;
  country?: string | null;
  province?: string | null;
  city?: string | null;
  address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  price?: string | null;
  description?: string | null;
  payment_code?: string | null;
  payment_id?: string | null;
  approved?: boolean;
  created_by?: string | null;
  [key: string]: unknown;
};

type LatLng = { lat: number; lng: number };

type LeafletAPI = {
  MapContainer?: React.JSXElementConstructor<unknown>;
  TileLayer?: React.JSXElementConstructor<unknown>;
  Marker?: React.JSXElementConstructor<unknown>;
  useMapEvents?: (handlers: { click: (e: { latlng: LatLng }) => void }) => void;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.onload = () => {
      const res = reader.result;
      if (typeof res === 'string') resolve(res.split(',')[1]);
      else reject(new Error('نتيجة القراءة غير صالحة'));
    };
    reader.readAsDataURL(file);
  });

const uploadToImgbb = async (file: File | null): Promise<string | null> => {
  if (!file) return null;
  const key = process.env.NEXT_PUBLIC_IMGBB_KEY;
  if (!key) throw new Error('مفتاح IMGBB غير موجود.');
  const base64 = await fileToBase64(file);
  const form = new URLSearchParams();
  form.append('key', key);
  form.append('image', base64);
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form });
  const json = await res.json();
  if (!res.ok || !json?.data?.url) throw new Error(json?.error?.message ?? 'فشل رفع الصورة');
  return json.data.url as string;
};

export default function PostAdPage() {
  const [category, setCategory] = useState('cars');
  const [isCompany, setIsCompany] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [personName, setPersonName] = useState('');
  const [phone, setPhone] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<LatLng | null>(null);

  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [paymentCode, setPaymentCode] = useState('');
  const [paymentId, setPaymentId] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [leafletReady, setLeafletReady] = useState(false);
  const leafletRef = useRef<LeafletAPI | null>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImagePreview(url);
      return () => URL.revokeObjectURL(url);
    } else setImagePreview(null);
  }, [imageFile]);

  useEffect(() => {
    if (logoFile) {
      const url = URL.createObjectURL(logoFile);
      setLogoPreview(url);
      return () => URL.revokeObjectURL(url);
    } else setLogoPreview(null);
  }, [logoFile]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (typeof window === 'undefined') return;

      try {
        // inject leaflet CSS once (safe for SSR)
        if (typeof document !== 'undefined' && !document.querySelector('link[data-leaflet-css]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          (link as HTMLLinkElement).dataset.leafletCss = '1';
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

        // Access Icon.Default safely via unknown + Reflect to avoid incompatible cast errors
        const leafletUnknown: unknown = leafletModule;
        try {
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

        // store runtime components as JSX constructors (unknown props allowed)
        leafletRef.current = {
          MapContainer: (reactLeafletModule as Record<string, unknown>).MapContainer as React.JSXElementConstructor<unknown>,
          TileLayer: (reactLeafletModule as Record<string, unknown>).TileLayer as React.JSXElementConstructor<unknown>,
          Marker: (reactLeafletModule as Record<string, unknown>).Marker as React.JSXElementConstructor<unknown>,
          useMapEvents: (reactLeafletModule as Record<string, unknown>).useMapEvents as (handlers: { click: (e: { latlng: LatLng }) => void }) => void,
        };

        if (mounted) setLeafletReady(true);
      } catch (err) {
        console.error('failed loading leaflet/react-leaflet', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const LocationPicker = ({ onSet }: { onSet: (c: LatLng) => void }) => {
    const u = leafletRef.current?.useMapEvents;
    if (!u) return null;
    u({
      click(e: { latlng: LatLng }) {
        onSet({ lat: e.latlng.lat, lng: e.latlng.lng });
      },
    });
    return null;
  };

  const validate = () => {
    if (isCompany && !companyName.trim()) {
      setMessage('الرجاء كتابة اسم الشركة');
      return false;
    }
    if (!isCompany && !personName.trim()) {
      setMessage('الرجاء كتابة الاسم');
      return false;
    }
    if (!country.trim() || !province.trim() || !city.trim()) {
      setMessage('الرجاء تزويد الدولة والمحافظة والمدينة');
      return false;
    }
    if (!coords) {
      setMessage('الرجاء اختيار الموقع على الخريطة');
      return false;
    }
    if (phone && phone.trim().length < 5) {
      setMessage('الرجاء إدخال رقم هاتف صالح أو تركه فارغاً');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setMessage(null);
    if (!validate()) return;

    setLoading(true);
    setMessage('⏳ جاري رفع الصور وحفظ الإعلان...');

    try {
      const imageUrl = imageFile ? await uploadToImgbb(imageFile) : null;
      const logoUrl = logoFile ? await uploadToImgbb(logoFile) : null;

      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) {
        setMessage('تحتاج لتسجيل الدخول أولاً');
        setLoading(false);
        return;
      }

      const payload: CommPayload = {
        category,
        name: isCompany ? companyName.trim() : personName.trim(),
        phone: phone || null,
        is_company: isCompany,
        company_logo: logoUrl ?? null,
        image_url: imageUrl ?? null,
        country: country || null,
        province: province || null,
        city: city || null,
        address: address || null,
        location_lat: coords?.lat ?? null,
        location_lng: coords?.lng ?? null,
        price: price || null,
        description: description || null,
        payment_code: paymentCode || null,
        payment_id: paymentId || null,
        approved: false,
        created_by: user.id,
      };

      const { error } = await supabase.from('ads').insert([payload]);
      if (error) throw error;

      setMessage('✅ تم حفظ الإعلان بنجاح. بانتظار الموافقة.');
    } catch (err) {
      console.error(err);
      const msg = (err as { message?: string })?.message ?? String(err);
      setMessage('❌ حدث خطأ أثناء الحفظ: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    page: {
      minHeight: '100vh',
      background: 'linear-gradient(180deg,#071226 0%, #08263a 100%)',
      padding: '20px',
      fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
      color: '#0b1220',
    } as React.CSSProperties,
    container: {
      maxWidth: 820,
      margin: '0 auto',
      background: '#0f1724',
      borderRadius: 14,
      padding: 18,
      boxShadow: '0 8px 30px rgba(2,6,23,0.6)',
      color: '#e6eef8',
    } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '12px 14px',
      borderRadius: 10,
      border: '1px solid rgba(255,255,255,0.06)',
      background: '#071126',
      color: '#e6eef8',
      outline: 'none',
      fontSize: 14,
    } as React.CSSProperties,
    previewBox: {
      width: 92,
      height: 92,
      borderRadius: 10,
      background: '#06131d',
      border: '1px solid rgba(255,255,255,0.04)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    } as React.CSSProperties,
    btnPrimary: {
      padding: '12px 16px',
      background: 'linear-gradient(90deg,#0ea5a3,#0891b2)',
      color: '#042024',
      border: 'none',
      borderRadius: 10,
      fontWeight: 700,
      cursor: 'pointer',
      fontSize: 15,
    } as React.CSSProperties,
    mapWrap: {
      width: '100%',
      height: 300,
      borderRadius: 10,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.04)',
    } as React.CSSProperties,
  };

  return (
    <main style={styles.page}>
      <div style={styles.container}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>📣 أنشر إعلانك</div>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <select value={category} onChange={(e) => setCategory(e.target.value)} style={styles.input}>
            <option value="cars">🚗 سيارات</option>
            <option value="real_estate">🏠 عقارات</option>
            <option value="machines">⚙️ آلات</option>
            <option value="medical">💊 منتجات طبية</option>
            <option value="home">🛋 أدوات منزلية</option>
            <option value="food">🍔 أغذية ومشروبات</option>
            <option value="clothing">👕 ألبسة</option>
            <option value="jewelry">💍 مجوهرات</option>
            <option value="animals">🐾 حيوانات</option>
          </select>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={isCompany} onChange={(e) => setIsCompany(e.target.checked)} />
              <span style={{ fontSize: 13, color: '#9fb3c9' }}>أنا شركة</span>
            </label>

            {isCompany ? (
              <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="اسم الشركة" style={{ ...styles.input, flex: 1 }} />
            ) : (
              <input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="الاسم" style={{ ...styles.input, flex: 1 }} />
            )}
          </div>

          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" style={styles.input} />

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, color: '#9fb3c9', fontSize: 13 }}>شعار الشركة (اختياري)</label>
              <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} style={{ ...styles.input, padding: 8 }} />
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#9fb3c9' }}>الشعار سيُعرض عند وجوده في تفاصيل الإعلان</div>
              </div>
            </div>

            <div style={styles.previewBox}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {logoPreview ? <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ color: '#7f9fb6', fontSize: 12 }}>معاينة شعار</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="الدولة" style={styles.input} />
            <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="المحافظة" style={styles.input} />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="المدينة" style={styles.input} />
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="العنوان" style={styles.input} />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: '#9fb3c9' }}>📍 اختر الموقع على الخريطة (انقر لتعيين)</div>
              {coords ? <div style={{ fontSize: 13, color: '#bfeffd' }}>{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</div> : null}
            </div>
            <div style={styles.mapWrap}>
              {!leafletReady || !leafletRef.current ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bcdfe7', padding: 12 }}>
                  تحميل مكوّن الخريطة...
                </div>
              ) : (
                (() => {
                  const MapContainerComp = leafletRef.current?.MapContainer;
                  const TileLayerComp = leafletRef.current?.TileLayer;
                  const MarkerComp = leafletRef.current?.Marker;

                  if (!MapContainerComp || !TileLayerComp || !MarkerComp) {
                    return (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bcdfe7', padding: 12 }}>
                        تحميل مكوّن الخريطة...
                      </div>
                    );
                  }

                  // Use React.createElement to avoid JSX typing issues with runtime-loaded constructors
                  return React.createElement(
                    MapContainerComp as React.JSXElementConstructor<any>,
                    {
                      whenCreated: (m: unknown) => {
                        mapRef.current = m;
                        setTimeout(() => {
                          try {
                            (m as { invalidateSize?: () => void }).invalidateSize?.();
                          } catch {}
                        }, 120);
                      },
                      center: [33.3128, 44.3615],
                      zoom: 6,
                      style: { width: '100%', height: '100%' },
                    },
                    React.createElement(TileLayerComp as React.JSXElementConstructor<any>, { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' }),
                    React.createElement(LocationPicker, { onSet: (c: LatLng) => setCoords(c) }),
                    coords ? React.createElement(MarkerComp as React.JSXElementConstructor<any>, { position: [coords.lat, coords.lng] }) : null
                  );
                })()
              )}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#9fb3c9' }}>اضغط على الخريطة لاختيار الإحداثيات بدقة</div>
          </div>

          <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="السعر (اختياري)" style={styles.input} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="الوصف الكامل" style={{ ...styles.input, minHeight: 120 }} />

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: 6, color: '#9fb3c9', fontSize: 13 }}>صورة الإعلان (اختياري)</label>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} style={{ ...styles.input, padding: 8 }} />
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12, color: '#9fb3c9' }}>صيغ مدعومة: JPG, PNG. ستُرفع إلى imgbb</div>
              </div>
            </div>

            <div style={styles.previewBox}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {imagePreview ? <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <div style={{ color: '#7f9fb6', fontSize: 12 }}>معاينة الصورة</div>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input value={paymentCode} onChange={(e) => setPaymentCode(e.target.value)} placeholder="رمز الدفع (مثال: شام كاش 10000)" style={styles.input} />
            <input value={paymentId} onChange={(e) => setPaymentId(e.target.value)} placeholder="معرف الدفع (مثال: USDT 1$)" style={styles.input} />
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSubmit} disabled={loading} style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}>
                {loading ? 'جارٍ الحفظ...' : 'حفظ الإعلان'}
              </button>
              <button
                onClick={() => {
                  setCategory('cars');
                  setIsCompany(false);
                  setCompanyName('');
                  setPersonName('');
                  setPhone('');
                  setLogoFile(null);
                  setImageFile(null);
                  setCountry('');
                  setProvince('');
                  setCity('');
                  setAddress('');
                  setCoords(null);
                  setPrice('');
                  setDescription('');
                  setPaymentCode('');
                  setPaymentId('');
                  setMessage(null);
                }}
                style={{
                  padding: '10px 14px',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#cfeff7',
                  borderRadius: 10,
                  cursor: 'pointer',
                }}
              >
                إعادة تعيين
              </button>
            </div>

            <div style={{ minWidth: 220, textAlign: 'right', fontSize: 12, color: '#9fb3c9' }}>
              بعد الحفظ يتم المراجعة من قبل الإدارة
            </div>
          </div>

          {message && <div style={{ marginTop: 8, color: '#fff', textAlign: 'center' }}>{message}</div>}
        </div>
      </div>
    </main>
  );
}