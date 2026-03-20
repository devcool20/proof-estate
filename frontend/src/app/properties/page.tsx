import Link from "next/link";
import { useState, useEffect } from "react";
import { listProperties, type Property } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";

const STATUS_LABEL: Record<string, { label: string; color: string; icon: string; }> = {
  draft:                { label: "Draft",        color: "text-white/50 border-white/10 bg-white/5", icon: "draft" },
  pending_verification: { label: "Under Review", color: "text-[#f2ca50] border-[#f2ca50]/20 bg-[#f2ca50]/10", icon: "hourglass_empty" },
  verified:             { label: "Verified",     color: "text-[#10B981] border-[#10B981]/20 bg-[#10B981]/10", icon: "verified_user" },
  pending_tokenization: { label: "Tokenizing",   color: "text-[#d4af37] border-[#d4af37]/20 bg-[#d4af37]/10", icon: "hourglass_top" },
  tokenized:            { label: "Tokenized",    color: "text-[#d4af37] border-[#d4af37]/20 bg-[#d4af37]/10", icon: "generating_tokens" },
  rejected:             { label: "Rejected",     color: "text-red-400 border-red-500/20 bg-red-500/10", icon: "cancel" },
};

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
    <div className="flex-grow flex flex-col antialiased bg-[#0f1419] text-[#dee3ea] min-h-screen">
      
      {/* Cinematic Header */}
      <div className="relative border-b border-white/5 bg-[#0f1419]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#d4af37]/5 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-white/5 rounded-full blur-[100px]"></div>
        </div>
        
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 lg:px-24 py-16 relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          <div>
             <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">
               The Digital Vault
             </span>
             <h1 className="text-4xl md:text-5xl font-medium heading-display text-white mb-4">Asset Portfolio</h1>
             <p className="text-white/50 text-sm max-w-xl leading-relaxed">
               Manage your verified real estate holdings. Monitor valuations, track fractional yields, and initialize tokenization protocols for new submissions.
             </p>
          </div>
          <Link
            href="/verify"
            className="btn-primary py-3.5 px-8 text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-3"
          >
            Register New Asset <span className="material-symbols-outlined text-[14px]">add</span>
          </Link>
        </div>
      </div>

      <main className="flex-grow px-6 md:px-12 lg:px-24 py-16">
        <div className="max-w-[1400px] mx-auto relative z-10">
          
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[400px] rounded-[1.5rem] bg-[#171c21] border border-white/5 animate-pulse"></div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-[1.5rem] p-8 text-center">
              <span className="material-symbols-outlined text-red-400 text-4xl mb-4">error</span>
              <p className="text-red-400 font-medium">Failed to establish secure connection to the registry.</p>
              <code className="text-xs bg-black/40 px-3 py-1.5 rounded-lg mt-4 inline-block text-white/50">{error}</code>
            </div>
          )}

          {!loading && !error && properties.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 border border-white/5 rounded-[2rem] bg-[#171c21]">
              <div className="w-20 h-20 rounded-full bg-[#0f1419] border border-white/10 flex items-center justify-center mb-6 shadow-[inset_0_2px_10px_rgba(255,255,255,0.02)]">
                <span className="material-symbols-outlined font-light text-[#d4af37] text-3xl">account_balance</span>
              </div>
              <h3 className="text-2xl font-medium heading-display text-white mb-3">Your Vault is Empty</h3>
              <p className="text-white/40 text-sm max-w-sm text-center mb-8">You have not registered any real-world assets into the protocol yet.</p>
              <Link href="/verify" className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase border-b border-[#d4af37]/30 hover:border-[#d4af37] pb-1 transition-colors">
                Initialize First Asset
              </Link>
            </div>
          )}

          {!loading && !error && properties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((prop, i) => {
                const st = STATUS_LABEL[prop.status] || STATUS_LABEL["draft"];
                return (
                  <div key={prop.id} className="group bg-[#171c21] rounded-[1.5rem] border border-white/5 overflow-hidden transition-all duration-500 hover:border-white/15 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:bg-[#1a2027]">
                    
                    {/* Visual */}
                    <div className="h-[220px] w-full relative overflow-hidden bg-[#0f1419]">
                       <img 
                          src={prop.images && prop.images.length > 0 ? prop.images[0] : "https://images.unsplash.com/photo-1600607687920-4e2a868f0bbb?q=80&w=800&auto=format&fit=crop"}
                          alt={prop.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.2s] mix-blend-luminosity opacity-80" 
                        />
                       <div className="absolute inset-0 bg-gradient-to-t from-[#171c21] via-transparent to-transparent"></div>
                       
                       <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                         <span className="px-3 py-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-[9px] font-bold text-white uppercase tracking-widest">
                           {prop.property_type?.replace("_", " ") ?? "Estate"}
                         </span>
                         <span className={`px-3 py-1.5 rounded-full border text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 backdrop-blur-md ${st.color}`}>
                           <span className="material-symbols-outlined text-[12px]">{st.icon}</span>
                           {st.label}
                         </span>
                       </div>
                    </div>

                    {/* Details */}
                    <div className="p-8 flex flex-col gap-6">
                      <div>
                        <h3 className="text-xl font-medium heading-display text-white mb-2">{prop.name}</h3>
                        <div className="flex items-center gap-2 text-white/50 text-xs">
                          <span className="material-symbols-outlined text-[14px]">location_on</span>
                          <p className="truncate">{prop.address || "Unspecified Location"}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-bold tracking-widest uppercase text-[#d4af37] mb-1">Valuation</p>
                            <p className="text-lg font-medium text-white">{prop.token_price_usd ? `$${prop.token_price_usd.toLocaleString()}` : "Pending"}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-bold tracking-widest uppercase text-[#d4af37] mb-1">Ownership</p>
                            <p className="text-lg font-medium text-white">100%</p>
                        </div>
                      </div>

                      {(prop.metadata_hash || prop.token_mint) && (
                        <div className="space-y-3 pt-6 border-t border-white/5">
                          {prop.metadata_hash && (
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-bold uppercase tracking-widest text-white/40">ZK.PROOF</span>
                              <span className="font-mono text-[#dee3ea] bg-white/5 px-2.5 py-1 rounded truncate max-w-[120px]">{prop.metadata_hash}</span>
                            </div>
                          )}
                          {prop.token_mint && (
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="font-bold uppercase tracking-widest text-[#d4af37]">SPL.MINT</span>
                              <span className="font-mono text-[#d4af37] bg-[#d4af37]/10 px-2.5 py-1 rounded truncate max-w-[120px]">{prop.token_mint}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action */}
                      <div className="pt-4">
                        {prop.status === "verified" && (
                          <Link
                            href={`/tokenize?id=${prop.id}`}
                            className="w-full btn-primary py-3.5 text-[10px] uppercase font-bold tracking-[0.2em] flex items-center justify-center gap-2"
                          >
                            Initialize Contract <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                          </Link>
                        )}
                        {prop.status === "tokenized" && (
                          <div className="w-full py-3.5 bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[14px]">verified</span>
                            Trading Live on Solana
                          </div>
                        )}
                        {prop.status === "pending_tokenization" && (
                          <div className="w-full py-3.5 bg-white/5 border border-white/10 text-white/50 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2 animate-pulse">
                            Tokenization in Progress
                          </div>
                        )}
                        {prop.status === "pending_verification" && (
                          <div className="w-full py-3.5 bg-white/5 border border-white/10 text-white/50 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                            Registry Verification
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
