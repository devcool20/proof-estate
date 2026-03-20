"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { Property, getDocUrl } from "@/lib/api";

// Premium gold pin icon
const goldIcon = new L.DivIcon({
  className: "",
  html: `<div style="
    width: 32px; 
    height: 32px; 
    background: linear-gradient(135deg, #f2ca50 0%, #d4af37 100%);
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid rgba(255,255,255,0.3);
    box-shadow: 0 4px 16px rgba(212, 175, 55, 0.5);
  "></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -36],
});

// City → [lat, lng] lookup table for Indian cities
const CITY_COORDS: Record<string, [number, number]> = {
  "bengaluru": [12.9716, 77.5946],
  "bangalore": [12.9716, 77.5946],
  "mumbai": [19.0760, 72.8777],
  "delhi": [28.7041, 77.1025],
  "new delhi": [28.6139, 77.2090],
  "hyderabad": [17.3850, 78.4867],
  "chennai": [13.0827, 80.2707],
  "kolkata": [22.5726, 88.3639],
  "pune": [18.5204, 73.8567],
  "ahmedabad": [23.0225, 72.5714],
  "surat": [21.1702, 72.8311],
  "jaipur": [26.9124, 75.7873],
  "lucknow": [26.8467, 80.9462],
  "kanpur": [26.4499, 80.3319],
  "nagpur": [21.1458, 79.0882],
  "indore": [22.7196, 75.8577],
  "thane": [19.2183, 72.9781],
  "bhopal": [23.2599, 77.4126],
  "visakhapatnam": [17.6868, 83.2185],
  "pimpri": [18.6279, 73.8009],
  "gurgaon": [28.4595, 77.0266],
  "gurugram": [28.4595, 77.0266],
  "noida": [28.5355, 77.3910],
  "coimbatore": [11.0168, 76.9558],
  "kochi": [9.9312, 76.2673],
  "chandigarh": [30.7333, 76.7794],
  "goa": [15.2993, 74.1240],
  "bhubaneswar": [20.2961, 85.8245],
  "vadodara": [22.3072, 73.1812],
  "patna": [25.5941, 85.1376],
};

function getCityCoords(property: Property): [number, number] {
  // If direct lat/lng is available, use it
  if (property.latitude && property.longitude) {
    return [property.latitude, property.longitude];
  }
  // Lookup by city name
  if (property.city) {
    const key = property.city.toLowerCase().trim();
    for (const [cityKey, coords] of Object.entries(CITY_COORDS)) {
      if (key.includes(cityKey) || cityKey.includes(key)) {
        return coords;
      }
    }
  }
  // Lookup from address string
  if (property.address) {
    const addr = property.address.toLowerCase();
    for (const [cityKey, coords] of Object.entries(CITY_COORDS)) {
      if (addr.includes(cityKey)) {
        return coords;
      }
    }
  }
  // Default to geometric center of India
  return [20.5937, 78.9629];
}

// Subtle random jitter so markers on same city don't overlap exactly
function addJitter(coord: [number, number], seed: string): [number, number] {
  // deterministic jitter so markers don't jump on re-render
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash) + seed.charCodeAt(i) | 0;
  const jitter = 0.04; // ~4km
  return [
    coord[0] + ((hash % 100) / 100 - 0.5) * jitter,
    coord[1] + ((hash % 137) / 137 - 0.5) * jitter,
  ];
}

// Auto-fit map to all markers
function MapController({ properties }: { properties: Property[] }) {
  const map = useMap();

  useEffect(() => {
    if (properties.length === 0) return;

    const allCoords = properties.map((p) => getCityCoords(p));
    const bounds = L.latLngBounds(allCoords);
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 11, animate: true });
  }, [properties, map]);

  return null;
}

export default function MapViewer({ properties }: { properties: Property[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-[#0a0e14] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white/30">
          <span className="material-symbols-outlined text-4xl font-light animate-spin text-[#d4af37]">autorenew</span>
          <span className="text-xs font-bold tracking-widest uppercase">Loading Registry Map</span>
        </div>
      </div>
    );
  }

  const center: [number, number] = [20.5937, 78.9629]; // India center

  return (
    <div className="w-full h-[calc(100vh-80px)] lg:h-[calc(100vh-73px)] relative z-0">
      <MapContainer
        center={center}
        zoom={5}
        minZoom={4}
        maxBounds={[[4, 60], [38, 100]]}
        maxBoundsViscosity={0.9}
        scrollWheelZoom={true}
        className="w-full h-full"
        zoomControl={false}
      >
        {/* Dark map tile - CartoDB Dark Matter */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {properties.map((property) => {
          const baseCoord = getCityCoords(property);
          const pos = addJitter(baseCoord, property.id);

          return (
            <Marker
              key={property.id}
              position={pos}
              icon={goldIcon}
            >
              <Popup className="custom-popup" closeButton={false} maxWidth={224}>
                <Link href={`/explore/${property.id}`} className="block w-56 overflow-hidden rounded-xl bg-[#171c21] border border-white/10 shadow-2xl text-white group cursor-pointer">
                  <div className="h-32 w-full overflow-hidden relative">
                    <img
                      src={
                        property.images && property.images[0]
                          ? getDocUrl(property.images[0])
                          : property.image_url
                          ? getDocUrl(property.image_url)
                          : `https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=400&auto=format&fit=crop`
                      }
                      alt={property.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#171c21] to-transparent"></div>
                    <div className="absolute top-2 left-2 bg-[#d4af37] text-black text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shadow-sm">
                      {property.status === "tokenized" ? "Tokenized" : "Verified"}
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-bold text-sm text-white truncate">{property.name}</h4>
                    <p className="text-[#d4af37] font-bold text-sm mt-1">
                      {property.token_price_usd ? `$${(property.token_price_usd).toLocaleString()}` : "Private Valuation"}
                    </p>
                    <p className="text-white/40 text-xs truncate mt-1">{property.city || property.address}</p>
                    <div className="flex items-center justify-end mt-3 text-[#d4af37]">
                      <span className="text-[9px] font-bold tracking-widest uppercase">View Asset</span>
                      <span className="material-symbols-outlined text-[14px] ml-1">arrow_forward</span>
                    </div>
                  </div>
                </Link>
              </Popup>
            </Marker>
          );
        })}

        <MapController properties={properties} />
      </MapContainer>

      {/* Custom leaflet dark theme overrides */}
      <style jsx global>{`
        .leaflet-container {
          background: #0a0e14;
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          padding: 0 !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          background: transparent !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.8) !important;
          border: 1px solid rgba(255,255,255,0.08) !important;
        }
        .leaflet-popup-content {
          margin: 0 !important;
          width: auto !important;
        }
        .leaflet-popup-tip-container {
          display: none;
        }
        .leaflet-control-zoom {
          border: 1px solid rgba(255,255,255,0.1) !important;
          border-radius: 8px !important;
          overflow: hidden;
        }
        .leaflet-control-zoom a {
          background: #171c21 !important;
          color: #d4af37 !important;
          border-color: rgba(255,255,255,0.1) !important;
        }
        .leaflet-control-zoom a:hover {
          background: #1a2027 !important;
        }
        .leaflet-attribution-flag {
          display: none;
        }
      `}</style>
    </div>
  );
}
