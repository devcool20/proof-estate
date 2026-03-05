"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { listProperties, type Property } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

const STATUS_LABEL: Record<string, { label: string; color: string; icon: string; glow: string }> = {
  draft:                { label: "Draft",        color: "text-slate-500 border-white/5 bg-white/5", icon: "draft", glow: "" },
  pending_verification: { label: "Under Review", color: "text-[#F59E0B] border-[#F59E0B]/20 bg-[#F59E0B]/5", icon: "hourglass_empty", glow: "shadow-[0_0_10px_rgba(245,158,11,0.2)]" },
  verified:             { label: "Verified",     color: "text-[#10B981] border-[#10B981]/20 bg-[#10B981]/5", icon: "verified_user", glow: "shadow-[0_0_10px_rgba(16,185,129,0.2)]" },
  pending_tokenization: { label: "Tokenizing",   color: "text-[#00F0FF] border-[#00F0FF]/20 bg-[#00F0FF]/5", icon: "hourglass_top", glow: "shadow-[0_0_10px_rgba(0,240,255,0.2)]" },
  tokenized:            { label: "Tokenized",    color: "text-primary border-primary/20 bg-primary/5", icon: "generating_tokens", glow: "shadow-[0_0_10px_rgba(var(--color-primary-rgb),0.2)]" },
  rejected:             { label: "Rejected",     color: "text-red-400 border-red-500/20 bg-red-500/5", icon: "cancel", glow: "" },
};

