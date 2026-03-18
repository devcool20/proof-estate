"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { createUserProfile } from "@/lib/api";
import { useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { WalletProviders } from "@/components/WalletProviders";
import { useTheme } from "@/lib/ThemeContext";

function ProfilePageContent() {
  const { user, setUser } = useAuth();
  const { publicKey } = useWallet();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
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
      
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const isElevatedRole = user?.role === "admin" || user?.role === "verifier";

  return (
    <div className="flex-grow flex flex-col antialiased min-h-screen relative" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <main className="flex-grow px-6 py-8 md:py-10 relative">
        <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-2xl mx-auto space-y-8 relative z-10">
          
          <div className={`flex flex-col gap-2 pb-5 ${isDark ? 'border-b border-white/5' : 'border-b border-slate-200'}`}>
            <h2 className="text-xl md:text-3xl font-bold tracking-tight heading-display" style={{ color: 'var(--text)' }}>Protocol Profile</h2>
            <p className="font-medium text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>Manage your identity and access level within the ProofEstate ecosystem.</p>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Identity Group */}
            <div className={`p-5 rounded-[20px] border shadow-sm space-y-5 ${isDark ? 'bg-[var(--bg-card)] border-white/5' : 'bg-white border-slate-200'}`}>
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <span className="material-symbols-outlined text-[16px]">fingerprint</span>
                Primary Identity
              </h3>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Wallet Address (Primary Key)</label>
                  <div className={`shadow-inner rounded-lg px-3 py-2.5 text-xs font-mono font-bold break-all cursor-not-allowed ${
                  isDark ? 'bg-white/5 border border-white/10 text-slate-400' : 'bg-slate-100 border border-slate-200 text-slate-500'
                }`}>
                    {publicKey ? publicKey.toBase58() : (user?.wallet || "No Identity Found")}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block group-focus-within:text-primary transition-colors">Legal Name / Entity</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="E.g. Wayne Enterprises"
                      className={`w-full h-10 px-3 border rounded-lg focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 placeholder:text-slate-400 font-medium text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${isDark ? 'bg-[var(--bg-input)] border-white/10 text-white hover:border-white/20' : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300 focus:bg-white'}`}
                    />
                  </div>
                  
                  <div className="space-y-1.5 group">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block group-focus-within:text-primary transition-colors">Contact Email</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className={`w-full h-10 px-3 border rounded-lg focus:border-primary/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all duration-300 placeholder:text-slate-400 font-medium text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${isDark ? 'bg-[var(--bg-input)] border-white/10 text-white hover:border-white/20' : 'bg-slate-50 border-slate-200 text-slate-900 hover:border-slate-300 focus:bg-white'}`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Access Level Group */}
            <div className={`p-5 rounded-[20px] border shadow-sm space-y-4 ${isDark ? 'bg-[var(--bg-card)] border-white/5' : 'bg-white border-slate-200'}`}>
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5 mb-2">
                <span className="material-symbols-outlined text-[16px]">security</span>
                Protocol Access Level
              </h3>
              
              {isElevatedRole ? (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
                   <span className="material-symbols-outlined text-[22px] text-primary">shield_locked</span>
                   <div>
                     <p className="text-slate-900 font-bold mb-0.5 tracking-wide text-sm">Elevated Role Active</p>
                     <p className="text-xs font-medium text-slate-600">Your account is currently assigned to the <span className="font-bold text-primary uppercase">{user?.role}</span> tier. This access level cannot be downgraded manually via this interface.</p>
                   </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Investor Toggle */}
                    <label className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 shadow-sm ${role === 'investor' ? 'border-[#10B981] bg-green-50 shadow-md' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'}`}>
                      <input type="radio" name="role" value="investor" checked={role === "investor"} onChange={() => setRole("investor")} className="sr-only" />
                      <div className={`size-9 rounded-full flex items-center justify-center shrink-0 border-[2px] shadow-sm ${role === 'investor' ? 'bg-white border-[#10B981] text-[#10B981]' : 'bg-white border-slate-200 text-slate-400'}`}>
                        <span className="material-symbols-outlined text-[18px]">monitoring</span>
                      </div>
                      <div>
                        <p className={`font-bold text-sm mb-0.5 ${role === 'investor' ? 'text-slate-900' : 'text-slate-600'}`}>Retail Investor</p>
                        <p className="text-[10px] font-medium text-slate-500 leading-relaxed">Access the global marketplace to purchase fractionalized property tokens.</p>
                      </div>
                    </label>

                    {/* Owner Toggle */}
                    <label className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3 shadow-sm ${role === 'owner' ? 'border-primary bg-blue-50 shadow-md' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'}`}>
                      <input type="radio" name="role" value="owner" checked={role === "owner"} onChange={() => setRole("owner")} className="sr-only" />
                      <div className={`size-9 rounded-full flex items-center justify-center shrink-0 border-[2px] shadow-sm ${role === 'owner' ? 'bg-white border-primary text-primary' : 'bg-white border-slate-200 text-slate-400'}`}>
                        <span className="material-symbols-outlined text-[18px]">domain</span>
                      </div>
                      <div>
                        <p className={`font-bold text-sm mb-0.5 ${role === 'owner' ? 'text-slate-900' : 'text-slate-600'}`}>Property Owner</p>
                        <p className="text-[10px] font-medium text-slate-500 leading-relaxed">Submit real-world assets for on-chain verification and fractionalization.</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-600 flex gap-3 mb-6 font-bold shadow-sm">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-xs text-[#10B981] flex gap-3 mb-6 font-bold shadow-sm">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                Profile updated successfully. Protocol synchronization complete.
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2 mt-6">
              <Link href="/" className={`w-full sm:w-auto px-5 py-2.5 rounded-lg border-2 font-bold uppercase tracking-widest text-[11px] transition-all shadow-sm active:scale-95 text-center order-2 sm:order-1 ${
                isDark ? 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}>
                Cancel
              </Link>
              <button 
                type="submit" 
                disabled={loading || (!publicKey && !user)}
                className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white rounded-lg font-bold uppercase tracking-widest text-[11px] hover:bg-primary-light transition-all duration-300 shadow-[0_4px_14px_rgba(17,107,251,0.39)] hover:shadow-[0_6px_20px_rgba(17,107,251,0.23)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 disabled:shadow-none order-1 sm:order-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                    Committing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">save</span>
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

export default function ProfilePage() {
  return (
    <WalletProviders>
      <ProfilePageContent />
    </WalletProviders>
  );
}
