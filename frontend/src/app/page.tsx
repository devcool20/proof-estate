"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { listProperties, type Property } from "@/lib/api";

import { useAuth } from "@/lib/AuthContext";

function StatCard({ icon, label, value, accentColor }: { icon: string; label: string; value: string | number; accentColor: string }) {
  return (
    <div className="glass-panel rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-2xl -mr-10 -mt-10 transition-all group-hover:scale-150" style={{ backgroundImage: `linear-gradient(to bottom right, ${accentColor}, transparent)` }}></div>
      <div className="flex items-center gap-4 relative z-10">
        <div className="size-12 rounded-xl flex items-center justify-center shrink-0 bg-white/5 border border-white/10" style={{ color: accentColor }}>
          <span className="material-symbols-outlined text-[24px]">{icon}</span>
        </div>
        <div>
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">{label}</p>
          <p className="text-3xl font-light text-white leading-tight mt-1 heading-display">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    listProperties()
      .then(setProperties)
      .catch(() => {/* backend offline — show zeros */})
      .finally(() => setLoading(false));
  }, []);

  const total      = properties.length;
  const verified   = properties.filter((p) => p.status === "verified" || p.status === "pending_tokenization").length;
  const tokenized  = properties.filter((p) => p.status === "tokenized").length;
  const pending    = properties.filter((p) => p.status === "pending_verification").length;

  const recentProps = properties.slice(0, 5);

  return (
    <div className="flex-grow flex flex-col antialiased text-slate-300 relative">
      <main className="flex-grow px-6 py-16 md:py-24 relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-40 right-10 w-[500px] h-[500px] bg-[#00F0FF]/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto space-y-24 relative z-10">
          {/* Hero */}
          <div className="flex flex-col lg:flex-row justify-between items-center gap-16 lg:gap-12">
            <div className="flex flex-col items-center lg:items-start max-w-3xl">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/5 text-[#D4AF37] text-[10px] md:text-xs font-bold uppercase tracking-widest mb-6 md:mb-8 mx-auto lg:mx-0">
                <span className="size-1.5 rounded-full bg-[#D4AF37] animate-pulse shadow-[0_0_5px_#D4AF37]"></span>
                The Future of Real Estate
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-[5rem] font-light text-white leading-[1.1] md:leading-[1.05] mb-6 md:mb-8 heading-display tracking-tight text-center lg:text-left">
                Institutional Grade <br className="hidden sm:block" />
                <span className="font-medium bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] bg-clip-text text-transparent italic tracking-normal">Tokenization.</span>
              </h1>
              <p className="text-base md:text-xl text-slate-400 font-light leading-relaxed max-w-2xl text-center lg:text-left mx-auto lg:mx-0">
                On-chain verification and asset tokenization protocol for premium real estate. Bridge real-world property to Solana with cryptographically proven title deeds and fractional ownership.
              </p>
              
              <div className="flex flex-wrap justify-center lg:justify-start gap-4 mt-10 md:mt-12">
                {!user && (
                    <div className="text-xs md:text-sm font-semibold text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-5 md:px-6 py-3 md:py-4 rounded-xl backdrop-blur-sm flex items-center gap-3">
                      <span className="material-symbols-outlined text-[18px] md:text-[20px]">account_balance_wallet</span>
                      Connect your wallet to get started.
                    </div>
                )}
                
                {user?.role === "owner" && (
                  <>
                    <Link href="/verify" className="w-full sm:w-auto bg-gradient-to-tr from-[#D4AF37] to-[#F3E5AB] text-black px-8 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3 shadow-glow hover:scale-105 active:scale-95 duration-300">
                      <span className="material-symbols-outlined text-[20px]">add_circle</span>
                      Submit Asset
                    </Link>
                    <Link href="/properties" className="w-full sm:w-auto bg-white/5 border border-white/10 hover:border-white/30 hover:bg-white/10 text-white px-8 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3 backdrop-blur-md">
                      <span className="material-symbols-outlined text-[20px]">home_work</span>
                      My Properties
                    </Link>
                  </>
                )}

                {user?.role === "investor" && (
                  <Link href="/explore" className="w-full sm:w-auto bg-[#00F0FF] hover:bg-[#00d0dd] text-black px-8 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,240,255,0.2)] hover:scale-105 active:scale-95 duration-300">
                    <span className="material-symbols-outlined text-[20px]">explore</span>
                    Explore Marketplace
                  </Link>
                )}

                {user?.role === "admin" && (
                  <Link href="/admin" className="w-full sm:w-auto bg-white/10 hover:bg-white/20 border border-white/20 text-white px-8 py-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:scale-105 active:scale-95 duration-300 backdrop-blur-md">
                    <span className="material-symbols-outlined text-[20px]">admin_panel_settings</span>
                    Admin Terminal
                  </Link>
                )}
              </div>
            </div>
            
            {/* Visual accent */}
            <div className="glass-panel rounded-3xl p-6 sm:p-8 flex flex-col gap-5 w-full max-w-sm lg:min-w-[320px] lg:w-auto mx-auto lg:mx-0 shadow-card relative transform lg:rotate-1 hover:rotate-0 transition-all duration-700 bg-gradient-to-br from-white/10 to-transparent border-t-white/20 border-l-white/20">
              <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-40 transition-opacity">
                <span className="material-symbols-outlined text-[64px] text-[#D4AF37]">architecture</span>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Network Status</p>
                <div className="flex items-center gap-3">
                  <div className="size-3 rounded-full bg-[#00F0FF] animate-pulse shadow-[0_0_12px_#00F0FF]" />
                  <span className="text-xl font-medium text-white heading-display tracking-wide">Solana Devnet</span>
                </div>
              </div>
              
              <div className="bg-black/40 rounded-xl border border-white/5 p-4 font-mono text-xs text-slate-400 mt-2 flex flex-col gap-2 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="flex justify-between items-center">
                  <span>Program ID</span>
                  <span className="text-white">Fg6P...sLnS</span>
                </div>
                <div className="h-px bg-white/5"></div>
                <div className="flex justify-between items-center">
                  <span>Block Height</span>
                  <span className="text-[#00F0FF]">342,918,221</span>
                </div>
              </div>
              
              <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                <span className="uppercase tracking-widest text-[10px]">Anchor Standard</span>
                <span className="text-[#00F0FF] bg-[#00F0FF]/10 border border-[#00F0FF]/20 px-3 py-1.5 rounded-lg font-mono">SPL-2022</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            <StatCard icon="domain"               label="Total Assets"        value={loading ? "—" : total}     accentColor="#ffffff" />
            <StatCard icon="gavel"                label="Pending Legal"       value={loading ? "—" : pending}   accentColor="#F59E0B" />
            <StatCard icon="verified"             label="Verified Deeds"      value={loading ? "—" : verified}  accentColor="#10B981" />
            <StatCard icon="token"                label="Tokenized"           value={loading ? "—" : tokenized} accentColor="#00F0FF" />
          </div>

          {/* How it works */}
          <div className="relative">
            <div className="flex flex-col items-start mb-8 md:mb-12">
              <div>
                <h2 className="text-4xl font-light text-white heading-display mb-3">Protocol Execution</h2>
                <p className="text-slate-400 font-light text-lg">The transparent process from real estate to digital tokens.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
              {/* Connecting line for desktop */}
              <div className="hidden lg:block absolute top-[48px] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              
              {[
                { step: "01", icon: "upload_file", title: "Document Hash", desc: "Upload property deeds. We compute a zero-knowledge proof of the document to store on-chain.", color: "text-[#D4AF37]" },
                { step: "02", icon: "policy", title: "Oracled Verification", desc: "Decentralized legal oracle cross-checks registry databases (RERA/Bhoomi) for authenticity.", color: "text-[#F59E0B]" },
                { step: "03", icon: "generating_tokens", title: "Token Generation", desc: "Mint fractional SPL Token-2022 standards representing compliant ownership shares.", color: "text-[#00F0FF]" },
                { step: "04", icon: "account_balance", title: "Yield Distribution", desc: "Automated smart contracts route rental yield proportionally to verified token holders.", color: "text-[#10B981]" },
              ].map(({ step, icon, title, desc, color }) => (
                <div key={step} className="glass-panel rounded-3xl p-8 space-y-6 hover:-translate-y-2 transition-all duration-300 relative group z-10 bg-gradient-to-b from-white/5 to-transparent">
                  <div className="flex justify-between items-start">
                    <div className="size-16 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shadow-inner group-hover:border-white/20 transition-colors">
                      <span className={`material-symbols-outlined text-[32px] ${color}`}>{icon}</span>
                    </div>
                    <span className="text-3xl font-light text-white/10 heading-display">{step}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-white mb-3 heading-display">{title}</h3>
                    <p className="text-sm text-slate-400 font-light leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Properties */}
          {recentProps.length > 0 && (
            <div className="pb-10">
              <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8 border-b border-white/10 pb-6">
                <div>
                <h2 className="text-3xl md:text-4xl font-light text-white heading-display mb-2 md:mb-3">Recent On-Chain Activity</h2>
                <p className="text-slate-400 font-light text-sm md:text-lg">The latest architectural assets brought on-chain.</p>
                </div>
                <Link href="/properties" className="text-xs md:text-sm text-[#D4AF37] hover:text-[#F3E5AB] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 group self-start md:self-auto md:mb-2 mt-2 md:mt-0">
                  View Registry <span className="material-symbols-outlined text-[16px] md:text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </Link>
              </div>
              
              <div className="glass-panel rounded-3xl overflow-hidden divide-y divide-white/5 shadow-card border-white/10">
                {recentProps.map((p) => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 px-6 sm:px-8 py-6 hover:bg-white/[0.04] transition-colors group cursor-pointer">
                    <div className="size-12 sm:size-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-white/30 transition-all shadow-inner">
                      <span className="material-symbols-outlined text-[22px] sm:text-[26px] text-[#D4AF37]">apartment</span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-medium text-white text-base sm:text-lg truncate mb-1 group-hover:text-[#D4AF37] transition-colors heading-display tracking-wide">{p.name}</p>
                      <p className="text-xs sm:text-sm text-slate-400 truncate font-light flex items-center gap-2">
                        <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-slate-500">location_on</span>
                        {p.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right hidden md:block">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Asset Status</p>
                        <span className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest inline-flex items-center gap-2 border shadow-inner ${
                          p.status === "verified"             ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20" :
                          p.status === "tokenized"            ? "bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/20" :
                          p.status === "pending_verification" ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20" :
                          "bg-white/5 text-slate-300 border-white/10"
                        }`}>
                          {p.status === "verified" && <span className="size-1.5 rounded-full bg-[#10B981] shadow-[0_0_5px_#10B981]"></span>}
                          {p.status === "tokenized" && <span className="size-2 rounded-full bg-[#00F0FF] shadow-[0_0_8px_#00F0FF]"></span>}
                          {p.status === "pending_verification" && <span className="size-1.5 rounded-full bg-[#F59E0B] animate-pulse"></span>}
                          {p.status.replace("_", " ")}
                        </span>
                      </div>
                      
                      <div className="md:hidden">
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border ${
                          p.status === "verified"             ? "bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20" :
                          p.status === "tokenized"            ? "bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/20" :
                          p.status === "pending_verification" ? "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20" :
                          "bg-white/5 text-slate-300 border-white/10"
                        }`}>
                          {p.status === "verified" && <span className="size-1.5 rounded-full bg-[#10B981]"></span>}
                          {p.status === "tokenized" && <span className="size-1.5 rounded-full bg-[#00F0FF]"></span>}
                          {p.status === "pending_verification" && <span className="size-1.5 rounded-full bg-[#F59E0B] animate-pulse"></span>}
                          {p.status.replace("_", " ")}
                        </span>
                      </div>
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
