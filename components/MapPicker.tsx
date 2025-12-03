// components/MapPicker.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type LatLng = { lat: number; lng: number };

function ClickHandler({ onSelect, setPos }: { onSelect: (coords: LatLng | null) => void; setPos: (p: LatLng | null) => void }) {
  useMapEvents({
    click(e) {
      const coords = { lat: e.latlng.lat, lng: e.latlng.lng };
      setPos(coords);
      onSelect(coords);
    },
  });
  return null;
}

export default function MapPicker(props: {
  onSelect: (coords: LatLng | null) => void;
  value?: string | null;
  center?: LatLng;
  zoom?: number;
}) {
  const { onSelect, value, center = { lat: 33.3128, lng: 44.3615 }, zoom = 6 } = props;

  // حالة محلية لعرض العلامة بعد النقر
  const [pos, setPos] = useState<LatLng | null>(() => {
    if (!value) return null;
    const parts = String(value).split(',').map((p) => p.trim());
    if (parts.length !== 2) return null;
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  });

  // أيقونة نقطة حمراء صغيرة (DivIcon)
  const redDotIcon = useMemo(() => {
    return new L.DivIcon({
      className: 'map-red-dot-icon',
      html:
        '<div style="width:14px;height:14px;background:#e11;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,0.18)"></div>',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });
  }, []);

  return (
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={{ width: '100%', height: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <ClickHandler onSelect={onSelect} setPos={setPos} />
      {pos ? <Marker position={[pos.lat, pos.lng]} icon={redDotIcon} /> : null}
    </MapContainer>
  );
}