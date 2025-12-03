// components/LocationPicker.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function LocationPicker({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null);

  // DivIcon صغير يمثل نقطة حمراء بدون استخدام أي صورة خارجية
  const redDotIcon = useMemo(() => {
    return new L.DivIcon({
      className: 'leaflet-red-dot',
      html: '<div style="width:14px;height:14px;background:#e11;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,0.18)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }, []);

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        onSelect(lat, lng);
      },
    });

    return position === null ? null : <Marker position={position} icon={redDotIcon} />;
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <label style={{ fontWeight: 'bold', color: '#1e40af' }}>🗺 اختر موقعك الجغرافي على الخريطة</label>
      <MapContainer center={[33.3128, 44.3615]} zoom={10} style={{ height: '300px', width: '100%', marginTop: '0.5rem', borderRadius: '12px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationMarker />
      </MapContainer>
    </div>
  );
}