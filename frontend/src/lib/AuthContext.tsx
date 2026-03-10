"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { User, getUserProfile, createUserProfile } from "./api";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
    setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: false, refreshUser: async () => {}, setUser: () => {} });

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { isLoaded, isSignedIn, user: clerkUser } = useUser();
    const { signOut } = useClerk();
    
    // DB user state
    const [dbUser, setDbUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);
    
    // UI state for showing the registration modal
    const [showRegistration, setShowRegistration] = useState(false);
    const [regRole, setRegRole] = useState<"owner" | "investor">("investor");
    const [regName, setRegName] = useState("");
    const [regLoading, setRegLoading] = useState(false);

    const normalizeRole = (role?: string): "owner" | "investor" | "verifier" | "admin" => {
        const normalized = (role || "").trim().toLowerCase();
        if (normalized === "owner" || normalized === "investor" || normalized === "verifier" || normalized === "admin") {
            return normalized;
        }
        return "investor";
    };

    const fetchUser = async (clerkId: string) => {
        setLoading(true);
        console.log("🔍 AuthContext: Fetching user profile for:", clerkId);
        try {
            const profile = await getUserProfile(clerkId);
            console.log("🔍 AuthContext: Received profile:", profile);
            if (profile) {
                const normalizedProfile: User = {
                    ...profile,
                    role: normalizeRole(profile.role),
                };
                setDbUser(normalizedProfile);
                if (normalizedProfile.role === "owner" || normalizedProfile.role === "investor") {
                    setRegRole(normalizedProfile.role);
                }
                setShowRegistration(false);
            } else {
                console.log("🔍 AuthContext: user not found, showing registration");
                setDbUser(null);
                setShowRegistration(true);
            }
        } catch (e: any) {
            console.error("🔍 AuthContext: Failed to fetch DB user profile:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        if (!clerkUser) return;
        setRegLoading(true);
        console.log("👤 AuthContext: Starting registration for:", clerkUser.id, regRole, regName);
        try {
            const email = clerkUser.primaryEmailAddress?.emailAddress || "";
            const newUser = await createUserProfile({
                wallet: clerkUser.id,
                name: regName,
                email: email,
                role: regRole,
            });
            console.log("👤 AuthContext: Registration success:", newUser);
            setDbUser({ ...newUser, role: normalizeRole(newUser.role) });
            setShowRegistration(false);
        } catch (e) {
            console.error("👤 AuthContext: Registration failed", e);
            alert("Registration failed. Please try again.");
        } finally {
            setRegLoading(false);
        }
    };

    const handleCancelRegistration = () => {
        signOut();
        setShowRegistration(false);
    };

    useEffect(() => {
        if (isLoaded) {
            if (isSignedIn && clerkUser) {
                // Pre-fill name from clerk
                setRegName(clerkUser.fullName || "");
                fetchUser(clerkUser.id);
            } else {
                setDbUser(null);
                setShowRegistration(false);
            }
        }
    }, [isLoaded, isSignedIn, clerkUser]);

    // Dynamically update the app theme based on user role
    useEffect(() => {
        if (typeof document !== "undefined") {
            if (isLoaded && !isSignedIn) {
                document.documentElement.setAttribute("data-theme", "mixed");
            } else {
                const activeRole = dbUser ? dbUser.role : regRole;
                if (activeRole === "investor") {
                    document.documentElement.setAttribute("data-theme", "investor");
                } else {
                    document.documentElement.removeAttribute("data-theme");
                }
            }
        }
    }, [dbUser?.role, regRole, isLoaded, isSignedIn]);

    const fallbackUser: User | null = isLoaded && isSignedIn && clerkUser && !loading
        ? {
            wallet: clerkUser.id,
            name: clerkUser.fullName || undefined,
            email: clerkUser.primaryEmailAddress?.emailAddress || undefined,
            role: regRole,
            created_at: new Date().toISOString(),
        }
        : null;

    const effectiveUser = dbUser ?? fallbackUser;

    return (
        <AuthContext.Provider value={{ user: effectiveUser, loading, refreshUser: async () => { if (clerkUser) await fetchUser(clerkUser.id); }, setUser: setDbUser }}>
            {children}
            
            {showRegistration && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="glass-panel border-white/10 rounded-3xl p-8 max-w-md w-full shadow-[0_0_40px_rgba(var(--color-primary-rgb),0.1)] relative">
                        <h2 className="text-3xl heading-display font-light text-white mb-2">Initialize Profile</h2>
                        <p className="text-slate-400 font-light mb-8 text-sm">Configure your principal identity for protocol tracking.</p>
                        
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3">Protocol Role</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setRegRole("investor")}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all group ${regRole === "investor" ? "border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] shadow-[0_0_15px_rgba(0,240,255,0.15)]" : "border-white/5 bg-black/40 text-slate-500 hover:border-white/20"}`}
                                    >
                                        <span className="material-symbols-outlined text-[24px]">monitoring</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Investor</span>
                                    </button>
                                    <button 
                                        onClick={() => setRegRole("owner")}
                                        className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all group ${regRole === "owner" ? "border-primary/30 bg-primary/10 text-primary shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.15)]" : "border-white/5 bg-black/40 text-slate-500 hover:border-white/20"}`}
                                    >
                                        <span className="material-symbols-outlined text-[24px]">domain</span>
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Owner</span>
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Legal Entity / Name</label>
                                <input 
                                    type="text" 
                                    value={regName}
                                    onChange={(e) => setRegName(e.target.value)}
                                    className="w-full h-12 px-5 border border-white/10 rounded-xl bg-black/40 focus:bg-white/5 focus:border-primary outline-none transition-all text-white font-light text-sm"
                                    placeholder="Entity Name"
                                />
                            </div>
                            
                            <div className="flex gap-3 mt-8 pt-4 border-t border-white/5">
                                <button
                                    onClick={handleCancelRegistration}
                                    className="w-1/3 py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-widest text-[10px] transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleRegister}
                                    disabled={regLoading || !regName.trim()}
                                    className="w-2/3 py-4 rounded-xl bg-gradient-to-r from-primary to-primary-light shadow-glow text-black font-bold uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 transition-all flex justify-center items-center"
                                >
                                    {regLoading ? "Initializing..." : "Commit Profile"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
}
