'use client';

import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { useState } from 'react';
import 'leaflet/dist/leaflet.css';

export default function MapPicker({ onSelect }: { onSelect: (coords: { lat: number; lng: number }) => void }) {
  const [position, setPosition] = useState({ lat: 33.5138, lng: 36.2765 }); // دمشق كنقطة بداية

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
        onSelect(e.latlng);
      },
    });

    return <Marker position={position} />;
  }

  return (
    <MapContainer
      center={position}
      zoom={12}
      scrollWheelZoom={true}
      style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden' }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker />
    </MapContainer>
  );
}