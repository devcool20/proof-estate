"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { listMarketplace, getDocUrl, type Property } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useTheme } from "@/lib/ThemeContext";

const MapViewer = dynamic(() => import("@/components/MapViewer"), { ssr: false });

function formatInr(paise?: number) {
  if (!paise) return "—";
  const crore = paise / 1_00_00_000;
  if (crore >= 1) return `₹${crore.toFixed(2)} Cr`;
  const lakh = paise / 1_00_000;
  return `₹${lakh.toFixed(1)} L`;
}

function ExploreContent() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  
  // Search parameters
  const [query, setQuery] = useState(searchParams.get("query") || "");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showMapMobile, setShowMapMobile] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    const q = searchParams.get("query");
    if (q) setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    listMarketplace()
      .then(setProperties)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredProperties = properties.filter((p) => {
    const matchesQuery = p.name.toLowerCase().includes(query.toLowerCase()) || p.address.toLowerCase().includes(query.toLowerCase());
    const matchesType = typeFilter === "all" || p.property_type?.toLowerCase() === typeFilter;
    return matchesQuery && matchesType;
  });

  return (
    <div className="flex-grow flex flex-col md:flex-row antialiased max-w-[1920px] mx-auto w-full relative h-[calc(100vh-80px)] lg:h-[calc(100vh-73px)] overflow-hidden" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      
      {/* Left Sidebar - Listings */}
      <div className={`w-full md:w-[360px] lg:w-[400px] h-full overflow-y-auto flex flex-col shrink-0 border-r ${isDark ? 'bg-[var(--bg-card)] border-white/5' : 'bg-white border-slate-200'}`}>
         <div className={`p-4 pb-3 sticky top-0 backdrop-blur-md z-10 border-b shadow-sm ${isDark ? 'bg-[var(--bg-card)]/90 border-white/5' : 'bg-white/90 border-slate-100'}`}>
            <h1 className="text-xl font-bold heading-display mb-1.5" style={{ color: 'var(--text)' }}>Find your dream apartment</h1>
            
            {/* Context Filters */}
            <div className="flex gap-3 text-xs font-semibold mb-4" style={{ color: 'var(--text-secondary)' }}>
              <button className="text-primary border-b-2 border-primary pb-0.5">Verified Properties</button>
              <button className="hover:text-slate-800 pb-0.5">Tokenized Assets</button>
            </div>

            {/* Search Input */}
            <div className="relative mb-4 shadow-sm">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-[18px]">search</span>
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by neighborhood, city..." 
                className={`w-full h-9 rounded-lg pl-8 pr-3 outline-none border focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all font-medium text-xs ${isDark ? 'bg-white/5 border-white/10 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800'}`}
              />
            </div>

            {/* Pill Filters */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
              <button 
                onClick={() => setTypeFilter('all')}
                className={`shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all ${typeFilter === 'all' ? 'bg-primary text-white border-primary' : isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                All
              </button>
              <button 
                onClick={() => setTypeFilter('residential')}
                className={`shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all flex items-center gap-0.5 ${typeFilter === 'residential' ? 'bg-slate-900 text-white border-slate-900' : isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="material-symbols-outlined text-[12px]">apartment</span>
                Apartments
              </button>
              <button 
                onClick={() => setTypeFilter('commercial')}
                className={`shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all flex items-center gap-0.5 ${typeFilter === 'commercial' ? 'bg-slate-900 text-white border-slate-900' : isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="material-symbols-outlined text-[12px]">business</span>
                Commercial
              </button>
              <button 
                onClick={() => setTypeFilter('land')}
                className={`shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all flex items-center gap-0.5 ${typeFilter === 'land' ? 'bg-slate-900 text-white border-slate-900' : isDark ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="material-symbols-outlined text-[12px]">landscape</span>
                Land
              </button>
            </div>
         </div>

         <div className="p-4 pt-2 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium text-xs">{filteredProperties.length} results</span>
              <div 
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 cursor-pointer md:hidden"
                onClick={() => setShowMapMobile(!showMapMobile)}
              >
                {showMapMobile ? "Hide map" : "Show on map"}
                <div className={`w-7 h-3.5 rounded-full relative transition-colors ${showMapMobile ? 'bg-primary' : 'bg-slate-300'}`}>
                  <div className={`size-2.5 bg-white rounded-full absolute top-[2px] transition-all ${showMapMobile ? 'right-[2px]' : 'left-[2px]'}`}></div>
                </div>
              </div>
            </div>

            {loading ? (
               <div className="flex flex-col gap-4">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className={`h-auto w-full rounded-[16px] border block animate-pulse overflow-hidden ${isDark ? 'bg-[var(--bg-card)] border-white/5' : 'bg-white border-slate-200'}`}>
                     <div className="h-40 w-full bg-slate-200/60" />
                     <div className="p-3 flex flex-col gap-2">
                        <div className="h-4 w-1/3 bg-slate-200/60 rounded" />
                        <div className="h-3 w-1/2 bg-slate-200/60 rounded" />
                        <div className="h-3 w-full bg-slate-200/60 rounded mt-1" />
                     </div>
                   </div>
                 ))}
               </div>
            ) : error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-50 p-6 text-center shadow-sm">
                  <p className="text-red-500 text-sm font-semibold">{error}</p>
                </div>
            ) : filteredProperties.length === 0 ? (
                <div className={`rounded-[20px] p-8 text-center flex flex-col items-center justify-center animate-fade-up border shadow-sm mt-2 ${isDark ? 'bg-[var(--bg-card)] border-white/5' : 'bg-white border-slate-200'}`}>
                   <div className="size-16 rounded-full bg-blue-50/50 border border-blue-100 flex items-center justify-center mx-auto mb-4 shadow-[inset_0_2px_10px_rgba(17,107,251,0.05)] text-primary">
                     <span className="material-symbols-outlined text-[28px]">travel_explore</span>
                   </div>
                   <h3 className="text-lg font-bold heading-display mb-2" style={{ color: 'var(--text)' }}>No properties found</h3>
                   <p className="text-xs font-medium max-w-xs mx-auto mb-5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>We couldn't find any verified assets matching your criteria. Try adjusting your search.</p>
                   <button 
                     onClick={() => { setQuery(''); setTypeFilter('all'); }} 
                     className="px-5 py-2 bg-slate-900 text-white rounded-lg text-[10px] uppercase tracking-widest font-bold shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                   >
                     <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
                     Clear Filters
                   </button>
                </div>
            ) : (
                <div className="flex flex-col gap-4 pb-16">
                   {filteredProperties.map((p, i) => (
                       <ListingCard 
                           key={p.id}
                           index={i}
                           id={p.id}
                           isDark={isDark}
                           image={p.images && p.images.length > 0 ? p.images[0] : `https://images.unsplash.com/photo-${[
                            '1600596542815-ffad4c1539a9', // mansion
                            '1512917774080-9991f1c4c750', // home interior
                            '1600607687920-4e2a868f0bbb', // modern exterior
                            '1512917774080-9991f1c4c750', // kitchen
                            '1600607687920-4e2a868f0bbb', // modern house
                            '1600596542815-ffad4c1539a9'  // luxury
                          ][i % 6]}?q=80&w=600&auto=format&fit=crop`}
                           type={p.property_type?.replace("_", " ") || "PROPERTY"}
                           status={p.status}
                           name={p.name}
                           location={`${p.city || "San Pedro"}`}
                           yieldRate={p.yield_percent ? `${p.yield_percent}%` : "N/A"}
                           price={p.token_price_usd ? `$${p.token_price_usd.toLocaleString()}` : p.asset_value_inr ? `₹${(p.asset_value_inr / 100000).toFixed(2)} L` : "N/A"}
                           areaSqft={p.area_sqft}
                         />
                   ))}
                </div>
            )}
         </div>
      </div>

      {/* Right Content - Map */}
      <div className={`${showMapMobile ? "block absolute inset-0 z-50 pt-[73px]" : "hidden"} md:block flex-grow h-full bg-blue-50 relative md:z-0 shadow-inner md:pt-0`}>
         {showMapMobile && (
            <button 
              onClick={() => setShowMapMobile(false)} 
              className={`absolute top-[90px] left-4 z-[9999] md:hidden px-4 py-2 rounded-xl shadow-lg font-bold border ${isDark ? 'bg-[var(--bg-card)] text-white border-white/10' : 'bg-white text-slate-900 border-slate-200'}`}
            >
              ← Back to List
            </button>
         )}
         <MapViewer properties={filteredProperties} />
      </div>

    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium h-screen flex items-center justify-center">Loading marketplace...</div>}>
      <ExploreContent />
    </Suspense>
  );
}

