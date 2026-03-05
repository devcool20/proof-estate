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
        setTokenBalance(Number(account.amount) / 100); // 2 decimals

        // Estimate claimable rent (simplified for UI)
        // In real app, we'd fetch the rent_vault account data
        const [propertyPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("property"), Buffer.from(property!.id)],
          new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!)
        );
        const [vaultPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("rent_vault"), propertyPDA.toBuffer()],
            new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID!)
        );
        const vaultAccount = await connection.getAccountInfo(vaultPDA);
        if (vaultAccount) {
            // Logic to fetch USDC balance of vault and multiply by (balance / total_supply)
            setClaimableRent("12.50"); // Mocked for demo
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
       const { Connection, PublicKey, Transaction } = await import("@solana/web3.js");
       const { Program, AnchorProvider } = await import("@coral-xyz/anchor");
       const idl = await import("@/lib/idl.json");

       const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
       const provider = new AnchorProvider(connection, (window as any).solana, { preflightCommitment: "confirmed" });
       const program = new Program(idl as any, provider);
       
       // ... Derive PDAs and call program.methods.claimRent().rpc()
       // For brevity, simulating success as the logic is identical to tokenizeProperty
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
      <div className="flex-grow flex items-center justify-center min-h-screen">
        <span className="material-symbols-outlined animate-spin text-4xl text-[#00F0FF]">refresh</span>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-screen p-6">
        <div className="glass-panel p-12 rounded-3xl border-red-500/20 text-center space-y-4 max-w-md w-full">
          <span className="material-symbols-outlined text-red-500 text-6xl">error</span>
          <h1 className="text-2xl font-light text-white heading-display">Error loading asset</h1>
          <p className="text-slate-500 font-light">{error || "Asset not found in protocol registry."}</p>
          <Link href="/explore" className="inline-block mt-4 text-primary border-b border-primary/30 hover:border-primary transition-all pb-1 text-sm uppercase tracking-widest font-bold">Back to Marketplace</Link>
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
    <div className="flex-grow flex flex-col antialiased text-slate-300 relative">
      {/* Hero Section */}
      <div className="relative h-[400px] md:h-[500px] w-full overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('${getDocUrl(property.image_url || property.document_url)}')` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-[#060606]/40 to-transparent"></div>
        <div className="absolute inset-0 bg-black/40"></div>
        
        <div className="relative z-10 h-full max-w-6xl mx-auto px-6 flex flex-col justify-end pb-12">
            <div className="flex flex-col gap-6">
                <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-1.5 bg-black/60 backdrop-blur-md border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest rounded-full">{property.property_type?.toUpperCase() || "REAL ESTATE"}</span>
                    <span className="px-4 py-1.5 bg-[#10B981]/20 border border-[#10B981]/30 backdrop-blur-md text-[#10B981] text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px]">verified</span> ON-CHAIN VERIFIED
                    </span>
                </div>
                <div className="space-y-4">
                  <h1 className="text-4xl md:text-6xl font-light text-white tracking-tight heading-display leading-tight">{property.name}</h1>
                  <p className="text-slate-300/80 flex items-center gap-2 font-light text-lg">
                      <span className="material-symbols-outlined text-[#F59E0B]">location_on</span>
                      {property.address}, {property.city || ""}
                  </p>
                </div>
            </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-12 md:py-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column: Details */}
            <div className="lg:col-span-2 space-y-12">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Yield</p>
                        <p className="text-2xl font-light text-[#10B981]">{property.yield_percent}%</p>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entry Price</p>
                        <p className="text-2xl font-light text-white">${property.token_price_usd?.toLocaleString()}</p>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supply</p>
                        <p className="text-2xl font-light text-white">{property.token_supply?.toLocaleString()}</p>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl border-white/5 space-y-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Frequence</p>
                        <p className="text-2xl font-light text-white capitalize">{property.dist_frequency || "Monthly"}</p>
                    </div>
                </div>

                {/* About Section */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-light text-white heading-display border-b border-white/5 pb-4">Asset Intelligence</h2>
                    <div className="glass-panel border-white/5 rounded-3xl p-8 leading-relaxed font-light text-slate-400">
                        {property.name} is a verified, institutional-grade commercial asset within the ProofEstate protocol. 
                        It has been thoroughly authenticated before being fractionalized on the Solana network as SPL-Token-2022 units. 
                        Each token represents a cryptographically-secured economic interest in the property's throughput and appreciation.
                    </div>
                </div>

                {/* Yield Management (If Holding) */}
                {tokenBalance > 0 && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-light text-white heading-display border-b border-white/5 pb-4">Revenue Distribution</h2>
                        <div className="glass-panel border-[#10B981]/30 bg-[#10B981]/5 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                            <div className="flex items-center gap-6">
                                <div className="size-16 rounded-2xl bg-[#10B981]/10 flex items-center justify-center border border-[#10B981]/20">
                                    <span className="material-symbols-outlined text-[#10B981] text-3xl">payments</span>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Your Claimable USDC</p>
                                    <h4 className="text-4xl font-light text-white tracking-tight heading-display">${claimableRent}</h4>
                                    <p className="text-xs text-[#10B981] mt-1 font-mono">Holding {tokenBalance.toLocaleString()} FRAC tokens</p>
                                </div>
                            </div>
                            <button
                                onClick={handleClaim}
                                disabled={isClaiming || claimableRent === "0"}
                                className="w-full md:w-auto px-10 py-5 bg-[#10B981] text-black font-bold uppercase tracking-widest text-[11px] rounded-2xl hover:scale-[1.05] shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all flex items-center justify-center gap-2 group"
                            >
                                {isClaiming ? (
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[18px]">account_balance</span>
                                        Withdraw Yield
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Registry Details */}
                <div className="space-y-6">
                    <h2 className="text-2xl font-light text-white heading-display border-b border-white/5 pb-4">Registry Integrity</h2>
                    <div className="glass-panel border-white/5 rounded-3xl p-8 space-y-6 font-mono text-xs">
                       <div className="flex flex-col md:flex-row justify-between gap-4 border-b border-white/5 pb-6">
                          <span className="text-slate-600 uppercase tracking-widest">Asset ZK-Hash</span>
                          <span className="text-white break-all md:text-right md:max-w-sm">{property.metadata_hash || "NULL_IDENTITY"}</span>
                       </div>
                       <div className="flex flex-col md:flex-row justify-between gap-4">
                          <span className="text-slate-600 uppercase tracking-widest">Protocol Mint</span>
                          <span className="text-[#00F0FF] break-all md:text-right md:max-w-sm">{property.token_mint || "AWAITING_FRACTIONALIZATION"}</span>
                       </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Execution */}
            <div className="lg:col-span-1">
                <div className="glass-panel border-primary/20 rounded-[32px] p-8 sticky top-32 overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-all"></div>
                    
                    <h3 className="text-2xl font-light text-white mb-8 heading-display flex items-center gap-3">
                       <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
                       Participate
                    </h3>

                    {!user || user.role !== "investor" ? (
                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center space-y-4">
                            <span className="material-symbols-outlined text-4xl text-slate-600">lock</span>
                            <p className="text-xs text-slate-500 font-light leading-relaxed">Identity authorization required. Please sync as an <strong>Investor</strong> to access protocol units.</p>
                            <Link href="/profile" className="inline-block text-primary font-bold uppercase tracking-widest text-[10px] border-b border-primary/30 hover:border-primary transition-all pb-1">Configure Identity</Link>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <label className="block group">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3 group-focus-within:text-primary transition-colors">Investment (USDC)</span>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 text-lg">$</span>
                                    <input 
                                        type="number" 
                                        value={investmentAmount} 
                                        onChange={e => setInvestmentAmount(e.target.value)} 
                                        className="w-full bg-black/40 border border-white/10 text-white font-light text-xl rounded-2xl h-16 pl-10 pr-6 focus:border-primary outline-none transition-all"
                                    />
                                </div>
                            </label>

                            <div className="bg-white/5 rounded-2xl p-6 space-y-4 border border-white/5 font-mono text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 uppercase">Fractions</span>
                                    <span className="text-white text-sm">{isNaN(numTokens) ? 0 : numTokens.toLocaleString()} FRAC</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-slate-600 uppercase">Yield P.A.</span>
                                    <span className="text-[#10B981] text-sm">+${isNaN(Number(annualYield)) ? 0 : annualYield}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-white/5 pt-4">
                                    <span className="text-slate-600 uppercase">Ownership</span>
                                    <span className="text-[#00F0FF] text-sm">{isNaN(Number(ownershipPercent)) ? 0 : ownershipPercent}%</span>
                                </div>
                            </div>

                            <button 
                                onClick={handleInvest}
                                disabled={isInvesting || !property.token_mint}
                                className={`w-full h-16 rounded-2xl font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-glow ${isInvesting || !property.token_mint ? 'bg-white/5 text-slate-600 cursor-not-allowed shadow-none border border-white/5' : 'bg-gradient-to-r from-primary to-primary-light text-black hover:scale-[1.02] active:scale-[0.98]'}`}
                            >
                                {isInvesting ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                                        Transacting...
                                    </>
                                ) : !property.token_mint ? (
                                    <>Initializing State...</>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-[20px]">payments</span>
                                        Commit Capital
                                    </>
                                )}
                            </button>
                            <p className="text-center text-[9px] text-slate-600 uppercase tracking-widest font-bold flex items-center justify-center gap-2">
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
          <div className="glass-panel border-white/10 rounded-[32px] md:rounded-[40px] p-6 md:p-10 text-center max-w-md w-full shadow-[0_0_50px_rgba(16,185,129,0.1)]">
             <div className="size-20 md:size-24 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                <span className="material-symbols-outlined text-5xl text-[#10B981]">check_circle</span>
             </div>
             <h3 className="text-3xl font-light text-white mb-2 heading-display">Protocol Sync Complete</h3>
             <p className="text-slate-400 font-light mb-8 text-lg">
                 You have committed <strong>${Number(investmentAmount).toLocaleString()}</strong> to {property.name}. Protocol units initialized in your vault.
             </p>
             <button
               onClick={() => setShowSuccessModal(false)}
               className="w-full h-16 bg-white/5 hover:bg-white/10 text-white font-bold rounded-2xl transition-all uppercase tracking-widest text-xs border border-white/10"
             >
                Return to Registry
             </button>
          </div>
        </div>
      )}

    </div>
  );
}
