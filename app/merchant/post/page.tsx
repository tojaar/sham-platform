'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

function LocationPicker({ setCoords }: { setCoords: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      setCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function PostAdPage() {
  const router = useRouter();
  const [category, setCategory] = useState('cars');
  const [isCompany, setIsCompany] = useState(false);
  const [name, setName] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [country, setCountry] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [paymentCode, setPaymentCode] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    setMessage('⏳ جاري حفظ الإعلان بانتظار الموافقة...');

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      router.push('/merchant');
      return;
    }

    const { error } = await supabase.from('ads').insert([
      {
        category,
        name,
        is_company: isCompany,
        country,
        province,
        city,
        address,
        location_lat: coords?.lat,
        location_lng: coords?.lng,
        price,
        description,
        payment_code: paymentCode,
        payment_id: paymentId,
        approved: false,
        created_by: user.id,
      },
    ]);

    if (error) {
      setMessage('❌ فشل في حفظ الإعلان: ' + error.message);
    } else {
      setMessage('✅ تم حفظ الإعلان بنجاح، بانتظار موافقتك الإدارية');
    }
  };

  return (
    <main style={main}>
      <div style={card}>
        <h1 style={heading}>📢 نشر إعلان جديد</h1>

        <select value={category} onChange={(e) => setCategory(e.target.value)} style={input}>
          <option value="cars">🚗 سيارات</option>
          <option value="real_estate">🏠 عقارات</option>
          <option value="machines">⚙️ آلات</option>
          <option value="medical">💊 منتجات طبية</option>
          <option value="home">🛋️ أدوات منزلية</option>
          <option value="food">🍔 أغذية ومشروبات</option>
          <option value="clothing">👕 ألبسة</option>
          <option value="jewelry">💍 مجوهرات</option>
          <option value="animals">🐾 حيوانات</option>
        </select>

        <input type="text" placeholder="الاسم أو اسم الشركة" value={name} onChange={(e) => setName(e.target.value)} style={input} />

        <label style={checkboxLabel}>
          <input type="checkbox" checked={isCompany} onChange={(e) => setIsCompany(e.target.checked)} />
          أنا شركة
        </label>

        {isCompany && (
          <input type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] || null)} style={input} />
        )}

        <input type="text" placeholder="الدولة" value={country} onChange={(e) => setCountry(e.target.value)} style={input} />
        <input type="text" placeholder="المحافظة" value={province} onChange={(e) => setProvince(e.target.value)} style={input} />
        <input type="text" placeholder="المدينة" value={city} onChange={(e) => setCity(e.target.value)} style={input} />
        <input type="text" placeholder="العنوان" value={address} onChange={(e) => setAddress(e.target.value)} style={input} /><h3 style={{ marginBottom: '0.5rem' }}>📍 اختر الموقع على الخريطة:</h3>
        <MapContainer center={[33.3128, 44.3615]} zoom={6} style={{ height: '300px', marginBottom: '1rem', borderRadius: '8px' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationPicker setCoords={setCoords} />
          {coords && (
            <Marker
              position={[coords.lat, coords.lng]}
              icon={L.icon({
                iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
              })}
            />
          )}
        </MapContainer>

        <input type="text" placeholder="💰 السعر" value={price} onChange={(e) => setPrice(e.target.value)} style={input} />
        <textarea placeholder="📝 الوصف الكامل" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...input, height: '100px' }} />

        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] || null)} style={input} />

        <input type="text" placeholder="🔐 رمز الدفع ( شام كاش 10,000 ل.س)" value={paymentCode} onChange={(e) => setPaymentCode(e.target.value)} style={input} />
        <input type="text" placeholder="💳 معرف الدفع ( USDT 1$)" value={paymentId} onChange={(e) => setPaymentId(e.target.value)} style={input} />

        <button onClick={handleSubmit} style={button}>حفظ الإعلان</button>
        {message && <p style={messageStyle}>{message}</p>}
      </div>
    </main>
  );
}

const main = {
  minHeight: '100vh',
  background: 'linear-gradient(to right, #0f172a, #1e3a8a)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'Segoe UI, sans-serif',
  padding: '2rem',
};

const card = {
  backgroundColor: '#fff',
  padding: '2rem',
  borderRadius: '12px',
  boxShadow: '0 0 20px rgba(0,0,0,0.2)',
  width: '100%',
  maxWidth: '600px',
};

const heading = {
  fontSize: '1.8rem',
  marginBottom: '1rem',
  color: '#1e3a8a',
  textAlign: 'center',
};

const input = {
  width: '100%',
  padding: '0.75rem',
  marginBottom: '1rem',
  borderRadius: '6px',
  border: '1px solid #ccc',
};

const button = {
  width: '100%',
  padding: '0.75rem',
  backgroundColor: '#1e3a8a',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer',
  fontWeight: 'bold',
};

const checkboxLabel = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
  marginBottom: '1rem',
};

const messageStyle = {
  marginTop: '1rem',
  color: '#1e3a8a',
  textAlign: 'center',
};