"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { WalletConnectButton } from './WalletButton';
import { useAuth } from '../lib/AuthContext';
import { SignInButton, Show, UserButton } from '@clerk/nextjs';

export function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-white/5 bg-black/40 backdrop-blur-xl px-4 md:px-10 py-4 sticky top-0 z-[60] shadow-subtle">
      <div className="flex items-center gap-4 md:gap-8">
        {/* Mobile Menu Toggle */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden size-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
        </button>

        <Link href="/" className="flex items-center group -ml-1 lg:-ml-2">
          <h2 className="text-[#D4AF37] text-xl md:text-2xl heading-display font-medium leading-tight tracking-wide transition-transform origin-left group-hover:scale-105">ProofEstate</h2>
        </Link>
        <div className="hidden lg:flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 shadow-inner">
          <NavLinks pathname={pathname} user={user} />
        </div>
      </div>
      
      <div className="flex items-center gap-3 md:gap-4">
        <label className="hidden md:flex items-center min-w-48 h-10 max-w-64 relative group">
          <span className="absolute left-3 text-slate-400 material-symbols-outlined text-[20px] transition-colors group-focus-within:text-[#D4AF37]">search</span>
          <input className="w-full h-full rounded-xl text-sm bg-white/5 border border-white/10 pl-10 pr-4 text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]/50 transition-all placeholder:text-slate-500 shadow-inner" placeholder="Search portfolio..." />
        </label>
        
        <Show when="signed-in">
          <div className="flex items-center gap-2 md:gap-3">
            <WalletConnectButton />
            <UserButton 
              appearance={{
                elements: { 
                  userButtonAvatarBox: "h-9 w-9 md:h-10 md:w-10 border border-white/20 cursor-pointer shadow-glow hover:scale-105 transition-transform rounded-full bg-transparent overflow-hidden",
                  userButtonTrigger: "focus:shadow-none focus:outline-none bg-transparent active:bg-transparent hover:bg-transparent p-0 border-none",
                }
              }}
            >
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Protocol Settings"
                  labelIcon={<span className="material-symbols-outlined text-[16px] text-[#D4AF37]">manage_accounts</span>}
                  href="/profile"
                />
              </UserButton.MenuItems>
            </UserButton>
          </div>
        </Show>

        <Show when="signed-out">
          <SignInButton mode="modal">
            <button className="h-9 md:h-10 px-4 md:px-6 font-medium text-xs md:text-sm rounded-xl bg-[#D4AF37] text-black hover:bg-[#b08d24] transition-all shadow-glow hover:scale-[1.02] active:scale-[0.98]">
              Sign In
            </button>
          </SignInButton>
        </Show>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[73px] z-50 bg-black/60 backdrop-blur-md">
          <div className="bg-black/90 border-b border-white/10 p-6 flex flex-col gap-4 animate-in slide-in-from-top duration-300">
            <NavLinks pathname={pathname} user={user} mobile onClick={() => setIsMobileMenuOpen(false)} />
            <div className="h-px bg-white/5 my-2"></div>
            <div className="relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 material-symbols-outlined text-[20px]">search</span>
              <input className="w-full h-12 rounded-xl text-sm bg-white/5 border border-white/10 pl-10 pr-4 text-slate-200 outline-none" placeholder="Search portfolio..." />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLinks({ pathname, user, mobile, onClick }: { pathname: string, user: any, mobile?: boolean, onClick?: () => void }) {
  return (
    <>
      <NavLink href="/" active={pathname === "/"} label="Home" mobile={mobile} onClick={onClick} />
      
      {user?.role === "owner" && (
        <>
          <NavLink href="/properties" active={pathname === "/properties"} label="My Properties" mobile={mobile} onClick={onClick} />
          <NavLink href="/verify" active={pathname === "/verify"} label="Submit Asset" mobile={mobile} onClick={onClick} />
        </>
      )}

      {user?.role === "investor" && (
        <NavLink href="/explore" active={pathname === "/explore"} label="Marketplace" mobile={mobile} onClick={onClick} />
      )}

      {user?.role === "admin" && (
        <NavLink href="/admin" active={pathname === "/admin"} label="Admin Dashboard" mobile={mobile} onClick={onClick} />
      )}
    </>
  );
}

function NavLink({ href, active, label, mobile, onClick }: { href: string, active: boolean, label: string, mobile?: boolean, onClick?: () => void }) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`text-sm font-medium leading-normal transition-all duration-300 ${
        mobile 
          ? `w-full px-6 py-4 rounded-xl flex items-center ${active ? "text-[#D4AF37] bg-white/10 border border-[#D4AF37]/20" : "text-slate-400 hover:text-white"}`
          : `px-5 py-2 rounded-lg ${active ? "text-[#D4AF37] bg-white/10 shadow-sm border border-white/5" : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"}`
      }`}
    >
      {label}
    </Link>
  );
}