function formatInr(paise?: number) {
  if (!paise) return "—";
  const crore = paise / 1_00_00_000;
  if (crore >= 1) return `₹${crore.toFixed(2)} Cr`;
  const lakh = paise / 1_00_000;
  return `₹${lakh.toFixed(1)} L`;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
        setLoading(false);
        return;
    }
    listProperties()
      .then((data) => setProperties(data.filter(p => p.owner_wallet === user.wallet)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div className="flex-grow flex flex-col antialiased text-slate-300 relative">
      <main className="flex-grow px-6 py-12 md:py-16 relative">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[150px] pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto space-y-12 relative z-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div className="space-y-2">
              <h2 className="text-3xl md:text-5xl font-light text-white tracking-tight heading-display">Asset Registry</h2>
              <p className="text-slate-400 font-light text-base md:text-lg">Manage your real estate portfolio — from initial deed submission through global tokenization.</p>
            </div>
            <Link
              href="/verify"
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-primary to-primary-light text-black rounded-xl font-bold uppercase tracking-widest text-sm hover:scale-[1.05] active:scale-[0.95] transition-all shadow-glow flex items-center justify-center gap-3 shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Register New Asset
            </Link>
          </div>

          {/* Status legend */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(STATUS_LABEL).map(([key, { label, color, icon, glow }]) => (
              <span key={key} className={`px-4 py-1.5 rounded-full border text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 backdrop-blur-md ${color} ${glow}`}>
                <span className="material-symbols-outlined text-[14px]">{icon}</span>
                {label}
              </span>
            ))}
          </div>

          {/* Content */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-panel rounded-3xl h-[400px] animate-pulse border-white/5" />
              ))}
            </div>
          )}

          {error && (
            <div className="glass-panel border-red-500/20 bg-red-500/5 rounded-2xl p-6 text-red-400 flex items-center gap-4">
              <span className="material-symbols-outlined text-[32px]">error</span>
              <div>
                <p className="font-bold uppercase tracking-widest text-xs mb-1">Backend Connection Error</p>
                <p className="text-sm font-light">Could not connect to the indexing node: <code className="text-xs bg-black/40 px-1.5 py-0.5 rounded">{error}</code>.</p>
              </div>
            </div>
          )}

          {!loading && !error && properties.length === 0 && (
            <div className="glass-panel rounded-3xl border-white/10 p-20 flex flex-col items-center text-center gap-8 group">
              <div className="size-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-5xl text-slate-600 group-hover:text-primary">home_work</span>
              </div>
              <div className="space-y-3">
                <h3 className="text-3xl font-light text-white heading-display">Registry Empty</h3>
                <p className="text-slate-400 font-light max-w-sm mx-auto text-lg leading-relaxed">No validated assets found under this principal identity. Initialize your first tokenization protocol.</p>
              </div>
              <Link href="/verify" className="px-10 py-4 border border-primary text-primary hover:bg-primary hover:text-black rounded-xl font-bold uppercase tracking-widest text-sm transition-all shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.1)]">
                Initialize Asset
              </Link>
            </div>
          )}

          {!loading && !error && properties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((prop) => {
                const st = STATUS_LABEL[prop.status] || STATUS_LABEL["draft"];
                return (
                  <div key={prop.id} className="glass-panel rounded-3xl shadow-card border-white/10 overflow-hidden flex flex-col group hover:border-primary/30 transition-all hover:-translate-y-1">
                    {/* Visual representation */}
                    <div className="h-56 w-full relative overflow-hidden">
                       <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
                       <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center mix-blend-overlay opacity-40 group-hover:scale-110 transition-transform duration-700" />
                       <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-transparent to-transparent" />
                       
                       <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                         <span className="px-3 py-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
                           <span className="material-symbols-outlined text-[14px] text-[#00F0FF]">domain</span>
                           {prop.property_type ?? "Property"}
                         </span>
                         <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-md ${st.color} ${st.glow}`}>
                           <span className="material-symbols-outlined text-[14px]">{st.icon}</span>
                           {st.label}
                         </span>
                       </div>
                    </div>

                    {/* Meta Body */}
                    <div className="p-6 md:p-8 flex flex-col flex-grow gap-6 relative">
                      <div className="space-y-1">
                        <h3 className="text-2xl font-light text-white leading-tight heading-display group-hover:text-primary transition-colors">{prop.name}</h3>
                        <div className="flex items-center gap-2 text-slate-500">
                          <span className="material-symbols-outlined text-[16px]">location_on</span>
                          <p className="text-sm font-light truncate">{prop.address}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6 bg-white/5 border border-white/5 rounded-2xl p-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Asset Value</p>
                          <p className="text-lg font-light text-white">{formatInr(prop.asset_value_inr)}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ownership</p>
                          <p className="text-lg font-light text-[#00F0FF]">100%</p>
                        </div>
                      </div>

                      {(prop.metadata_hash || prop.token_mint) && (
                        <div className="space-y-2 py-4 border-y border-white/5">
                          {prop.metadata_hash && (
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-slate-600 uppercase">ZK.PROOF</span>
                              <span className="text-slate-400 truncate max-w-[120px]">{prop.metadata_hash}</span>
                            </div>
                          )}
                          {prop.token_mint && (
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-primary uppercase tracking-widest">SPL.MINT</span>
                              <span className="text-primary/60 truncate max-w-[120px]">{prop.token_mint}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Execution CTA */}
                      <div className="mt-auto pt-4">
                        {prop.status === "verified" && (
                          <Link
                            href={`/tokenize?id=${prop.id}`}
                            className="w-full py-4 bg-gradient-to-r from-primary to-primary-light text-black rounded-xl font-bold uppercase tracking-widest text-xs shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                          >
                            <span className="material-symbols-outlined text-[20px]">generating_tokens</span>
                            Initialize Tokenization
                          </Link>
                        )}
                        {prop.status === "tokenized" && (
                          <div className="w-full py-4 bg-white/5 border border-primary/30 text-primary rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-[18px]">verified</span>
                            Trading Live on Solana
                          </div>
                        )}
                        {prop.status === "pending_tokenization" && (
                          <div className="w-full py-4 bg-white/5 border border-[#00F0FF]/30 text-[#00F0FF] rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 animate-pulse">
                            <span className="material-symbols-outlined text-[18px]">hourglass_top</span>
                            Tokenization in Progress
                          </div>
                        )}
                        {prop.status === "pending_verification" && (
                          <div className="w-full py-4 bg-white/5 border border-white/10 text-slate-500 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-[18px]">lock_clock</span>
                            Registry Verification
                          </div>
                        )}
                        {prop.status === "rejected" && (
                          <div className="w-full py-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            Validation Failed
                          </div>
                        )}
                        {prop.status === "draft" && (
                          <div className="w-full py-4 border border-white/10 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-[10px] flex items-center justify-center gap-3">
                            <span className="material-symbols-outlined text-[18px]">draft</span>
                            Finalize Draft
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