function ListingCard({ id, image, type, status, name, location, yieldRate, price, areaSqft, index = 0, isDark = false }: { id: string, image: string, type: string, status: string, name: string, location: string, yieldRate: string, price: string, areaSqft?: number, index?: number, isDark?: boolean }) {
 return (
   <Link href={`/explore/${id}`} className={`group block overflow-hidden rounded-[16px] border transition-all duration-300 hover:-translate-y-0.5 animate-fade-up ${isDark ? 'bg-[var(--bg-card)] border-white/5 hover:border-white/15 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)]' : 'bg-white border-slate-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:border-slate-300'}`} style={{ animationDelay: `${index * 80}ms` }}>
     <div className="relative h-40 w-full overflow-hidden bg-slate-100">
       <img 
         src={image} 
         alt={name} 
         onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=600"; }}
         className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
       />
       <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-80" />
       
       <div className="absolute top-2 left-2 flex gap-1.5">
         {status === 'tokenized' ? (
           <span className="px-2 py-0.5 bg-[#10B981] shadow-sm text-white text-[9px] font-bold uppercase tracking-widest rounded-md">For Sale</span>
         ) : (
           <span className="px-2 py-0.5 bg-primary shadow-sm text-white text-[9px] font-bold uppercase tracking-widest rounded-md">For Rent</span>
         )}
       </div>
       <div className="absolute top-2 right-2">
         <button className="size-6 rounded-full bg-white/50 backdrop-blur border border-white flex items-center justify-center text-slate-800 hover:bg-white transition-colors shadow-sm">
           <span className="material-symbols-outlined text-[14px]">favorite</span>
         </button>
       </div>
     </div>
     
     <div className="p-3 flex flex-col gap-2">
       <div>
          <h3 className="text-sm font-bold leading-tight heading-display mb-0.5 truncate" style={{ color: 'var(--text)' }}>{price}</h3>
          <p className="text-[11px] font-medium flex items-center gap-1 truncate" style={{ color: 'var(--text-secondary)' }}>
            <span className="material-symbols-outlined text-[12px]">location_on</span>
            {location} - {name}
          </p>
       </div>

       <div className={`flex items-center gap-2 text-[11px] font-semibold border-t pt-2 ${isDark ? 'border-white/5 text-slate-400' : 'border-slate-100 text-slate-600'}`}>
         <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">trending_up</span> {yieldRate}</span>
         {areaSqft && (
           <>
             <span className="size-0.5 rounded-full bg-slate-300"></span>
             <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[12px]">square_foot</span> {areaSqft} sqft</span>
           </>
         )}
       </div>
     </div>
   </Link>
 );
}
