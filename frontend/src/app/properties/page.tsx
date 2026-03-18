"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { listProperties, type Property } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";

const STATUS_LABEL: Record<string, { label: string; color: string; icon: string; shadow: string }> = {
  draft:                { label: "Draft",        color: "text-slate-600 border-slate-200 bg-slate-100", icon: "draft", shadow: "" },
  pending_verification: { label: "Under Review", color: "text-[#F59E0B] border-[#F59E0B]/20 bg-[#F59E0B]/10", icon: "hourglass_empty", shadow: "shadow-sm" },
  verified:             { label: "Verified",     color: "text-[#10B981] border-[#10B981]/20 bg-[#10B981]/10", icon: "verified_user", shadow: "shadow-sm" },
  pending_tokenization: { label: "Tokenizing",   color: "text-primary border-primary/20 bg-primary/10", icon: "hourglass_top", shadow: "shadow-sm" },
  tokenized:            { label: "Tokenized",    color: "text-primary border-primary/20 bg-primary/10", icon: "generating_tokens", shadow: "shadow-md" },
  rejected:             { label: "Rejected",     color: "text-red-600 border-red-500/20 bg-red-500/10", icon: "cancel", shadow: "" },
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
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? 'bg-[var(--bg-card)] border-white/5' : 'bg-white border-slate-200';
  const surface = isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100';

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
    <div className="flex-grow flex flex-col font-sans relative min-h-screen" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <main className="flex-grow px-6 py-8 md:py-10 relative">
        <div className="max-w-6xl mx-auto space-y-8 relative z-10">
          
          {/* Header */}
          <div className={`flex flex-col md:flex-row justify-between items-start md:items-end gap-4 p-5 rounded-2xl shadow-sm border ${card}`}>
            <div className="space-y-1.5">
              <h2 className="text-xl md:text-3xl font-bold tracking-tight heading-display" style={{ color: 'var(--text)' }}>Asset Registry</h2>
              <p className="font-medium text-xs md:text-sm max-w-xl" style={{ color: 'var(--text-secondary)' }}>Manage your real estate portfolio — from initial deed submission through global tokenization.</p>
            </div>
            <Link
              href="/verify"
              className="w-full md:w-auto px-5 py-2.5 bg-primary text-white rounded-lg font-bold uppercase tracking-widest text-[11px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add_circle</span>
              Register New Asset
            </Link>
          </div>

          {/* Status legend */}
          <div className="flex flex-wrap gap-2 px-1">
            {Object.entries(STATUS_LABEL).map(([key, { label, color, icon, shadow }]) => (
              <span key={key} className={`px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-widest flex items-center gap-1.5 ${color} ${shadow}`}>
                <span className="material-symbols-outlined text-[12px]">{icon}</span>
                {label}
              </span>
            ))}
          </div>

          {/* Content */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`rounded-[24px] overflow-hidden shadow-sm border block animate-pulse ${card}`}>
                  <div className="h-56 w-full bg-slate-200/60 object-cover" />
                  <div className="p-6 md:p-8 flex flex-col flex-grow gap-6">
                    <div className="space-y-3">
                      <div className="h-6 w-3/4 bg-slate-200/60 rounded" />
                      <div className="h-4 w-1/2 bg-slate-200/60 rounded" />
                    </div>
                    <div className="h-24 w-full bg-slate-200/60 rounded-2xl" />
                    <div className="mt-auto pt-2">
                      <div className="h-14 w-full bg-slate-200/60 rounded-xl" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-600 flex items-center gap-4 shadow-sm">
              <span className="material-symbols-outlined text-[32px]">error</span>
              <div>
                <p className="font-bold uppercase tracking-widest text-xs mb-1">Backend Connection Error</p>
                <p className="text-sm font-medium">Could not connect to the indexing node: <code className="text-xs bg-red-100 px-2 py-1 rounded">{error}</code>.</p>
              </div>
            </div>
          )}

          {!loading && !error && properties.length === 0 && (
            <div className={`rounded-2xl border p-12 flex flex-col items-center text-center gap-5 shadow-sm ${card}`}>
              <div className={`size-16 rounded-full border flex items-center justify-center ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                <span className="material-symbols-outlined text-3xl" style={{ color: 'var(--text-muted)' }}>home_work</span>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold heading-display" style={{ color: 'var(--text)' }}>Registry Empty</h3>
                <p className="font-medium max-w-sm mx-auto text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>No validated assets found under this principal identity. Initialize your first tokenization protocol.</p>
              </div>
              <Link href="/verify" className="px-6 py-2.5 border-2 border-primary text-primary hover:bg-primary hover:text-white rounded-lg font-bold uppercase tracking-widest text-[11px] transition-all shadow-sm">
                Initialize Asset
              </Link>
            </div>
          )}

          {!loading && !error && properties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {properties.map((prop, i) => {
                const st = STATUS_LABEL[prop.status] || STATUS_LABEL["draft"];
                return (
                  <div key={prop.id} className={`rounded-[16px] shadow-sm border overflow-hidden flex flex-col group transition-all hover:-translate-y-0.5 ${card} hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] ${isDark ? 'hover:border-white/15' : 'hover:border-slate-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]'}`}>
                    {/* Visual representation */}
                    <div className="h-40 w-full relative overflow-hidden bg-slate-100">
                       <img 
                          src={prop.images && prop.images.length > 0 ? prop.images[0] : `https://images.unsplash.com/photo-${[
                            '1600596542815-ffad4c1539a9', // mansion
                            '1512917774080-9991f1c4c750', // home interior
                            '1600607687920-4e2a868f0bbb', // modern exterior
                            '1512917774080-9991f1c4c750', // kitchen
                            '1600607687920-4e2a868f0bbb', // modern house
                            '1600596542815-ffad4c1539a9'  // luxury
                          ][i % 6]}?q=80&w=600&auto=format&fit=crop`}
                          alt={prop.name}
                          onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=600"; }}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 bg-slate-100" 
                        />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-80" />
                       
                       <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                         <span className="px-2 py-1 bg-white/90 backdrop-blur-md border border-slate-200 rounded-md text-[9px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1 shadow-sm">
                           <span className="material-symbols-outlined text-[12px] text-primary">domain</span>
                           {prop.property_type?.replace("_", " ") ?? "Property"}
                         </span>
                         <span className={`px-2 py-1 rounded-md border text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 backdrop-blur-md bg-white ${st.color} ${st.shadow}`}>
                           <span className="material-symbols-outlined text-[12px]">{st.icon}</span>
                           {st.label}
                         </span>
                       </div>
                    </div>

                    {/* Meta Body */}
                    <div className="p-4 flex flex-col flex-grow gap-4 relative">
                      <div className="space-y-1">
                        <h3 className="text-sm font-bold leading-tight heading-display group-hover:text-primary transition-colors" style={{ color: 'var(--text)' }}>{prop.name}</h3>
                        <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          <p className="text-xs font-medium truncate">{prop.address}</p>
                        </div>
                      </div>

                      <div className={`grid grid-cols-2 gap-4 rounded-xl p-3 border ${surface}`}>
                          <div className="space-y-0.5">
                            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Asset Value</p>
                            <p className="text-sm font-bold" style={{ color: 'var(--text)' }}>{prop.token_price_usd ? `$${prop.token_price_usd}` : formatInr(prop.asset_value_inr)}</p>
                          </div>
                          <div className="space-y-0.5 text-right">
                            <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>Ownership</p>
                            <p className="text-sm font-bold text-primary">100%</p>
                        </div>
                      </div>

                      {(prop.metadata_hash || prop.token_mint) && (
                        <div className={`space-y-3 py-4 border-y ${isDark ? 'border-white/5' : 'border-slate-100'}`}>
                          {prop.metadata_hash && (
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>ZK.PROOF</span>
                              <span className="font-bold max-w-[150px] truncate px-2 py-1 rounded" style={{ color: 'var(--text)', backgroundColor: 'var(--bg-surface)' }}>{prop.metadata_hash}</span>
                            </div>
                          )}
                          {prop.token_mint && (
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-primary font-bold uppercase tracking-widest">SPL.MINT</span>
                              <span className="text-primary/80 bg-primary/10 px-2 py-1 rounded truncate max-w-[150px]">{prop.token_mint}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Execution CTA */}
                      <div className="mt-auto pt-2">
                        {prop.status === "verified" && (
                          <Link
                            href={`/tokenize?id=${prop.id}`}
                            className="w-full py-4 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                          >
                            <span className="material-symbols-outlined text-[20px]">generating_tokens</span>
                            Initialize Tokenization
                          </Link>
                        )}
                        {prop.status === "tokenized" && (
                          <div className="w-full py-4 bg-green-50 border border-green-200 text-green-700 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">verified</span>
                            Trading Live on Solana
                          </div>
                        )}
                        {prop.status === "pending_tokenization" && (
                          <div className="w-full py-4 bg-blue-50 border border-blue-200 text-primary rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 animate-pulse shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
                            Tokenization in Progress
                          </div>
                        )}
                        {prop.status === "pending_verification" && (
                          <div className="w-full py-4 bg-amber-50 border border-amber-200 text-amber-600 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">lock_clock</span>
                            Registry Verification
                          </div>
                        )}
                        {prop.status === "rejected" && (
                          <div className="w-full py-4 bg-red-50 border border-red-200 text-red-600 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">error</span>
                            Validation Failed
                          </div>
                        )}
                        {prop.status === "draft" && (
                          <div className="w-full py-4 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-[11px] flex items-center justify-center gap-2 shadow-sm">
                            <span className="material-symbols-outlined text-[20px]">draft</span>
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
