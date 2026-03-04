"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { User, getUserProfile, createUserProfile } from "./api";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: false, refreshUser: async () => {} });

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

    const fetchUser = async (clerkId: string) => {
        setLoading(true);
        console.log("🔍 AuthContext: Fetching user profile for:", clerkId);
        try {
            const profile = await getUserProfile(clerkId);
            console.log("🔍 AuthContext: Received profile:", profile);
            if (profile) {
                setDbUser(profile);
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
            setDbUser(newUser);
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

    return (
        <AuthContext.Provider value={{ user: dbUser, loading, refreshUser: async () => { if (clerkUser) await fetchUser(clerkUser.id); } }}>
            {children}
            
            {showRegistration && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Create Profile</h2>
                        <p className="text-slate-500 mb-6 text-sm">Tell us how you want to use ProofEstate.</p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">I am a...</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        onClick={() => setRegRole("investor")}
                                        className={`p-3 rounded-xl border-2 font-semibold flex flex-col items-center gap-2 transition-all ${regRole === "investor" ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-500 hover:border-slate-300"}`}
                                    >
                                        <span className="material-symbols-outlined text-[24px]">trending_up</span>
                                        Investor
                                    </button>
                                    <button 
                                        onClick={() => setRegRole("owner")}
                                        className={`p-3 rounded-xl border-2 font-semibold flex flex-col items-center gap-2 transition-all ${regRole === "owner" ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-500 hover:border-slate-300"}`}
                                    >
                                        <span className="material-symbols-outlined text-[24px]">home_work</span>
                                        Owner
                                    </button>
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-1">Name / Organization</label>
                                <input 
                                    type="text" 
                                    value={regName}
                                    onChange={(e) => setRegName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-slate-50"
                                    placeholder="Enter your name"
                                />
                            </div>
                            
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={handleCancelRegistration}
                                    className="w-1/3 py-3.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleRegister}
                                    disabled={regLoading || !regName.trim()}
                                    className="w-2/3 py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {regLoading ? "Saving..." : "Create Profile"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
}
