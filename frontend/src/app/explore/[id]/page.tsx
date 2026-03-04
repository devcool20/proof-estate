"use client";
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { getProperty, getDocUrl, type Property } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useWallet } from "@solana/wallet-adapter-react";

export default function PropertyInvestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { publicKey } = useWallet();

  const [investmentAmount, setInvestmentAmount] = useState<string>("1000");
  const [isInvesting, setIsInvesting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    getProperty(id)
      .then(setProperty)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex bg-background-light min-h-screen items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">refresh</span>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="flex bg-background-light min-h-screen items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center text-red-600">
          <span className="material-symbols-outlined text-4xl mb-4">error</span>
          <p className="font-bold">Error loading property</p>
          <p className="text-sm">{error || "Property not found"}</p>
          <Link href="/explore" className="mt-6 inline-block text-primary hover:underline">Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  const tokenPrice = property.token_price_usd || 1;
  const numTokens = Number(investmentAmount) / tokenPrice;
  const supply = property.token_supply || 1;
  const ownershipPercent = ((numTokens / supply) * 100).toFixed(4);
  const annualYield = ((Number(investmentAmount) * (property.yield_percent || 0)) / 100).toFixed(2);

  const handleInvest = async () => {
    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }
    setIsInvesting(true);
    // Simulate smart contract interaction
    setTimeout(() => {
      setIsInvesting(false);
      setShowSuccessModal(true);
    }, 2500);
  };

  return (
    <div className="bg-background-light text-slate-900 font-sans min-h-screen">
      {/* Hero Header with Image */}
      <div className="relative h-80 w-full bg-slate-800 flex items-center justify-center overflow-hidden">
         <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url('${getDocUrl(property.document_url)}')` }}></div>
         <div className="absolute inset-0 bg-gradient-to-t from-background-light to-transparent"></div>
         <div className="relative z-10 w-full max-w-[1280px] px-4 sm:px-8 lg:px-40 mx-auto flex items-end h-full pb-10">
            <div className="flex flex-col md:flex-row justify-between w-full md:items-end gap-6">
                <div>
                    <div className="flex gap-2 mb-3">
                        <span className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-full">{property.property_type?.toUpperCase() || "REAL ESTATE"}</span>
                        <span className="px-3 py-1 bg-emerald-500/80 backdrop-blur-md text-white text-xs font-bold rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">verified_user</span> ON-CHAIN VERIFIED
                        </span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-white leading-tight">{property.name}</h1>
                    <p className="text-white/80 flex items-center gap-2 mt-2 font-medium">
                        <span className="material-symbols-outlined">location_on</span>
                        {property.address}, {property.city || ""} {property.country || ""}
                    </p>
                </div>
            </div>
         </div>
      </div>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-8 lg:px-40 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Left Column: Details */}
            <div className="lg:col-span-2 space-y-10">
                {/* Highlights */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Target Yield</p>
                        <p className="text-2xl font-bold text-emerald-600">{property.yield_percent}%</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Token Price</p>
                        <p className="text-2xl font-bold text-slate-900">${property.token_price_usd?.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Total Supply</p>
                        <p className="text-2xl font-bold text-slate-900">{property.token_supply?.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-1">Distributes</p>
                        <p className="text-2xl font-bold text-slate-900 capitalize">{property.dist_frequency || "Monthly"}</p>
                    </div>
                </div>

                {/* About */}
                <div>
                    <h2 className="text-xl font-bold mb-4">About the Asset</h2>
                    <p className="text-slate-600 leading-relaxed bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        {property.name} is a verified, institutional-grade commercial property. 
                        It has been thoroughly authenticated by a trusted government entity or licensed authority before being fractionalized on the Solana network via the ProofEstate platform. 
                        Tokens represent a legal economic interest in the property's rental revenue and potential capital appreciation.
                    </p>
                </div>

                {/* Blockchain Verifications */}
                <div>
                    <h2 className="text-xl font-bold mb-4">On-Chain Transparency</h2>
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm truncate font-mono text-sm leading-8 py-5">
                       <div className="px-6 flex flex-col md:flex-row border-b border-slate-100 pb-4 mb-4 gap-2">
                          <span className="w-40 text-slate-500">Asset Hash</span>
                          <span className="text-slate-800 text-xs break-all">{property.metadata_hash || "Not available"}</span>
                       </div>
                       <div className="px-6 flex flex-col md:flex-row gap-2">
                          <span className="w-40 text-slate-500">Token Mint</span>
                          <span className="text-teal-600 font-bold bg-teal-50 px-2 rounded-md">{property.token_mint || "Not tokenized yet"}</span>
                       </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Investment Box */}
            <div className="lg:col-span-1">
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-100 sticky top-10">
                    <h3 className="text-2xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
                       <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
                       Invest
                    </h3>

                    {!user || user.role !== "investor" ? (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                            <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">lock</span>
                            <p className="text-sm text-slate-600 font-medium">Please connect your wallet and register as an Investor to purchase asset tokens.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <label className="block">
                                <span className="block text-sm font-bold text-slate-700 mb-2">Investment Amount (USDC)</span>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                    <input 
                                        type="number" 
                                        value={investmentAmount} 
                                        onChange={e => setInvestmentAmount(e.target.value)} 
                                        min="1" 
                                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold text-lg rounded-xl h-14 pl-8 pr-4 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                    />
                                </div>
                            </label>

                            <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-3 border border-slate-100">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium text-xs uppercase">Tokens Received</span>
                                    <span className="font-bold text-slate-900 text-base">{isNaN(numTokens) ? 0 : numTokens.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-medium text-xs uppercase">Est. Annual Yield</span>
                                    <span className="font-bold text-emerald-600 text-base">+${isNaN(Number(annualYield)) ? 0 : annualYield}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-3">
                                    <span className="text-slate-500 font-medium text-xs uppercase">Total Supply Ownership</span>
                                    <span className="font-bold text-slate-900 text-base">{isNaN(Number(ownershipPercent)) ? 0 : ownershipPercent}%</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleInvest}
                                disabled={isInvesting || !property.token_mint}
                                className={`w-full h-14 rounded-xl font-bold flex items-center justify-center gap-2 text-white transition-all shadow-md ${isInvesting || !property.token_mint ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-primary hover:bg-slate-800 hover:shadow-lg'}`}
                            >
                                {isInvesting ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">refresh</span>
                                        Confirming Tx...
                                    </>
                                ) : !property.token_mint ? (
                                    <>Awaiting Tokenization</>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">payments</span>
                                        Purchase Tokens
                                    </>
                                )}
                            </button>
                            <p className="text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-1">
                               <span className="material-symbols-outlined text-[14px]">shield</span> Protected by Solana Smart Contracts
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 text-center border border-slate-100 scale-100 transform transition-all duration-300">
             <div className="size-24 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6 ring-8 ring-emerald-50">
                <span className="material-symbols-outlined text-5xl text-emerald-500">check_circle</span>
             </div>
             <h3 className="text-2xl font-extrabold text-slate-900 mb-2">Purchase Successful!</h3>
             <p className="text-slate-500 font-medium mb-6">
                 You successfully invested <strong>${Number(investmentAmount).toLocaleString()}</strong> in {property.name}. Tokens have been moved to your wallet.
             </p>
             <button
               onClick={() => setShowSuccessModal(false)}
               className="w-full h-12 bg-slate-900 hover:bg-primary text-white font-bold rounded-xl transition-all"
             >
                View Profile/Portfolio
             </button>
          </div>
        </div>
      )}

    </div>
  );
}
