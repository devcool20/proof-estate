"use client";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getProperty, requestTokenize, type Property } from "@/lib/api";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletProviders } from "@/components/WalletProviders";

function TokenizeForm() {
  const searchParams = useSearchParams();
  const propId = searchParams.get("id");
  const { publicKey } = useWallet();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tokenization params
  const [supply, setSupply] = useState("1000000");
  const [priceUsd, setPriceUsd] = useState("45.00");
  const [yieldPct, setYieldPct] = useState("5.2");
  const [frequency, setFrequency] = useState("monthly");

  const [isMinting, setIsMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{ token_mint: string; message: string } | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  useEffect(() => {
    if (!propId) {
      setError("No property ID specified.");
      setLoading(false);
      return;
    }
    getProperty(propId)
      .then((p) => {
        setProperty(p);
        if (p.token_supply) setSupply(String(p.token_supply));
        if (p.token_price_usd) setPriceUsd(String(p.token_price_usd));
        if (p.yield_percent) setYieldPct(String(p.yield_percent));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [propId]);

  const totalValue = Number(supply) * Number(priceUsd);

  const handleMint = async () => {
    if (!propId || !property || !publicKey) {
      setMintError("Wallet not connected.");
      return;
    }
    
    setIsMinting(true);
    setMintError(null);

    try {
      const { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair } = await import("@solana/web3.js");
      const { Program, AnchorProvider, BN } = await import("@coral-xyz/anchor");
      const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } = await import("@solana/spl-token");
      const idl = await import("@/lib/idl.json");

      const connection = new Connection(process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com", "confirmed");
      const provider = new AnchorProvider(connection, (window as any).solana, { preflightCommitment: "confirmed" });
      const program = new Program(idl as any, provider);

      // Generate a new mint keypair
      const mintKeypair = Keypair.generate();
      const ownerTokenAccount = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      if (!property.on_chain_address) {
        throw new Error("Property is missing on_chain_address. Submit and verify the property first.");
      }
      const propertyPDA = new PublicKey(property.on_chain_address);

      console.log("🚀 Initializing on-chain mint for property:", property.name);

      // 1. Send the Solana Transaction (Owner signs)
      const tx = await program.methods
        .tokenizeProperty(new BN(supply))
        .accounts({
          propertyAccount: propertyPDA,
          owner: publicKey,
          tokenMint: mintKeypair.publicKey,
          ownerTokenAccount: ownerTokenAccount,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([mintKeypair])
        .rpc();

      console.log("✅ On-chain mint complete:", tx);

      // 2. Notify Backend to Sync State
      await requestTokenize(propId, {
        owner_wallet:    publicKey.toBase58(),
        token_supply:    Number(supply),
        token_price_usd: Number(priceUsd),
        yield_percent:   Number(yieldPct),
        dist_frequency:  frequency as any,
        token_mint:      mintKeypair.publicKey.toBase58(),
        tx_signature:    tx,
      });

      setMintResult({ 
        token_mint: mintKeypair.publicKey.toBase58(), 
        message: `Success! tokens have been minted to your wallet. Tx: ${tx}` 
      });
    } catch (e: any) {
      console.error("❌ Tokenization error:", e);
      setMintError(e.message || "Failed to execute on-chain tokenization.");
    } finally {
      setIsMinting(false);
    }
  };

  // Success screen
  if (mintResult) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#00F0FF]/10 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="glass-panel rounded-2xl shadow-card p-5 md:p-8 max-w-md w-full space-y-4 md:space-y-5 relative z-10 border-white/10">
          <div className="size-14 md:size-16 bg-[#00F0FF]/10 rounded-full flex items-center justify-center mx-auto border border-[#00F0FF]/30 shadow-[0_0_30px_rgba(0,240,255,0.2)]">
            <span className="material-symbols-outlined text-[28px] md:text-[32px] text-[#00F0FF]">generating_tokens</span>
          </div>
          <div>
            <h2 className="text-xl font-light text-white heading-display mb-1.5">Minting Protocol Initialized</h2>
            <p className="text-slate-400 font-light text-sm">
              Your asset-backed fractionalization instruction has been submitted to the Solana cluster.
            </p>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-left space-y-3 font-mono text-[11px] overflow-hidden">
            <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
              <span className="text-slate-500 uppercase tracking-widest text-[9px]">Supply Generated</span>
              <span className="text-white">{Number(supply).toLocaleString()} FRAC</span>
            </div>
            <div className="flex justify-between items-center pb-2.5 border-b border-white/5">
              <span className="text-slate-500 uppercase tracking-widest text-[9px]">Mint Authority</span>
              <span className="text-[#00F0FF]">PROPERTY_PDA</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 uppercase tracking-widest text-[9px]">Status</span>
              <span className="text-[#F59E0B] font-bold flex items-center gap-1.5 text-[11px]">
                <span className="size-1.5 rounded-full bg-[#F59E0B] animate-pulse"></span>
                AWAITING MULTISIG
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-500 italic p-2.5 border border-white/5 rounded-lg bg-white/5">
             {mintResult.message}
          </div>
          <Link
            href="/properties"
            className="block w-full py-2.5 bg-gradient-to-r from-primary to-primary-light text-black rounded-lg font-bold uppercase tracking-widest text-[11px] hover:scale-[1.02] transition-all shadow-glow"
          >
            Monitor Asset
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col antialiased text-slate-300 relative">
      <main className="flex-grow px-6 py-8 md:py-14 relative">
        <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-[#00F0FF]/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-4xl mx-auto space-y-8 relative z-10">
          
          {/* Header */}
          <div className="text-left space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium uppercase tracking-widest">
              <Link href="/properties" className="hover:text-primary transition-colors">Registry</Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span className="text-white">Fractionalization</span>
            </div>
            <h2 className="text-xl md:text-3xl font-light text-white tracking-tight heading-display">Asset Fractionalization</h2>
            <p className="text-slate-400 font-light max-w-xl text-xs md:text-sm">
              Deconstruct your verified physical asset into tradable SPL-Token22 units. This process is non-custodial and cryptographically linked to the property deed.
            </p>
          </div>

          {loading && <div className="glass-panel rounded-3xl h-64 animate-pulse border-white/5" />}

          {error && (
            <div className="glass-panel border-red-500/20 bg-red-500/5 rounded-2xl p-6 text-red-400 flex items-center gap-4">
               <span className="material-symbols-outlined text-[32px]">error</span>
               <p className="font-light">{error}</p>
            </div>
          )}

          {property && property.status !== "verified" && (
            <div className="glass-panel border-[#F59E0B]/20 bg-[#F59E0B]/5 rounded-2xl p-8 text-[#F59E0B] space-y-4">
               <div className="flex items-center gap-3">
                 <span className="material-symbols-outlined text-[28px]">gavel</span>
                 <p className="font-bold uppercase tracking-widest text-xs">Invalid Protocol State</p>
               </div>
               <p className="font-light text-amber-100/70">
                 Property status is currently <strong>{property.status}</strong>. Only <strong>Verified</strong> assets can initiate on-chain fractionalization.
               </p>
               <Link href="/properties" className="inline-block px-6 py-2 border border-[#F59E0B]/30 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#F59E0B]/10 transition-all">
                 Return to Registry
               </Link>
            </div>
          )}

          {property && property.status === "verified" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Params Column */}
              <div className="lg:col-span-2 space-y-5 text-slate-300">
                
                {/* Property Detail Bar */}
                <div className="glass-panel rounded-xl p-3 md:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 border-white/10">
                  <div className="size-10 md:size-12 rounded-lg overflow-hidden shrink-0 border border-white/5 bg-slate-900">
                     <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=200" alt="" className="w-full h-full object-cover opacity-60" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-[8px] md:text-[9px] font-bold text-[#10B981] uppercase tracking-widest mb-0.5 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[11px] md:text-[12px]">verified</span>
                      Verified Asset
                    </p>
                    <h3 className="text-sm md:text-base font-light text-white truncate heading-display">{property.name}</h3>
                    <p className="text-[9px] md:text-[10px] text-slate-500 truncate">{property.address}</p>
                  </div>
                </div>

                {/* Controls */}
                <div className="glass-panel rounded-2xl p-5 border-white/10 space-y-5">
                  <h4 className="text-base font-light text-white heading-display border-b border-white/5 pb-3">Mint Parameters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <label className="block group">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#00F0FF] transition-colors">Total Token Supply</span>
                      <div className="relative">
                        <input type="number" value={supply} onChange={(e) => setSupply(e.target.value)}
                          className="w-full h-10 px-3 border border-white/10 rounded-lg bg-black/40 focus:bg-white/5 focus:border-[#00F0FF] outline-none transition-all text-white font-light text-sm" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] uppercase font-bold text-slate-600 tracking-tighter">Units</span>
                      </div>
                    </label>
                    <label className="block group">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#00F0FF] transition-colors">Initial Unit Price (USD)</span>
                      <div className="relative">
                        <span className="absolute left-3 text-slate-500 font-light top-1/2 -translate-y-1/2 text-sm">$</span>
                        <input type="number" step="0.01" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)}
                          className="w-full h-10 pl-7 pr-3 border border-white/10 rounded-lg bg-black/40 focus:bg-white/5 focus:border-[#00F0FF] outline-none transition-all text-white font-light text-sm" />
                      </div>
                    </label>
                    <label className="block group">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#00F0FF] transition-colors">Target Annual Yield</span>
                      <div className="relative">
                        <input type="number" step="0.1" value={yieldPct} onChange={(e) => setYieldPct(e.target.value)}
                          className="w-full h-10 px-3 border border-white/10 rounded-lg bg-black/40 focus:bg-white/5 focus:border-[#00F0FF] outline-none transition-all text-white font-light text-sm" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-600">%</span>
                      </div>
                    </label>
                    <label className="block group">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 group-focus-within:text-[#00F0FF] transition-colors">Yield Distribution</span>
                      <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                        className="w-full h-10 px-3 border border-white/10 rounded-lg bg-black/40 focus:bg-white/5 focus:border-[#00F0FF] outline-none transition-all text-white font-light text-sm appearance-none">
                        <option value="monthly">Monthly Baseline</option>
                        <option value="quarterly">Quarterly Yield</option>
                        <option value="annually">Annual Settlement</option>
                      </select>
                    </label>
                  </div>

                  <div className="bg-white/5 border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Total Protocol Raise</span>
                      <span className="text-lg font-light text-white">${totalValue.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Annual Yield / Unit</span>
                      <span className="text-sm font-light text-[#10B981]">
                        ${(Number(priceUsd) * Number(yieldPct) / 100).toFixed(4)} USDC
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary / Execution Sidebar */}
              <div className="space-y-4">
                <div className="glass-panel border-primary/20 rounded-2xl p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/10 transition-all"></div>
                  
                  <h4 className="text-[9px] font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">terminal</span>
                    Mint Summary
                  </h4>
                  
                  <div className="space-y-3 font-mono text-[11px]">
                    {[
                      ["PROTOCOL",     "TOKEN-22"],
                      ["NETWORK",      "SOLANA_MAINNET"],
                      ["MINT_AUTH",    "PROPERTY_PDA"],
                      ["TOTAL_SUPPLY",  Number(supply).toLocaleString()],
                      ["UNIT_PRICE",   `$${Number(priceUsd).toFixed(2)}`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-white/5 pb-1.5">
                        <span className="text-slate-600">{k}</span>
                        <span className="text-slate-300 font-medium">{v}</span>
                      </div>
                    ))}
                  </div>

                  {mintError && (
                    <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] text-red-500">
                      {mintError}
                    </div>
                  )}

                  <button
                    onClick={handleMint}
                    disabled={isMinting}
                    className="w-full mt-5 py-3 bg-gradient-to-r from-primary to-primary-light text-black rounded-xl font-bold uppercase tracking-widest text-[11px] hover:scale-[1.02] shadow-glow active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    {isMinting ? (
                      <>
                        <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                        Executing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                        Initialize Mint
                      </>
                    )}
                  </button>
                </div>

                <div className="glass-panel rounded-xl p-4 text-[10px] text-slate-500 border-white/10 font-light leading-relaxed">
                  <p className="font-bold text-white uppercase tracking-widest text-[8px] mb-2 flex items-center gap-1 opacity-60">
                    <span className="material-symbols-outlined text-[12px]">info</span>
                    Protocol Notice
                  </p>
                  By initializing this mint, you are authorizing the Solana Program to generate immutable ownership fractions. This action requires multisig approval from the primary verifier to finalize registry sync.
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function TokenizePage() {
  return (
    <WalletProviders>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-700 uppercase tracking-widest text-[10px]">Synchronizing...</div>}>
        <TokenizeForm />
      </Suspense>
    </WalletProviders>
  );
}
