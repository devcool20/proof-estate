"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { listMarketplace, getDocUrl, type Property } from "@/lib/api";

function formatInr(paise?: number) {
  if (!paise) return "—";
  const crore = paise / 1_00_00_000;
  if (crore >= 1) return `₹${crore.toFixed(2)} Cr`;
  const lakh = paise / 1_00_000;
  return `₹${lakh.toFixed(1)} L`;
}

export default function ExplorePage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMarketplace()
      .then(setProperties)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative flex h-full w-full flex-col group/design-root overflow-x-hidden bg-background-light ">
      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-8 lg:px-40 py-8 bg-background-light ">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
          {/* Page Title */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-primary text-[32px] font-bold leading-tight tracking-tight">Marketplace</h1>
              <p className="text-text-secondary-light mt-2">Institutional-grade real estate assets tokenized on Solana.</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Active Listings" icon="domain" value={loading ? "—" : `${properties.length}`} trend="-" />
            <MetricCard 
              title="Avg Yield" 
              icon="percent" 
              value={loading ? "—" : properties.length > 0 
                ? `${(properties.reduce((a, b) => a + (b.yield_percent || 0), 0) / properties.length).toFixed(1)}%` 
                : "0%"} 
              trend="-" 
            />
            <MetricCard 
              title="Market Cap" 
              icon="monitoring" 
              value={loading ? "—" : formatInr(properties.reduce((a, b) => a + (b.asset_value_inr || 0), 0))} 
              trend="-" 
            />
            <MetricCard title="Trust Score" icon="verified" value="v2.1" trend="-" iconColor="text-emerald-500" />
          </div>

          {loading ? (
             <div className="flex justify-center p-20">
                <span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span>
             </div>
          ) : properties.length === 0 ? (
             <div className="bg-white rounded-2xl p-16 text-center border border-slate-100">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-4">search_off</span>
                <p className="text-slate-500 font-medium">No properties available in the marketplace yet.</p>
             </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {properties.map(p => (
                   <ListingCard 
                       key={p.id}
                       id={p.id}
                       image={getDocUrl(p.document_url)}
                       type={p.property_type?.toUpperCase() || "PROPERTY"}
                       name={p.name}
                       trust="Verified"
                       location={`${p.city || ""}, ${p.country || ""}`}
                       yieldRate={p.yield_percent ? `${p.yield_percent}%` : "—"}
                       price={p.token_price_usd ? `$${p.token_price_usd}` : "—"}
                     />
               ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function MetricCard({ title, icon, value, trend, iconColor = "text-primary " }: { title: string, icon: string, value: string, trend: string, iconColor?: string }) {
 return (
 <div className="bg-white p-6 rounded-xl border border-border-light shadow-sm">
 <div className="flex justify-between items-start mb-2">
 <p className="text-text-secondary-light text-sm font-medium">{title}</p>
 <span className={`material-symbols-outlined ${iconColor} text-[20px]`}>{icon}</span>
 </div>
 <div className="flex items-end gap-2">
 <p className="text-primary text-3xl font-bold tracking-tight">{value}</p>
 <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-1.5 py-0.5 rounded flex items-center mb-1">
 <span className="material-symbols-outlined text-[12px] mr-0.5">trending_up</span> {trend}
 </span>
 </div>
 </div>
 );
}

function FilterTab({ active, label }: { active?: boolean, label: string }) {
 if (active) {
 return (
 <button className="flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-white text-sm font-medium whitespace-nowrap shadow-sm">
 {label}
 <span className="material-symbols-outlined text-[16px]">expand_more</span>
 </button>
 );
 }
 return (
 <button className="flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-border-light text-text-primary-light text-sm font-medium whitespace-nowrap hover:bg-gray-50 transition-colors">
 {label}
 <span className="material-symbols-outlined text-[16px]">expand_more</span>
 </button>
 );
}

function ListingCard({ id, image, type, name, trust, location, yieldRate, price }: { id: string, image: string, type: string, name: string, trust: string, location: string, yieldRate: string, price: string }) {
 return (
 <Link href={`/explore/${id}`} className="group bg-white rounded-xl overflow-hidden border border-border-light hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col h-full cursor-pointer block">
 <div className="relative h-56 w-full overflow-hidden">
 <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${image}')` }}></div>
 <div className="absolute top-3 left-3 flex gap-2">
 <span className="px-2 py-1 bg-white/90 backdrop-blur-sm text-primary text-xs font-bold rounded shadow-sm">{type}</span>
 <span className="px-2 py-1 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold rounded flex items-center gap-1 shadow-sm">
 <span className="material-symbols-outlined text-[14px]">verified_user</span> VERIFIED
 </span>
 </div>
 </div>
 <div className="p-5 flex flex-col flex-1">
 <div className="flex justify-between items-start mb-2">
 <h3 className="text-primary text-lg font-bold leading-tight">{name}</h3>
 <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold border border-emerald-100 ">
 {trust}
 </span>
 </div>
 <p className="text-text-secondary-light text-sm flex items-center gap-1 mb-4">
 <span className="material-symbols-outlined text-[16px]">location_on</span>
 {location}
 </p>
 <div className="grid grid-cols-2 gap-4 mb-6 py-4 border-t border-b border-border-light bg-background-light/50 -mx-5 px-5">
 <div>
 <p className="text-text-secondary-light text-xs font-medium uppercase tracking-wider">Yield</p>
 <p className="text-primary font-bold text-lg">{yieldRate}</p>
 </div>
 <div>
 <p className="text-text-secondary-light text-xs font-medium uppercase tracking-wider">Price</p>
 <p className="text-primary font-bold text-lg">{price}</p>
 </div>
 </div>
 <div className="mt-auto pt-2">
 <button className="w-full h-10 bg-white border border-border-light hover:border-primary text-primary text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-white group-hover:border-transparent">
 View Details
 <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
 </button>
 </div>
 </div>
 </Link>
 );
}
