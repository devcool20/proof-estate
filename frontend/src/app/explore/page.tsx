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
    <div className="flex-grow flex flex-col antialiased text-slate-300 relative">
      <main className="flex-grow px-6 py-12 md:py-16 relative">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#00F0FF]/5 rounded-full blur-[150px] pointer-events-none"></div>
        
        <div className="max-w-[1280px] mx-auto flex flex-col gap-12 relative z-10">
          
          {/* Page Title */}
          <div className="text-left space-y-4">
             <h2 className="text-3xl md:text-5xl font-light text-white tracking-tight heading-display">Global Registry</h2>
             <p className="text-slate-400 font-light text-base md:text-lg max-w-2xl">
               Institutional-grade real estate assets, fractionalized and secured via the Solana SPL-Token-2022 protocol.
             </p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard title="Protocol Listings" icon="domain" value={loading ? "—" : `${properties.length}`} color="text-primary" glow="shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.1)]" />
            <MetricCard 
              title="Target Yield" 
              icon="percent" 
              value={loading ? "—" : properties.length > 0 
                ? `${(properties.reduce((a, b) => a + (b.yield_percent || 0), 0) / properties.length).toFixed(1)}%` 
                : "0%"} 
              color="text-[#10B981]"
              glow="shadow-[0_0_20px_rgba(16,185,129,0.1)]"
            />
            <MetricCard 
              title="Registry TVL" 
              icon="monitoring" 
              value={loading ? "—" : formatInr(properties.reduce((a, b) => a + (b.asset_value_inr || 0), 0))} 
              color="text-[#00F0FF]"
              glow="shadow-[0_0_20px_rgba(0,240,255,0.1)]"
            />
            <MetricCard title="Oracle Integrity" icon="verified" value="v2.4" color="text-slate-200" glow="" />
          </div>

          <div className="mt-4 border-t border-white/5 pt-12">
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="glass-panel rounded-3xl h-[400px] animate-pulse border-white/5" />
                  ))}
                </div>
            ) : properties.length === 0 ? (
                <div className="glass-panel rounded-3xl p-20 text-center border-white/10 group">
                   <div className="size-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-8">
                     <span className="material-symbols-outlined text-5xl text-slate-600">search_off</span>
                   </div>
                   <p className="text-xl font-light text-slate-400 heading-display">No active listings synchronized.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                   {properties.map(p => (
                       <ListingCard 
                           key={p.id}
                           id={p.id}
                           image={getDocUrl(p.image_url || p.document_url)}
                           type={p.property_type?.toUpperCase() || "PROPERTY"}
                           name={p.name}
                           location={`${p.city || "Registry Area"}`}
                           yieldRate={p.yield_percent ? `${p.yield_percent}%` : "—"}
                           price={p.token_price_usd ? `$${p.token_price_usd}` : "—"}
                         />
                   ))}
                </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ title, icon, value, color, glow }: { title: string, icon: string, value: string, color: string, glow: string }) {
 return (
   <div className={`glass-panel p-8 rounded-3xl border-white/10 transition-all hover:border-white/20 group relative overflow-hidden ${glow}`}>
     <div className="flex justify-between items-start mb-6">
       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{title}</p>
       <span className={`material-symbols-outlined text-[20px] ${color} opacity-60`}>{icon}</span>
     </div>
     <p className={`text-3xl md:text-4xl font-light text-white tracking-tight heading-display mb-1`}>{value}</p>
     <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-[#10B981]">
       <span className="material-symbols-outlined text-[14px]">trending_up</span> Live
     </div>
   </div>
 );
}

function ListingCard({ id, image, type, name, location, yieldRate, price }: { id: string, image: string, type: string, name: string, location: string, yieldRate: string, price: string }) {
 return (
   <Link href={`/explore/${id}`} className="glass-panel group rounded-3xl overflow-hidden border-white/10 transition-all duration-500 hover:border-[#00F0FF]/30 hover:-translate-y-1 block relative">
     <div className="relative h-64 w-full overflow-hidden">
       <div className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110" style={{ backgroundImage: `url('${image}')` }}></div>
       <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-transparent to-transparent opacity-80" />
       
       <div className="absolute top-4 left-4 flex gap-2">
         <span className="px-3 py-1 bg-black/50 backdrop-blur-md border border-white/10 text-white text-[9px] font-bold uppercase tracking-widest rounded-full">{type}</span>
         <span className="px-3 py-1 bg-[#10B981]/80 backdrop-blur-md text-white text-[9px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1.5">
           <span className="material-symbols-outlined text-[14px]">verified</span> VERIFIED
         </span>
       </div>
     </div>
     
     <div className="p-8 flex flex-col gap-6 relative z-10">
       <div className="space-y-1">
          <h3 className="text-xl md:text-2xl font-light text-white leading-tight heading-display group-hover:text-[#00F0FF] transition-colors">{name}</h3>
          <p className="text-slate-500 text-sm font-light flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">location_on</span>
            {location}
          </p>
       </div>

       <div className="grid grid-cols-2 gap-8 border-y border-white/5 py-6">
         <div className="space-y-1">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Est. Yield</p>
           <p className="text-lg md:text-xl font-light text-[#10B981]">{yieldRate}</p>
         </div>
         <div className="space-y-1 text-right">
           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entry Price</p>
           <p className="text-lg md:text-xl font-light text-white">{price}</p>
         </div>
       </div>

       <div className="mt-2">
          <button className="w-full h-12 border border-[#00F0FF]/30 text-[#00F0FF] hover:bg-[#00F0FF] hover:text-black hover:shadow-[0_0_20px_rgba(0,240,255,0.2)] text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 group">
             Initialize Access
             <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
          </button>
       </div>
     </div>
   </Link>
 );
}
