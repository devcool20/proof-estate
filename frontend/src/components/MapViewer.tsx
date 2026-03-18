"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { Property } from "@/lib/api";

// Fix leaflet marker icon issues in Next.js
const customIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// A component to auto-fit the map to markers when properties change
function MapController({ properties }: { properties: Property[] }) {
  const map = useMap();

  useEffect(() => {
    if (properties.length > 0) {
      const bounds = L.latLngBounds(
        properties.map((p) => [
          p.latitude || 20.5937, // fallback to India if no lat/lng
          p.longitude || 78.9629
        ])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
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
      <div className="w-full h-full bg-slate-100 flex items-center justify-center animate-pulse">
        <span className="text-slate-400 font-medium">Loading Map...</span>
      </div>
    );
  }

  // Fallback center
  const center: [number, number] = properties.length > 0 
    ? [properties[0].latitude || 20.5937, properties[0].longitude || 78.9629] 
    : [20.5937, 78.9629];

  return (
    <div className="w-full h-[calc(100vh-80px)] lg:h-[calc(100vh-73px)] relative z-0">
      <MapContainer 
        center={center} 
        zoom={5}
        minZoom={4}
        maxBounds={[[6.4626999, 68.1097], [35.513327, 97.395358]]}
        maxBoundsViscosity={1.0}
        scrollWheelZoom={true} 
        className="w-full h-full"
        zoomControl={false}
      >
        {/* We use MapLibre-style light themes or CartoDB Positron for a light classy map */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {properties.map((property) => (
          <Marker 
            key={property.id} 
            position={[(property.latitude || 20.5937) + (Math.random() - 0.5) * 0.1, (property.longitude || 78.9629) + (Math.random() - 0.5) * 0.1]}
            icon={customIcon}
          >
            <Popup className="custom-popup" closeButton={false}>
              <Link href={`/explore/${property.id}`} className="block w-48 overflow-hidden rounded-xl border border-slate-200 shadow-lg text-slate-800 bg-white group cursor-pointer">
                <div className="h-28 w-full overflow-hidden bg-slate-100 relative">
                  <img 
                    src={property.images && property.images.length > 0 ? property.images[0] : "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=400&auto=format&fit=crop"} 
                    alt={property.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 bg-[#10B981] text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-md shadow-sm">
                    {property.status === "tokenized" ? "Tokenized" : "Verified"}
                  </div>
                </div>
                <div className="p-3">
                  <h4 className="font-bold text-sm truncate">{property.name}</h4>
                  <p className="text-primary font-bold text-sm mt-1">
                    {property.token_price_usd ? `$${property.token_price_usd}` : "$150,000"}
                  </p>
                  <p className="text-slate-500 text-xs truncate mt-1">
                    {property.address}
                  </p>
                </div>
              </Link>
            </Popup>
          </Marker>
        ))}

        <MapController properties={properties} />
      </MapContainer>
      
      {/* Custom styles to override leaflet defaults to match our theme */}
      <style jsx global>{`
        .leaflet-container {
          background: #f2f2f2;
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          padding: 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15);
        }
        .leaflet-popup-content {
          margin: 0;
        }
        .leaflet-popup-tip {
          background: white;
        }
      `}</style>
    </div>
  );
}
