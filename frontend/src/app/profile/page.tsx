"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { createUserProfile } from "@/lib/api";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { WalletProviders } from "@/components/WalletProviders";

function ProfilePageContent() {
  const { user, setUser } = useAuth();
  const { publicKey } = useWallet();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("investor");
  
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setRole(user.role || "investor");
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // We need either a connected wallet or an existing profile wallet (Clerk ID)
    const identifier = publicKey?.toBase58() || user?.wallet;

    if (!identifier) {
      setError("No identity detected. Please connect a wallet or sign in.");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const updatedUser = await createUserProfile({
        wallet: identifier,
        name,
        email,
        role,
      });
      
      setUser(updatedUser);
      setSuccess(true);
      
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sync protocol");
    } finally {
      setLoading(false);
    }
  };

  const isElevatedRole = user?.role === "admin" || user?.role === "verifier";

  return (
    <div className="flex-grow flex flex-col antialiased bg-[#0f1419] text-[#dee3ea] min-h-screen relative">
      <main className="flex-grow px-6 md:px-12 py-16 lg:py-24 relative z-10 w-full max-w-[1920px] mx-auto flex justify-center items-center">
        
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#d4af37]/5 blur-[150px] pointer-events-none rounded-full"></div>

        <div className="max-w-3xl w-full relative z-10">
          
          <div className="text-center mb-12">
             <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">
               Curator Profile
             </span>
             <h1 className="text-4xl md:text-5xl font-medium heading-display text-white mb-6">Identity Verification</h1>
             <p className="text-white/50 text-basis max-w-lg mx-auto leading-relaxed">
               Establish your identity on the ProofEstate protocol. Your digital signature allows access to exclusive asset registries and tokenized yields.
             </p>
          </div>

          <form onSubmit={handleSave} className="space-y-8">
            
            {/* Identity Card */}
            <div className="bg-[#171c21] rounded-[2rem] p-8 md:p-12 border border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
              <h3 className="text-[9px] font-bold text-[#d4af37] uppercase tracking-[0.2em] flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
                <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                Primary Protocol Identity
              </h3>

              <div className="space-y-8">
                <div>
                  <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-3">Address (Primary Key)</label>
                  <div className="bg-[#0a0e14] border border-white/5 rounded-xl px-5 py-4 font-mono text-[#d4af37]/70 text-xs tracking-widest break-all">
                    {publicKey ? publicKey.toBase58() : (user?.wallet || "UNVERIFIED_IDENTITY")}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="group">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-3 group-focus-within:text-[#d4af37] transition-colors">Legal Designation</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Wayne Enterprises"
                      className="w-full bg-transparent border-b border-white/20 text-white text-lg font-light pb-2 focus:outline-none focus:border-[#d4af37] transition-all placeholder:text-white/20"
                    />
                  </div>
                  
                  <div className="group">
                    <label className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-3 group-focus-within:text-[#d4af37] transition-colors">Contact Protocol</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="curator@domain.com"
                      className="w-full bg-transparent border-b border-white/20 text-white text-lg font-light pb-2 focus:outline-none focus:border-[#d4af37] transition-all placeholder:text-white/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Access Role */}
            <div className="bg-[#171c21] rounded-[2rem] p-8 md:p-12 border border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
               <h3 className="text-[9px] font-bold text-[#d4af37] uppercase tracking-[0.2em] flex items-center gap-3 mb-8 pb-4 border-b border-white/5">
                  <span className="material-symbols-outlined text-[16px]">security</span>
                  Authorization Level
               </h3>

              {isElevatedRole ? (
                <div className="bg-[#d4af37]/10 border border-[#d4af37]/20 rounded-xl p-6 flex flex-col md:flex-row items-start gap-4 shadow-sm">
                   <div className="size-12 rounded-full border border-[#d4af37]/40 flex items-center justify-center shrink-0">
                     <span className="material-symbols-outlined text-[20px] text-[#d4af37]">shield_locked</span>
                   </div>
                   <div>
                     <p className="text-[#d4af37] font-medium heading-display text-xl mb-1">Elevated Credentials Active</p>
                     <p className="text-white/60 text-sm leading-relaxed">Your identity operates at the <span className="font-bold text-white uppercase tracking-widest">{user?.role}</span> tier. Downgrades require multi-sig manual unbinding via the admin portal.</p>
                   </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Investor Toggle */}
                  <label className={`relative p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${role === 'investor' ? 'bg-[#d4af37]/5 border-[#d4af37]/40 shadow-[inset_0_0_20px_rgba(212,175,55,0.05)]' : 'bg-[#0a0e14] border-white/5 hover:border-white/20'}`}>
                    <input type="radio" name="role" value="investor" checked={role === "investor"} onChange={() => setRole("investor")} className="sr-only" />
                    <div className="flex items-center gap-4 mb-4 mt-2 px-2">
                       <span className={`material-symbols-outlined text-2xl transition-colors ${role === 'investor' ? 'text-[#d4af37]' : 'text-white/30'}`}>monitoring</span>
                       <p className={`text-xl font-medium heading-display transition-colors ${role === 'investor' ? 'text-white' : 'text-white/50'}`}>Retail Investor</p>
                    </div>
                    <p className="text-xs text-white/50 px-2 leading-relaxed">Access the private collection to acquire fractional shares of institutional-grade properties.</p>
                    
                    {role === 'investor' && (
                       <div className="absolute top-4 right-4 size-2 rounded-full bg-[#f2ca50] animate-pulse shadow-[0_0_10px_#f2ca50]"></div>
                    )}
                  </label>

                  {/* Owner Toggle */}
                  <label className={`relative p-6 rounded-2xl border cursor-pointer transition-all duration-300 ${role === 'owner' ? 'bg-[#d4af37]/5 border-[#d4af37]/40 shadow-[inset_0_0_20px_rgba(212,175,55,0.05)]' : 'bg-[#0a0e14] border-white/5 hover:border-white/20'}`}>
                    <input type="radio" name="role" value="owner" checked={role === "owner"} onChange={() => setRole("owner")} className="sr-only" />
                    <div className="flex items-center gap-4 mb-4 mt-2 px-2">
                       <span className={`material-symbols-outlined text-2xl transition-colors ${role === 'owner' ? 'text-[#d4af37]' : 'text-white/30'}`}>domain</span>
                       <p className={`text-xl font-medium heading-display transition-colors ${role === 'owner' ? 'text-white' : 'text-white/50'}`}>Property Originator</p>
                    </div>
                    <p className="text-xs text-white/50 px-2 leading-relaxed">Submit real-world assets into the protocol. Initialize verification and tokenization sequences.</p>
                    
                    {role === 'owner' && (
                       <div className="absolute top-4 right-4 size-2 rounded-full bg-[#f2ca50] animate-pulse shadow-[0_0_10px_#f2ca50]"></div>
                    )}
                  </label>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-xs text-red-400 flex items-center gap-3 font-bold">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl p-4 text-xs text-[#10B981] flex items-center gap-3 font-bold">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                Identity Synced. Authorization Complete.
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end items-center gap-6 pt-4">
              <Link href="/" className="text-white/40 hover:text-white transition-colors text-[9px] font-bold tracking-[0.2em] uppercase">
                Abort
              </Link>
              <button 
                type="submit" 
                disabled={loading || (!publicKey && !user)}
                className="w-full sm:w-auto btn-primary py-4 px-12 text-[10px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale hover:scale-[1.02] transition-transform"
              >
                {loading ? (
                  <><span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span> Securing...</>
                ) : (
                  <><span className="material-symbols-outlined text-[16px]">verified</span> Commit Identity</>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <WalletProviders>
      <ProfilePageContent />
    </WalletProviders>
  );
}
