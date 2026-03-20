"use client";
import { useState, useEffect } from "react";
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { listMarketplace, type Property, getDocUrl } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const MapViewer = dynamic(() => import("@/components/MapViewer"), { ssr: false });

// Indian-context fallback images (reliable Unsplash)
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop', // glass commercial
  'https://images.unsplash.com/photo-1600607687920-4e2a868f0bbb?q=80&w=800&auto=format&fit=crop', // modern building
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800&auto=format&fit=crop', // luxury exterior
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800&auto=format&fit=crop', // residential modern
];

function getPropertyImage(p: Property, index: number): string {
  if (p.images && p.images.length > 0) return getDocUrl(p.images[0]);
  if (p.image_url) return getDocUrl(p.image_url);
  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
}

function ExploreContent() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    listMarketplace()
      .then(setProperties)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex-grow flex flex-col md:flex-row antialiased w-full relative h-[calc(100vh-73px)] overflow-hidden bg-[#0f1419] text-[#dee3ea]">
      
      {/* Left Sidebar - Listings */}
      <div className="w-full md:w-[450px] lg:w-[500px] h-full overflow-y-auto flex flex-col shrink-0 border-r border-white/5 bg-[#0f1419] custom-scrollbar">
         <div className="p-8 pb-4 sticky top-0 z-10 bg-gradient-to-b from-[#0f1419] to-[#0f1419]/90 backdrop-blur-md">
            <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase mb-2 block">
              Private Collection
            </span>
            <h1 className="text-3xl font-medium heading-display mb-8 text-white">Marketplace</h1>
            
            {/* Pill Filters */}
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              <button className="shrink-0 px-5 py-2.5 rounded-full bg-[#171c21] hover:bg-[#30353b] transition-colors border border-white/5 text-xs font-medium text-[#dee3ea]">
                Location
              </button>
              <button className="shrink-0 px-5 py-2.5 rounded-full bg-[#171c21] hover:bg-[#30353b] transition-colors border border-white/5 text-xs font-medium text-[#dee3ea]">
                Asset Class
              </button>
              <button className="shrink-0 px-5 py-2.5 rounded-full bg-[#171c21] hover:bg-[#30353b] transition-colors border border-white/5 text-xs font-medium text-[#dee3ea]">
                Valuation
              </button>
            </div>
         </div>

         <div className="p-8 pt-4 flex flex-col gap-8 pb-24">
            {loading ? (
               <div className="flex flex-col gap-8">
                 {[1, 2, 3].map((i) => (
                   <div key={i} className="h-[400px] w-full rounded-[1.5rem] bg-[#171c21] animate-pulse"></div>
                 ))}
               </div>
            ) : error ? (
                <div className="rounded-[1.5rem] p-6 text-center border border-red-500/20 bg-red-500/5">
                  <p className="text-red-400 text-sm font-medium">{error}</p>
                </div>
            ) : properties.length === 0 ? (
                <div className="rounded-[1.5rem] p-8 text-center bg-[#171c21] border border-white/5">
                   <h3 className="text-xl font-medium heading-display mb-2 text-white">No properties found</h3>
                   <p className="text-xs font-medium max-w-xs mx-auto text-white/50">There are no assets currently available in the marketplace.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-12">
                   {properties.map((p, i) => (
                       <ListingCard 
                           key={p.id}
                           index={i}
                           id={p.id}
                           image={getPropertyImage(p, i)}
                           type={p.property_type || "Estate"}
                           name={p.name}
                           location={p.city || "India"}
                           yieldRate={p.yield_percent ? `${p.yield_percent}% Yield` : "N/A"}
                           price={p.token_price_usd ? `$${(p.token_price_usd / 1000000).toFixed(1)}M` : "N/A"}
                           areaSqft={p.area_sqft}
                           floors={p.total_floors}
                         />
                   ))}
                </div>
            )}
         </div>
      </div>

      {/* Right Content - Map */}
      <div className="hidden md:block flex-grow h-full relative z-0 bg-[#0a0e14]">
         <MapViewer properties={properties} />
         
         {/* Map Overlay Card */}
         <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-[#171c21]/90 border border-white/5 rounded-2xl p-6 flex items-center gap-12 shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-10 backdrop-blur-xl">
           <div>
             <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1">Active Listings</p>
             <p className="text-2xl font-medium heading-display text-white">{properties.length} Assets</p>
           </div>
           <div className="h-10 w-[1px] bg-white/10"></div>
           <div>
             <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase mb-1">Geographic Coverage</p>
             <p className="text-2xl font-medium heading-display text-white">India</p>
           </div>
         </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(212, 175, 55, 0.15); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(212, 175, 55, 0.3); }
      `}</style>

    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white/50 bg-[#0f1419] font-medium h-screen flex items-center justify-center">Loading marketplace...</div>}>
      <ExploreContent />
    </Suspense>
  );
}

function ListingCard({ id, image, type, name, location, yieldRate, price, areaSqft, floors, index = 0 }: { id: string, image: string, type: string, name: string, location: string, yieldRate: string, price: string, areaSqft?: number, floors?: number, index?: number }) {
 return (
   <Link href={`/explore/${id}`} className="group block bg-[#171c21] rounded-[1.5rem] overflow-hidden transition-all duration-500 hover:bg-[#1a2027] animate-fade-up shadow-[0_10px_30px_rgba(0,0,0,0.2)]" style={{ animationDelay: `${index * 100}ms` }}>
     <div className="relative h-[250px] w-full overflow-hidden bg-[#0a0e14]">
       <img 
         src={image} 
         alt={name} 
         className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] group-hover:scale-105" 
         onError={(e) => {
           const target = e.currentTarget;
           target.src = FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
         }}
       />
       {/* Small verified seal */}
       <div className="absolute top-4 right-4 bg-[#d4af37] text-black px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_4px_12px_rgba(212,175,55,0.4)]">
         <span className="material-symbols-outlined text-[14px]">verified</span>
         <span className="text-[10px] font-bold tracking-widest uppercase">Verified</span>
       </div>
       <div className="absolute bottom-4 left-4 right-4">
         <span className="text-white/80 text-[9px] font-bold tracking-widest uppercase bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full border border-white/10">
           {location}
         </span>
       </div>
     </div>
     
     <div className="p-6">
       <div className="flex justify-between items-start mb-2">
         <span className="text-[#d4af37] text-[10px] font-bold tracking-widest uppercase">
           {type}
         </span>
         <span className="text-2xl font-medium heading-display text-white">{price}</span>
       </div>
       
       <div className="flex justify-between items-end mb-6">
         <h3 className="text-xl font-medium heading-display text-white">{name}</h3>
       </div>

       <div className="flex items-center gap-5 text-white/50 text-xs font-medium">
         {areaSqft && (
           <span className="flex items-center gap-1.5">
             <span className="material-symbols-outlined text-[14px]">home</span>
             {areaSqft.toLocaleString()} sq.ft
           </span>
         )}
         {floors && (
           <span className="flex items-center gap-1.5">
             <span className="material-symbols-outlined text-[14px]">stairs</span>
             {floors} Floors
           </span>
         )}
         <span className="flex items-center gap-1.5 ml-auto text-[#d4af37]">
           <span className="material-symbols-outlined text-[14px]">trending_up</span>
           {yieldRate}
         </span>
       </div>
     </div>
   </Link>
 );
}
