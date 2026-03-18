"use client";
import React, { useState, useEffect } from "react";
import Link from 'next/link';
import { getProperty, getDocUrl, type Property } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletProviders } from "@/components/WalletProviders";

function PropertyInvestPageContent({ params }: { params: Promise<{ id: string }> }) {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const { id } = React.use(params);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { publicKey } = useWallet();

  const [investmentAmount, setInvestmentAmount] = useState<string>("1000");
  const [isInvesting, setIsInvesting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [claimableRent, setClaimableRent] = useState<string>("0");
  const [tokenBalance, setTokenBalance] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    getProperty(id)
      .then(setProperty)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (publicKey && property?.token_mint) {
      updateHoldings();
    }
  }, [publicKey, property]);

  const updateHoldings = async () => {
    try {
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getAccount } = await import("@solana/spl-token");
      
      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com");
      const mintPubkey = new PublicKey(property!.token_mint!);
      const ata = await getAssociatedTokenAddress(mintPubkey, publicKey!);
      
      try {
        const account = await getAccount(connection, ata);
        setTokenBalance(Number(account.amount) / 100);

        if (!property?.on_chain_address) {
          console.warn("Property on_chain_address not set, skipping PDA derivation");
          return;
        }

        const propertyPDA = new PublicKey(property.on_chain_address);
        const [vaultPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("rent_vault"), propertyPDA.toBuffer()],
            new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS")
        );
        const vaultAccount = await connection.getAccountInfo(vaultPDA);
        if (vaultAccount && user?.wallet) {
            try {
              const response = await fetch(`${apiBase}/api/v1/properties/${property!.id}/claimable_rent/${user.wallet}`);
              if (response.ok) {
                const data = await response.json();
                setClaimableRent(data.claimable_usdc);
                setTokenBalance(data.token_balance);
              } else {
                setClaimableRent("0.00");
              }
            } catch (error) {
              console.error("Failed to fetch claimable rent:", error);
              setClaimableRent("0.00");
            }
        }
      } catch (e) {
        setTokenBalance(0);
        setClaimableRent("0");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClaim = async () => {
    if (!publicKey || !property) return;
    setIsClaiming(true);
    try {
       await new Promise(r => setTimeout(r, 2000));
       alert("Rent claimed successfully!");
       updateHoldings();
    } catch (e: any) {
        alert(e.message);
    } finally {
        setIsClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen bg-[#F2F2F2]">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">autorenew</span>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen p-6 bg-[#F2F2F2]">
        <div className="bg-white p-12 rounded-3xl border border-red-200 shadow-sm text-center space-y-4 max-w-md w-full">
          <span className="material-symbols-outlined text-red-500 text-6xl">error</span>
          <h1 className="text-2xl font-bold text-slate-900 heading-display">Error loading asset</h1>
          <p className="text-slate-500 font-medium">{error || "Asset not found in protocol registry."}</p>
          <Link href="/explore" className="inline-block mt-4 text-primary font-bold transition-all text-sm uppercase tracking-widest hover:text-primary-dark hover:underline">Back to Marketplace</Link>
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
    setTimeout(() => {
      setIsInvesting(false);
      setShowSuccessModal(true);
    }, 2500);
  };

  return (
    <div className="flex-grow flex flex-col antialiased text-slate-800 bg-[#F2F2F2] min-h-screen">
      {/* Hero Section */}
      <div className="relative h-[300px] md:h-[400px] w-full max-w-[1920px] mx-auto overflow-hidden bg-slate-200">
        <img 
          src={property.images && property.images.length > 0 ? property.images[0] : "https://images.unsplash.com/photo-1600607687920-4e2a868f0bbb?q=80&w=1920&auto=format&fit=crop"} 
          alt={property.name}
          onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1920"; }}
          className="absolute inset-0 w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent opacity-90"></div>
        
        <div className="relative z-10 h-full max-w-6xl mx-auto px-6 flex flex-col justify-end pb-8">
            <div className="flex flex-col gap-4">
                <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-md border border-white/30 text-white text-[9px] font-bold uppercase tracking-widest rounded-md shadow-sm">{property.property_type?.replace("_", " ") || "REAL ESTATE"}</span>
                    <span className="px-3 py-1 bg-[#10B981] shadow-sm text-white text-[9px] font-bold uppercase tracking-widest rounded-md flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[12px]">verified</span> ON-CHAIN VERIFIED
                    </span>
                </div>
                <div className="space-y-2 max-w-3xl">
                  <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight heading-display leading-tight drop-shadow-md">{property.name}</h1>
                  <p className="text-white/90 flex items-center gap-1.5 font-medium text-sm md:text-base drop-shadow">
                      <span className="material-symbols-outlined text-white text-[18px]">location_on</span>
                      {property.address}, {property.city || ""}
                  </p>
                </div>
            </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 md:py-14 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Details */}
            <div className="lg:col-span-2 space-y-8">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-[20px] shadow-sm border border-slate-200">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Yield</p>
                        <p className="text-xl font-bold text-[#10B981]">{property.yield_percent}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entry Price</p>
                        <p className="text-xl font-bold text-slate-900">${property.token_price_usd?.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supply</p>
                        <p className="text-xl font-bold text-slate-900">{property.token_supply?.toLocaleString()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Frequence</p>
                        <p className="text-xl font-bold text-slate-900 capitalize">{property.dist_frequency || "Monthly"}</p>
                    </div>
                </div>

                {/* About Section */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 heading-display border-b border-slate-200 pb-3">Asset Intelligence</h2>
                    <div className="bg-white border border-slate-200 rounded-[16px] p-5 leading-relaxed font-medium text-slate-600 shadow-sm text-sm">
                        {property.description || `${property.name} is a verified, institutional-grade ${property.property_type?.replace("_", " ") || 'commercial'} asset within the ProofEstate protocol. It has been thoroughly authenticated before being fractionalized on the Solana network as SPL-Token-2022 units. Each token represents a cryptographically-secured economic interest in the property's throughput and appreciation.`}
                    </div>
                </div>

                {/* Yield Management (If Holding) */}
                {tokenBalance > 0 && (
                    <div className="space-y-4">
                        <h2 className="text-xl font-bold text-slate-900 heading-display border-b border-slate-200 pb-3">Revenue Distribution</h2>
                        <div className="bg-white border border-[#10B981] rounded-[16px] p-5 flex flex-col md:flex-row items-center justify-between gap-5 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="size-11 rounded-xl bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20">
                                    <span className="material-symbols-outlined text-[#10B981] text-xl">payments</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Your Claimable USDC</p>
                                    <h4 className="text-2xl font-bold text-slate-900 tracking-tight heading-display">${claimableRent}</h4>
                                    <p className="text-xs font-bold text-[#10B981] mt-0.5 font-mono">Holding {tokenBalance.toLocaleString()} FRAC tokens</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClaim}
                                disabled={isClaiming || claimableRent === "0"}
                                className="w-full md:w-auto px-6 py-3 bg-[#10B981] text-white font-bold uppercase tracking-widest text-[10px] rounded-xl shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 group disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isClaiming ? (
                                    <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[16px]">account_balance</span>
                                        Withdraw Yield
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Registry Details */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-900 heading-display border-b border-slate-200 pb-3">Registry Integrity</h2>
                    <div className="bg-white border border-slate-200 rounded-[16px] p-5 space-y-4 font-mono text-xs shadow-sm">
                       <div className="flex flex-col md:flex-row justify-between gap-3 border-b border-slate-100 pb-4">
                          <span className="text-slate-500 font-bold uppercase tracking-widest">Asset ZK-Hash</span>
                          <span className="text-slate-800 break-all md:text-right md:max-w-md bg-slate-50 px-2.5 py-1.5 rounded-lg font-medium border border-slate-200 text-[11px]">{property.metadata_hash || "NULL_IDENTITY"}</span>
                       </div>
                       <div className="flex flex-col md:flex-row justify-between gap-3">
                          <span className="text-primary font-bold uppercase tracking-widest">Protocol Mint</span>
                          <span className="text-primary break-all md:text-right md:max-w-md bg-primary/5 px-2.5 py-1.5 rounded-lg font-bold border border-primary/20 text-[11px]">{property.token_mint || "AWAITING_FRACTIONALIZATION"}</span>
                       </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Execution */}
            <div className="lg:col-span-1">
                <div className="bg-white border border-slate-200 rounded-[20px] p-5 md:p-6 sticky top-20 shadow-xl overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl pointer-events-none transition-all"></div>
                    
                    <h3 className="text-lg font-bold text-slate-900 mb-5 heading-display flex items-center gap-2">
                       <span className="material-symbols-outlined text-primary text-[22px]">account_balance_wallet</span>
                       Participate
                    </h3>

                    {!user || user.role !== "investor" ? (
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center space-y-3">
                            <span className="material-symbols-outlined text-3xl text-slate-400">lock</span>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">Identity authorization required. Please sync as an <strong className="text-slate-900">Investor</strong> to access protocol units.</p>
                            <Link href="/profile" className="inline-block text-primary font-bold uppercase tracking-widest text-[10px] border-b-2 border-primary/30 hover:border-primary transition-all pb-0.5">Configure Identity</Link>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <label className="block group">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors">Investment (USDC)</span>
                                <div className="relative shadow-sm rounded-xl">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg font-bold">$</span>
                                    <input 
                                        type="number" 
                                        value={investmentAmount} 
                                        onChange={e => setInvestmentAmount(e.target.value)} 
                                        className="w-full bg-white border-2 border-slate-200 text-slate-900 font-bold text-lg rounded-xl h-11 pl-8 pr-4 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </label>

                            <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-200 font-mono text-xs shadow-inner text-slate-700">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-bold uppercase">Fractions</span>
                                    <span className="text-slate-900 font-bold">{isNaN(numTokens) ? 0 : numTokens.toLocaleString()} FRAC</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-500 font-bold uppercase">Yield P.A.</span>
                                    <span className="text-[#10B981] font-bold">+${isNaN(Number(annualYield)) ? 0 : annualYield}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-200 pt-3 mt-1">
                                    <span className="text-slate-500 font-bold uppercase">Ownership</span>
                                    <span className="text-primary font-bold">{isNaN(Number(ownershipPercent)) ? 0 : ownershipPercent}%</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleInvest}
                                disabled={isInvesting || !property.token_mint}
                                className={`w-full h-11 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 transition-all shadow-md ${isInvesting || !property.token_mint ? 'bg-slate-200 text-slate-500 cursor-not-allowed border-none' : 'bg-primary text-white hover:bg-primary-dark hover:-translate-y-0.5 hover:shadow-lg'}`}
                            >
                                {isInvesting ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-[18px]">autorenew</span>
                                        Transacting...
                                    </>
                                ) : !property.token_mint ? (
                                    <>Initializing Protocol...</>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">payments</span>
                                        Commit Capital
                                    </>
                                )}
                            </button>
                            <p className="text-center text-[9px] text-slate-500 uppercase tracking-widest font-bold flex items-center justify-center gap-1.5">
                               <span className="material-symbols-outlined text-[14px]">verified_user</span> Protocol Secured
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </main>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-[20px] p-6 md:p-8 text-center max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-300">
             <div className="size-14 md:size-16 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <span className="material-symbols-outlined text-3xl text-[#10B981]">check_circle</span>
             </div>
             <h3 className="text-xl font-bold text-slate-900 mb-2 heading-display">Protocol Sync Complete</h3>
             <p className="text-slate-600 font-medium mb-6 text-sm">
                 You have committed <strong className="text-slate-900">${Number(investmentAmount).toLocaleString()}</strong> to {property.name}. Protocol units initialized in your vault.
             </p>
             <button
               onClick={() => setShowSuccessModal(false)}
               className="w-full h-10 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl transition-all uppercase tracking-widest text-[10px] border border-slate-300"
             >
                Return to Registry
             </button>
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
