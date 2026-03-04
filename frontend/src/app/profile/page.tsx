"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { createUserProfile, getUserProfile, type User } from "@/lib/api";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { publicKey } = useWallet();
  const router = useRouter();
  
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
      // The backend creates an upsert
      const updatedUser = await createUserProfile({
        wallet: identifier,
        name,
        email,
        role,
      });
      
      setUser(updatedUser);
      setSuccess(true);
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const isElevatedRole = user?.role === "admin" || user?.role === "verifier";

  return (
    <div className="flex-grow flex flex-col antialiased text-slate-300 relative">
      <main className="flex-grow px-6 py-12 md:py-16 relative">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-3xl mx-auto space-y-12 relative z-10">
          
          <div className="flex flex-col gap-2 border-b border-white/5 pb-8">
            <h2 className="text-3xl md:text-4xl font-light text-white tracking-tight heading-display">Protocol Profile</h2>
            <p className="text-slate-400 font-light text-base md:text-lg">Manage your identity and access level within the ProofEstate ecosystem.</p>
          </div>

          <form onSubmit={handleSave} className="space-y-8">
            
            {/* Identity Group */}
            <div className="glass-panel p-8 rounded-3xl border-white/10 space-y-6">
              <h3 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                Primary Identity
              </h3>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Wallet Address (Primary Key)</label>
                  <div className="bg-black/40 border border-white/5 rounded-xl px-5 py-4 text-sm font-mono text-slate-400 break-all cursor-not-allowed">
                    {publicKey ? publicKey.toBase58() : (user?.wallet || "No Identity Found")}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block group-focus-within:text-[#D4AF37] transition-colors">Legal Name / Entity</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="E.g. Wayne Enterprises"
                      className="w-full h-12 px-5 border border-white/10 rounded-xl bg-black/40 focus:bg-white/5 focus:border-[#D4AF37] outline-none transition-all text-white font-light text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block group-focus-within:text-[#D4AF37] transition-colors">Contact Email</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className="w-full h-12 px-5 border border-white/10 rounded-xl bg-black/40 focus:bg-white/5 focus:border-[#D4AF37] outline-none transition-all text-white font-light text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Access Level Group */}
            <div className="glass-panel p-8 rounded-3xl border-white/10 space-y-6">
              <h3 className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[16px]">security</span>
                Protocol Access Level
              </h3>
              
              {isElevatedRole ? (
                <div className="bg-white/5 border border-[#D4AF37]/30 rounded-xl p-6 flex items-start gap-4">
                   <span className="material-symbols-outlined text-[24px] text-[#D4AF37]">shield_locked</span>
                   <div>
                     <p className="text-white font-medium mb-1 tracking-wide">Elevated Role Active</p>
                     <p className="text-sm font-light text-slate-400">Your account is currently assigned to the <span className="font-bold text-[#D4AF37] uppercase">{user?.role}</span> tier. This access level cannot be downgraded manually via this interface.</p>
                   </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Investor Toggle */}
                    <label className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${role === 'investor' ? 'border-[#00F0FF] bg-[#00F0FF]/5 shadow-[0_0_20px_rgba(0,240,255,0.1)]' : 'border-white/5 bg-black/40 hover:border-white/20'}`}>
                      <input 
                        type="radio" 
                        name="role" 
                        value="investor" 
                        checked={role === "investor"} 
                        onChange={() => setRole("investor")} 
                        className="sr-only" 
                      />
                      <div className={`size-10 rounded-full flex items-center justify-center shrink-0 border ${role === 'investor' ? 'bg-[#00F0FF]/10 border-[#00F0FF]/30 text-[#00F0FF]' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                        <span className="material-symbols-outlined text-[20px]">monitoring</span>
                      </div>
                      <div>
                        <p className={`font-medium mb-1 ${role === 'investor' ? 'text-white' : 'text-slate-400'}`}>Retail Investor</p>
                        <p className="text-[10px] font-light text-slate-500 leading-relaxed">Access the global marketplace to purchase fractionalized property tokens (SPL-Token22).</p>
                      </div>
                    </label>

                    {/* Owner Toggle */}
                    <label className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-4 ${role === 'owner' ? 'border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_0_20px_rgba(212,175,55,0.1)]' : 'border-white/5 bg-black/40 hover:border-white/20'}`}>
                      <input 
                        type="radio" 
                        name="role" 
                        value="owner" 
                        checked={role === "owner"} 
                        onChange={() => setRole("owner")} 
                        className="sr-only" 
                      />
                      <div className={`size-10 rounded-full flex items-center justify-center shrink-0 border ${role === 'owner' ? 'bg-[#D4AF37]/10 border-[#D4AF37]/30 text-[#D4AF37]' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                        <span className="material-symbols-outlined text-[20px]">domain</span>
                      </div>
                      <div>
                        <p className={`font-medium mb-1 ${role === 'owner' ? 'text-white' : 'text-slate-400'}`}>Property Owner</p>
                        <p className="text-[10px] font-light text-slate-500 leading-relaxed">Submit real-world assets for on-chain verification and protocol-managed fractionalization.</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="glass-panel border-red-500/20 bg-red-500/5 rounded-2xl p-4 text-red-400 flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined">error</span>
                {error}
              </div>
            )}
            
            {success && (
              <div className="glass-panel border-[#10B981]/20 bg-[#10B981]/5 rounded-2xl p-4 text-[#10B981] flex items-center gap-3 text-sm">
                <span className="material-symbols-outlined">check_circle</span>
                Profile updated successfully. Protocol synchronization complete.
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-4">
              <Link href="/" className="w-full sm:w-auto px-6 py-4 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-xs transition-colors text-center order-2 sm:order-1">
                Cancel
              </Link>
              <button 
                type="submit" 
                disabled={loading || (!publicKey && !user)}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-[#D4AF37] to-[#F3E5AB] text-black rounded-xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 order-1 sm:order-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
                    Committing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Sync to Protocol
                  </>
                )}
              </button>
            </div>
            
          </form>
        </div>
      </main>
    </div>
  );
}
