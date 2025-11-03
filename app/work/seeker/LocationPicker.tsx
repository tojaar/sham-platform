'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useState } from 'react';

export default function LocationPicker({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  const [position, setPosition] = useState<[number, number] | null>(null);

  function LocationMarker() {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        onSelect(lat, lng);
      },
    });

    return position === null ? null : <Marker position={position} />;
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <label style={{ fontWeight: 'bold', color: '#1e40af' }}>🗺️ اختر موقعك الجغرافي على الخريطة</label>
      <MapContainer center={[33.3128, 44.3615]} zoom={10} style={{ height: '300px', width: '100%', marginTop: '0.5rem', borderRadius: '12px' }}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <LocationMarker />
      </MapContainer>
    </div>
  );
}