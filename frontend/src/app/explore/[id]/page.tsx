"use client";
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { getProperty, type Property, getDocUrl } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletProviders } from "@/components/WalletProviders";

function PropertyInvestPageContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { publicKey } = useWallet();

  const [investmentAmount, setInvestmentAmount] = useState<string>("1000");
  const [isInvesting, setIsInvesting] = useState(false);
  const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);

  useEffect(() => {
    getProperty(id)
      .then(setProperty)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen bg-[#0f1419] text-white">
        <span className="material-symbols-outlined font-light animate-spin text-4xl text-[#d4af37]">autorenew</span>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen bg-[#0f1419] p-6 text-white">
        <div className="bg-[#171c21] p-12 rounded-[2rem] border border-white/5 text-center space-y-4 max-w-md w-full shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
          <span className="material-symbols-outlined font-light text-[#d4af37] text-6xl">error</span>
          <h1 className="text-2xl font-medium heading-display">Asset not found</h1>
          <p className="text-white/50 text-sm">{error || "This asset does not exist in the curated registry."}</p>
          <Link href="/explore" className="inline-block mt-4 text-[#d4af37] font-bold text-[10px] uppercase tracking-widest border-b border-[#d4af37]/30 hover:border-[#d4af37] pb-1 transition-all">Return to Gallery</Link>
        </div>
      </div>
    );
  }

  const handleAcquireClick = () => {
    if (!publicKey) {
      alert("Please connect your wallet to access the private registry.");
      return;
    }
    // Instead of directly investing, we show the "Confirmation of Acquisition" screen/modal as per design
    setShowAcquisitionModal(true);
  };

  const handleAuthorizeTransaction = async () => {
    setIsInvesting(true);
    setTimeout(() => {
      setIsInvesting(false);
      setShowAcquisitionModal(false);
      alert("Transaction Authorized Successfully.");
    }, 2500);
  };

  const tokenPrice = property.token_price_usd || 12450;
  const supply = property.token_supply || 1000;
  
  // Fake some community stats for the visual
  const communityOwned = 65;
  const remaining = 35;

  return (
    <div className="flex-grow flex flex-col antialiased bg-[#0f1419] text-[#dee3ea] min-h-screen">
      
      {/* Cinematic Hero */}
      <section className="relative w-full h-[70vh] min-h-[500px] flex flex-col justify-end pb-16 px-6 md:px-12 lg:px-24">
        <div className="absolute inset-0 bg-black">
           <img 
             src={property.images && property.images[0] ? getDocUrl(property.images[0]) : (property.image_url ? getDocUrl(property.image_url) : "https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=2000&auto=format&fit=crop")} 
             alt={property.name}
             className="w-full h-full object-cover opacity-60 mix-blend-luminosity" 
           />
           <div className="absolute inset-0 bg-gradient-to-t from-[#0f1419] via-[#0f1419]/50 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-5xl">
          <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">
            Reserve Collection
          </span>
          <h1 className="text-5xl md:text-7xl font-medium heading-display text-white mb-6 tracking-tight leading-tight">
            {property.name}
          </h1>
          <p className="text-white/70 text-base max-w-2xl leading-relaxed">
            {property.description || "Institutional-grade commercial real estate, completely verified and fractionalized via Solana. A testament to deep market liquidity and uncompromised title security."}
          </p>
        </div>
      </section>

      {/* Details & Acquisition */}
      <section className="py-16 px-6 md:px-12 lg:px-24 max-w-[1400px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
         
         {/* Left: Architectural Heritage */}
         <div className="lg:col-span-7 flex flex-col gap-10">
           <div>
             <h2 className="text-3xl font-medium heading-display text-white mb-6">Asset Narrative & Cryptographic Security</h2>
             <div className="space-y-6 text-white/60 text-sm leading-relaxed max-w-2xl">
               <p>
                 {property.description ? property.description : "This prime Grade-A commercial asset represents a unique opportunity to access high-yield Indian structural real estate. Positioned in the heart of the financial district, it benefits from robust tenant covenants and historically strong capital appreciation."}
               </p>
               <div className="bg-[#d4af37]/5 border border-[#d4af37]/20 p-6 rounded-xl mt-4">
                 <h4 className="text-[#d4af37] font-bold tracking-widest uppercase text-[10px] mb-2">Why Verification Matters</h4>
                 <p className="text-white/70 text-xs leading-relaxed">
                   India has over 4.9 million hectares of land under active dispute. Every asset on ProofEstate undergoes rigorous automated title verification directly resolving with government registries (like Karnataka Bhoomi) and NeSL/CERSAI charge searches. We ensure institutional-grade title security giving you absolute peace of mind.
                 </p>
               </div>
               <p>
                 Through the power of the Solana blockchain and the SEBI SM-REIT framework, this asset is tokenized into secure fractional shares. Tokenization ensures sub-cent transaction costs, absolute immutable proof of ownership, and unlocks a liquid secondary marketplace previously unavailable in commercial real estate.
               </p>
             </div>
           </div>

           <div className="grid grid-cols-3 gap-8 pt-8 border-t border-white/5">
             <div>
               <p className="text-[#d4af37] text-[9px] font-bold uppercase tracking-widest mb-2">Built Year</p>
               <p className="text-xl font-medium heading-display text-white">1974</p>
             </div>
             <div>
               <p className="text-[#d4af37] text-[9px] font-bold uppercase tracking-widest mb-2">Architect</p>
               <p className="text-xl font-medium heading-display text-white truncate text-ellipsis w-48">Alessandro Vico</p>
             </div>
             <div>
               <p className="text-[#d4af37] text-[9px] font-bold uppercase tracking-widest mb-2">Total Area</p>
               <p className="text-xl font-medium heading-display text-white">{property.area_sqft ? `${property.area_sqft.toLocaleString()} sq.ft` : "12,400 sq.ft"}</p>
             </div>
           </div>
         </div>

         {/* Right: Fractional Shares Box */}
         <div className="lg:col-span-5 relative z-10 -mt-32">
            <div className="bg-[#171c21] rounded-[2rem] p-10 border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
               <div className="flex justify-between items-start mb-8">
                 <div>
                   <p className="text-[#d4af37] text-[9px] font-bold tracking-widest uppercase mb-2">Current Availability</p>
                   <h3 className="text-2xl font-medium heading-display text-white">Fractional Shares</h3>
                 </div>
                 <div className="size-8 rounded-full bg-[#f2ca50] flex items-center justify-center text-black">
                   <span className="material-symbols-outlined text-[16px]">verified</span>
                 </div>
               </div>

               {/* Progress Bar */}
               <div className="w-full h-2 bg-white/5 rounded-full mb-8 overflow-hidden flex">
                 <div className="h-full bg-[#f2ca50]" style={{ width: `${communityOwned}%` }}></div>
                 <div className="h-full bg-transparent" style={{ width: `${remaining}%` }}></div>
               </div>

               <div className="space-y-6 mb-10">
                 <div className="flex justify-between items-center border-b border-white/5 pb-4">
                   <span className="text-white/60 text-sm">Owned by Community</span>
                   <span className="text-white text-lg">{communityOwned}%</span>
                 </div>
                 <div className="flex justify-between items-center border-b border-white/5 pb-4">
                   <span className="text-white/60 text-sm">Remaining for Minting</span>
                   <span className="text-[#d4af37] text-lg">{remaining}%</span>
                 </div>
                 <div className="flex justify-between items-center pt-2">
                   <span className="text-white/60 text-sm">Share Value</span>
                   <div className="text-right">
                     <span className="text-2xl font-medium heading-display text-white">${tokenPrice.toLocaleString()}</span>
                     <span className="text-[10px] text-white/40 font-bold ml-2 tracking-widest uppercase">/ 0.1%</span>
                   </div>
                 </div>
               </div>

               <button 
                 onClick={handleAcquireClick}
                 className="w-full btn-primary py-4 text-[10px] font-bold tracking-[0.2em] uppercase mb-6 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
               >
                 Acquire Ownership <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
               </button>

               <p className="text-center text-[8px] font-bold tracking-[0.2em] uppercase text-white/30">
                 Secured by ProofEstate Smart Vaults
               </p>
            </div>
         </div>
      </section>

      {/* Curated Perspective (Image Grid) */}
      <section className="py-16 px-6 md:px-12 lg:px-24 mx-auto max-w-[1400px] w-full border-t border-white/5">
        <div className="mb-12">
          <h2 className="text-3xl font-medium heading-display text-white italic mb-3">Curated Perspective</h2>
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/50">The soul of the reserve is found in its details.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           {/* Tall image - Indian commercial tower */}
           <div className="md:row-span-2 rounded-[2rem] overflow-hidden aspect-[3/4] md:aspect-auto md:h-full border border-white/5">
             <img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover grayscale-[10%] hover:grayscale-0 transition-all duration-700 hover:scale-105" alt="Commercial Tower" />
           </div>
           
           {/* Wide top right - modern Indian building */}
           <div className="rounded-[2rem] overflow-hidden aspect-video md:aspect-[16/9] border border-white/5">
             <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover grayscale-[10%] hover:grayscale-0 transition-all duration-700 hover:scale-105" alt="Modern Building" />
           </div>

           {/* Two small bottom right */}
           <div className="grid grid-cols-2 gap-4">
             <div className="rounded-[2rem] overflow-hidden aspect-[4/5] border border-white/5">
               <img src="https://images.unsplash.com/photo-1600607687920-4e2a868f0bbb?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover grayscale-[10%] hover:grayscale-0 transition-all duration-700 hover:scale-105" alt="Glass Office" />
             </div>
             <div className="rounded-[2rem] overflow-hidden aspect-[4/5] border border-white/5">
               <img src="https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover grayscale-[10%] hover:grayscale-0 transition-all duration-700 hover:scale-105" alt="Mumbai Skyline" />
             </div>
           </div>
        </div>
       </section>
      {/* Vision & Verification Protocol */}
      <section className="py-24 px-6 md:px-12 lg:px-24 mx-auto max-w-[1400px] w-full bg-[#0a0e14]/50 border-t border-white/5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
           <div>
             <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">The Protocol</span>
             <h2 className="text-4xl font-medium heading-display text-white mb-6">How ProofEstate<br/>Secures Your Assets</h2>
             <p className="text-white/60 text-sm leading-relaxed mb-8">
               Our fractionalization model is built on institutional-grade security. Every asset on ProofEstate is a real-world legal entity, tokenized via SEBI-compliant structures on the Solana blockchain.
             </p>
             
             <div className="space-y-6">
                <div className="flex gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 hover:border-[#d4af37]/20 transition-all">
                  <span className="material-symbols-outlined text-[#d4af37] text-[20px]">verified</span>
                  <div>
                    <h4 className="text-white text-sm font-medium mb-1">Government Registry Sync</h4>
                    <p className="text-white/40 text-[11px]">Direct integration with state registries ensures title clarity and zero ongoing litigation before listing.</p>
                  </div>
                </div>
                <div className="flex gap-4 p-4 rounded-2xl border border-white/5 bg-white/5 hover:border-[#d4af37]/20 transition-all">
                  <span className="material-symbols-outlined text-[#d4af37] text-[20px]">token</span>
                  <div>
                    <h4 className="text-white text-sm font-medium mb-1">Solana Tokenization</h4>
                    <p className="text-white/40 text-[11px]">SPL-Token22 standards allow on-chain royalties, automated yield distribution, and instant secondary liquidity.</p>
                  </div>
                </div>
             </div>
           </div>

           <div className="relative aspect-square md:aspect-video rounded-[3rem] overflow-hidden border border-white/10 group">
              <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1200&auto=format&fit=crop" className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110 opacity-60" alt="Process background" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1419] to-transparent"></div>
              
              <div className="absolute inset-0 flex flex-col justify-center items-center text-center p-12">
                 <div className="size-16 rounded-full bg-[#d4af37] flex items-center justify-center text-black mb-6 shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                    <span className="material-symbols-outlined text-[32px]">shield_person</span>
                 </div>
                 <h3 className="text-2xl font-medium heading-display text-white mb-4">The Vision of Liquidity</h3>
                 <p className="text-white/70 text-xs max-w-sm leading-relaxed mb-8">
                   We are transforming real estate from a stagnant multi-generational asset into a dynamic, liquid digital instrument accessible starting at ₹10 Lakhs.
                 </p>
                 <button className="px-6 py-2.5 bg-white/10 border border-white/20 rounded-full text-[9px] font-bold uppercase tracking-widest text-white hover:bg-white/20 transition-all">
                   View Whitepaper
                 </button>
              </div>
           </div>
        </div>
      </section>

      {/* Confirmation of Acquisition Modal */}
      {showAcquisitionModal && (
        <div className="fixed inset-0 z-[999] bg-[#0f1419]/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
           <div className="bg-[#171c21] border border-white/5 rounded-[2rem] max-w-5xl w-full flex flex-col md:flex-row overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative">
             <button onClick={() => setShowAcquisitionModal(false)} className="absolute top-6 right-6 z-20 text-white/50 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase">
               <span className="material-symbols-outlined text-[18px]">close</span> Cancel
             </button>
             
             {/* Left Dark Image Side */}
             <div className="w-full md:w-1/2 relative min-h-[300px] md:min-h-[600px] flex items-end p-12 bg-black">
                <img src={property.images && property.images.length > 0 ? getDocUrl(property.images[0]) : (property.image_url ? getDocUrl(property.image_url) : "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop")} alt={property.name} className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#171c21]"></div>
                
                <div className="relative z-10 w-full">
                  <div className="inline-block px-4 py-1.5 border border-[#d4af37]/30 rounded-full text-[#d4af37] text-[9px] font-bold tracking-[0.2em] uppercase mb-6">
                    Asset Ref: PE-90210
                  </div>
                  <h2 className="text-4xl md:text-5xl font-medium heading-display text-white mb-6 leading-tight">{property.name}</h2>
                  <div className="flex items-center gap-3 text-white/60 text-sm">
                    <span className="material-symbols-outlined text-[#d4af37] text-[18px]">location_on</span>
                    {property.address || "Bordeaux Highlands, Private Sector 4"}
                  </div>
                </div>

                {/* Secure Protocol Badge */}
                <div className="absolute top-6 left-6 px-4 py-2 bg-black/40 border border-white/10 rounded-full flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-white/50 backdrop-blur-md">
                   <span className="size-2 rounded-full bg-[#f2ca50] animate-pulse"></span>
                   Secure Protocol Active
                </div>
             </div>

             {/* Right Form Side */}
             <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
                <h3 className="text-3xl font-medium heading-display text-white mb-2">Confirmation of Acquisition</h3>
                <p className="text-white/50 text-sm mb-12">Complete the legal binding for your digital property rights.</p>
                
                <div className="space-y-6 flex-grow">
                   {/* Investment Amount Input */}
                   <div>
                     <p className="text-[#d4af37] text-[10px] font-bold tracking-widest uppercase mb-4">Investment Amount</p>
                     <div className="relative bg-[#0f1419] border border-white/5 rounded-2xl flex items-center p-4">
                       <input 
                         type="number" 
                         value={investmentAmount} 
                         onChange={(e) => setInvestmentAmount(e.target.value)}
                         className="bg-transparent text-white text-4xl font-light outline-none w-full"
                         placeholder="0.00"
                       />
                       <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl text-white font-bold text-xs shrink-0">
                         <span className="size-2 rounded-full bg-[#f2ca50]"></span> USDC
                       </div>
                     </div>
                     <p className="text-white/30 text-[10px] flex items-center gap-1.5 mt-3">
                       <span className="material-symbols-outlined text-[14px]">info</span>
                       Approx. Equivalent: ${(Number(investmentAmount)).toLocaleString()} USD
                     </p>
                   </div>

                   {/* Fees Box */}
                   <div className="bg-[#0f1419]/50 border border-white/5 rounded-2xl p-6 flex justify-between items-center group hover:bg-[#0f1419] transition-colors">
                      <div>
                        <p className="text-white/40 text-[9px] font-bold tracking-widest uppercase mb-1">Service Fee</p>
                        <p className="text-white/80 text-sm">Platform Management (0.15%)</p>
                      </div>
                      <p className="text-[#f2ca50] font-medium">{(Number(investmentAmount) * 0.0015).toFixed(2)} USDC</p>
                   </div>

                   {/* Tax Box */}
                   <div className="bg-[#0f1419]/50 border border-white/5 rounded-2xl p-6 flex justify-between items-center group hover:bg-[#0f1419] transition-colors">
                      <div>
                        <p className="text-white/40 text-[9px] font-bold tracking-widest uppercase mb-1">Tax & Legal</p>
                        <p className="text-white/80 text-sm">Smart Contract Verification</p>
                      </div>
                      <p className="text-[#f2ca50] font-medium">0.00 USDC</p>
                   </div>
                </div>

                {/* Total */}
                <div className="mt-8 border-t border-white/5 pt-8 mb-8 flex items-end justify-between">
                   <div>
                     <p className="text-white/60 text-sm mb-1">Total Acquisition Cost</p>
                     <p className="text-[9px] font-bold tracking-widest uppercase text-white/30">All Fees Inclusive</p>
                   </div>
                   <div className="text-right">
                     <p className="text-4xl heading-display text-white mb-2">{(Number(investmentAmount) * 1.0015).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                     <p className="text-[#d4af37] text-[9px] font-bold tracking-widest uppercase">Verified Assets</p>
                   </div>
                </div>

                <button 
                  onClick={handleAuthorizeTransaction}
                  disabled={isInvesting || Number(investmentAmount) <= 0}
                  className="w-full btn-primary py-4 text-xs font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale transition-all hover:scale-[1.02]"
                >
                  {isInvesting ? (
                    <><span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span> Processing</>
                  ) : (
                    <><span className="material-symbols-outlined text-[16px]">verified_user</span> Authorize Transaction</>
                  )}
                </button>

                <div className="flex justify-center gap-6 mt-6">
                  <span className="text-white/30 text-[9px] font-bold tracking-[0.2em] uppercase flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">lock</span> SSL 256-BIT</span>
                  <span className="text-white/30 text-[9px] font-bold tracking-[0.2em] uppercase flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">security</span> WEB3 SECURED</span>
                </div>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}

export default function PropertyInvestPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <WalletProviders>
      <PropertyInvestPageContent params={params} />
    </WalletProviders>
  );
}
