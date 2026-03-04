"use client";
import { useState, useEffect } from "react";
import { listProperties, verifyProperty, approveTokenize, getDocUrl, type Property } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";

export default function AdminPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const data = await listProperties();
      setProperties(data.filter(p => p.status === "pending_verification" || p.status === "pending_tokenization"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, approved: boolean) => {
    setProcessingId(id);
    try {
      const res = await verifyProperty(id, user?.wallet || "AdminWallet", approved, approved ? "Verified against government registry" : "Document mismatch");
      alert(res.message);
      fetchProperties();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveTokenization = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await approveTokenize(id, user?.wallet || "AdminWallet");
      alert(`Success! Token Mint: ${res.token_mint}`);
      fetchProperties();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (user && user.role !== "admin") {
    return (
        <div className="flex-grow flex items-center justify-center p-8">
            <div className="glass-panel p-12 rounded-3xl border-red-500/20 text-center space-y-4">
               <span className="material-symbols-outlined text-red-500 text-6xl">security</span>
               <h1 className="text-2xl font-light text-white heading-display">Restricted Access</h1>
               <p className="text-slate-500 font-light">Your principal identity is not authorized for protocol administrative functions.</p>
               <Link href="/" className="inline-block mt-4 text-[#D4AF37] border-b border-[#D4AF37]/30 hover:border-[#D4AF37] transition-all pb-1 text-sm uppercase tracking-widest font-bold">Return to Dashboard</Link>
            </div>
        </div>
    );
  }

  const verifications = properties.filter(p => p.status === "pending_verification");
  const tokenizations = properties.filter(p => p.status === "pending_tokenization");

  return (
    <div className="flex-grow flex flex-col antialiased text-slate-300 relative">
      <main className="flex-grow px-6 py-12 md:py-16 relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[#D4AF37]/5 pointer-events-none blur-[150px] rounded-full"></div>
        
        <div className="max-w-6xl mx-auto space-y-12 relative z-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-5xl font-light text-white tracking-tight heading-display">Command Center</h2>
              <p className="text-slate-400 font-light text-base md:text-lg">Protocol-level verification and asset-backed minting authority.</p>
            </div>
            <button onClick={fetchProperties} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#D4AF37] hover:text-[#F3E5AB] transition-colors">
               <span className={`material-symbols-outlined text-[18px] ${loading ? "animate-spin" : ""}`}>refresh</span>
               Synchronize Ledger
            </button>
          </div>

          {error && (
            <div className="glass-panel border-red-500/20 bg-red-500/5 rounded-2xl p-6 text-red-400 mb-8">
              {error}
            </div>
          )}

          {!loading && !error && properties.length === 0 && (
            <div className="glass-panel rounded-3xl border-white/10 p-24 text-center flex flex-col items-center gap-6">
              <div className="size-20 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
                <span className="material-symbols-outlined text-4xl text-slate-700">task_alt</span>
              </div>
              <h3 className="text-3xl font-light text-white heading-display">Queue Clear</h3>
              <p className="text-slate-500 font-light text-lg max-w-sm">System state is nominal. No pending administrative decisions.</p>
            </div>
          )}

          {/* Pending Verifications */}
          {!loading && !error && verifications.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-light text-white flex items-center gap-3 heading-display">
                <span className="material-symbols-outlined text-[#F59E0B]">description</span>
                Verification Backlog ({verifications.length})
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {verifications.map((p) => (
                  <div key={p.id} className="glass-panel rounded-3xl border-white/5 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 hover:border-white/20 transition-all">
                    <div className="space-y-3 flex-grow min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-[#F59E0B] bg-[#F59E0B]/5 border border-[#F59E0B]/20 px-3 py-1 rounded-full uppercase tracking-widest">PENDING_REVIEW</span>
                        <span className="text-[10px] font-mono text-slate-600 uppercase">UUID: {p.id.split('-')[0]}...</span>
                      </div>
                      <h4 className="text-2xl font-light text-white truncate heading-display">{p.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {p.address}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3 shrink-0">
                      <Link 
                        href={getDocUrl(p.document_url)} 
                        target="_blank"
                        className="w-full sm:w-auto px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all order-3 sm:order-1"
                      >
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                        Inspect Assets
                      </Link>
                      <button
                        onClick={() => handleVerify(p.id, false)}
                        disabled={processingId === p.id}
                        className="w-full sm:w-auto px-6 py-4 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 order-2 sm:order-2"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleVerify(p.id, true)}
                        disabled={processingId === p.id}
                        className="w-full sm:w-auto px-8 py-4 bg-[#10B981] text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.05] transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center gap-2 disabled:opacity-50 order-1 sm:order-3"
                      >
                        {processingId === p.id ? (
                          <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                        ) : "Execute Approval"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Tokenizations */}
          {!loading && !error && tokenizations.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-xl font-light text-white flex items-center gap-3 heading-display">
                <span className="material-symbols-outlined text-[#00F0FF]">generating_tokens</span>
                Mint Authorizations ({tokenizations.length})
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {tokenizations.map((p) => (
                  <div key={p.id} className="glass-panel rounded-3xl border-white/5 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 hover:border-white/20 transition-all">
                    <div className="space-y-4 flex-grow min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-[#00F0FF] bg-[#00F0FF]/5 border border-[#00F0FF]/20 px-3 py-1 rounded-full uppercase tracking-widest">MINT_REQUEST</span>
                        <span className="text-[10px] font-mono text-slate-600 uppercase">UUID: {p.id.split('-')[0]}...</span>
                      </div>
                      <h4 className="text-2xl font-light text-white truncate heading-display">{p.name}</h4>
                      
                      <div className="grid grid-cols-3 gap-6 bg-black/40 border border-white/5 rounded-2xl p-4 text-[11px] font-mono">
                         <div className="space-y-1">
                            <p className="text-slate-600 uppercase">Supply</p>
                            <p className="text-white text-sm">{p.token_supply?.toLocaleString()}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-slate-600 uppercase">Valuation</p>
                            <p className="text-white text-sm">${p.token_price_usd}</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-slate-600 uppercase">Target Yield</p>
                            <p className="text-[#10B981] text-sm">{p.yield_percent}%</p>
                         </div>
                      </div>
                    </div>

                    <div className="shrink-0 sm:min-w-[240px]">
                      <button
                        onClick={() => handleApproveTokenization(p.id)}
                        disabled={processingId === p.id}
                        className="w-full py-5 bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black rounded-2xl font-bold uppercase tracking-widest text-[11px] hover:scale-[1.02] shadow-glow active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                        {processingId === p.id ? (
                          <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[18px]">gavel</span>
                            Authorize Token Mint
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
