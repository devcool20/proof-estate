"use client";
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import dynamic from "next/dynamic";
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import type { User } from "../lib/api";
import { SignInButton, Show, UserButton, ClerkLoaded, ClerkFailed } from '@clerk/nextjs';

const WalletConnectButton = dynamic(
  () => import("./WalletButton").then((mod) => mod.WalletConnectButton),
  { ssr: false }
);

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (pathname === "/") {
      const handleScroll = () => {
        setIsScrolled(window.scrollY > 20);
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    } else {
      setIsScrolled(true);
    }
  }, [pathname]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/explore?query=${encodeURIComponent(searchQuery)}`);
      setIsMobileMenuOpen(false);
    }
  };

  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/explore");
    router.prefetch("/properties");
  }, [router]);

  return (
    <header className={`flex items-center justify-between whitespace-nowrap px-4 md:px-10 py-2.5 sticky top-0 z-[60] transition-all duration-300 ${
      isScrolled 
        ? isDark
          ? "border-b border-white/5 bg-[#0a0e14]/90 backdrop-blur-2xl shadow-sm"
          : "border-b border-slate-200 bg-white/90 backdrop-blur-2xl shadow-sm"
        : "bg-transparent border-transparent"
    }`}>
      <div className="flex items-center gap-4 md:gap-8">
        {/* Mobile Menu Toggle */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={`lg:hidden size-10 rounded-xl border flex items-center justify-center transition-colors ${
            isDark 
              ? 'bg-white/5 border-white/10 text-slate-400 hover:text-white' 
              : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined">{isMobileMenuOpen ? 'close' : 'menu'}</span>
        </button>

        <Link href="/" className="flex items-center group -ml-1 lg:-ml-2">
          <h2 className="text-primary text-xl md:text-2xl heading-display font-medium leading-tight tracking-wide transition-transform origin-left group-hover:scale-105">ProofEstate</h2>
        </Link>
        <div className={`hidden lg:flex items-center gap-1 p-1 rounded-xl border shadow-sm transition-colors ${
          isDark 
            ? 'bg-white/5 border-white/5' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <NavLinks pathname={pathname} user={user} isDark={isDark} />
        </div>
      </div>
      
      <div className="flex items-center gap-2.5 md:gap-3">
        <form onSubmit={handleSearch} className="hidden md:flex items-center min-w-48 h-9 max-w-64 relative group">
          <span className={`absolute left-3 material-symbols-outlined text-[18px] transition-colors group-focus-within:text-primary ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>search</span>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full h-full rounded-xl text-[13px] pl-9 pr-4 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-all font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${
              isDark 
                ? 'bg-white/5 border border-white/10 text-white placeholder:text-slate-500' 
                : 'bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400'
            }`}
            placeholder="Search portfolio..." 
          />
        </form>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`size-9 rounded-xl border flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95 ${
            isDark
              ? 'bg-white/5 border-white/10 text-amber-400 hover:bg-white/10'
              : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-amber-500'
          }`}
          aria-label="Toggle dark mode"
        >
          <span className="material-symbols-outlined text-[18px] transition-transform duration-500" style={{ transform: isDark ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
        
        <ClerkLoaded>
          <Show when="signed-in">
            <div className="flex items-center gap-2 md:gap-3">
              <WalletConnectButton />
              <UserButton 
                appearance={{
                  elements: { 
                    userButtonAvatarBox: "h-8 w-8 md:h-8 md:w-8 border border-slate-300 cursor-pointer shadow-sm hover:scale-105 transition-transform rounded-full bg-transparent overflow-hidden",
                    userButtonTrigger: "focus:shadow-none focus:outline-none bg-transparent active:bg-transparent hover:bg-transparent p-0 border-none",
                  }
                }}
              >
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="Protocol Settings"
                    labelIcon={<span className="material-symbols-outlined text-[16px] text-primary">manage_accounts</span>}
                    href="/profile"
                  />
                </UserButton.MenuItems>
              </UserButton>
            </div>
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="h-8 md:h-9 px-4 md:px-5 font-bold uppercase tracking-wide text-[10px] md:text-[11px] rounded-xl bg-primary text-white transition-all shadow-[0_4px_14px_rgba(17,107,251,0.39)] hover:shadow-[0_6px_20px_rgba(17,107,251,0.23)] hover:bg-primary-light active:scale-95 flex items-center justify-center">
                Sign In
              </button>
            </SignInButton>
          </Show>
        </ClerkLoaded>

        <ClerkFailed>
          <button
            onClick={() => window.location.reload()}
            className="h-8 md:h-9 px-4 md:px-5 font-bold uppercase tracking-wide text-[10px] md:text-[11px] rounded-xl bg-primary text-white transition-all shadow-[0_4px_14px_rgba(17,107,251,0.39)] hover:shadow-[0_6px_20px_rgba(17,107,251,0.23)] hover:bg-primary-light active:scale-95 flex items-center justify-center"
          >
            Sign In
          </button>
        </ClerkFailed>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[73px] z-50 bg-slate-900/20 backdrop-blur-md">
          <div className={`border-b p-6 flex flex-col gap-4 animate-in slide-in-from-top duration-300 ${
            isDark ? 'bg-[#0a0e14] border-white/5' : 'bg-white border-slate-200'
          }`}>
            <NavLinks pathname={pathname} user={user} isDark={isDark} mobile onClick={() => setIsMobileMenuOpen(false)} />
            <div className={`h-px my-2 ${isDark ? 'bg-white/5' : 'bg-slate-200'}`}></div>
            <form onSubmit={handleSearch} className="relative group">
              <span className={`absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[20px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>search</span>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full h-12 rounded-xl text-sm pl-10 pr-4 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] ${
                  isDark ? 'bg-white/5 border border-white/10 text-white' : 'bg-slate-50 border border-slate-200 text-slate-800'
                }`}
                placeholder="Search portfolio..." 
              />
            </form>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLinks({ pathname, user, isDark, mobile, onClick }: { pathname: string, user: User | null, isDark?: boolean, mobile?: boolean, onClick?: () => void }) {
  return (
    <>
      <NavLink href="/" active={pathname === "/"} label="Home" isDark={isDark} mobile={mobile} onClick={onClick} />
      
      {user?.role === "owner" && (
        <>
          <NavLink href="/properties" active={pathname === "/properties"} label="My Properties" isDark={isDark} mobile={mobile} onClick={onClick} />
          <NavLink href="/verify" active={pathname === "/verify"} label="Submit Asset" isDark={isDark} mobile={mobile} onClick={onClick} />
        </>
      )}

      {user?.role === "investor" && (
        <NavLink href="/explore" active={pathname === "/explore"} label="Marketplace" isDark={isDark} mobile={mobile} onClick={onClick} />
      )}

      {user?.role === "admin" && (
        <NavLink href="/admin" active={pathname === "/admin"} label="Admin Dashboard" isDark={isDark} mobile={mobile} onClick={onClick} />
      )}
    </>
  );
}

function NavLink({ href, active, label, isDark, mobile, onClick }: { href: string, active: boolean, label: string, isDark?: boolean, mobile?: boolean, onClick?: () => void }) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`text-sm font-medium leading-normal transition-all duration-300 ${
        mobile 
          ? `w-full px-6 py-4 rounded-xl flex items-center ${
              active 
                ? isDark ? 'text-primary bg-white/5 border border-primary/20' : 'text-primary bg-slate-50 border border-primary/20'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'
            }`
          : `px-5 py-2 rounded-lg ${
              active 
                ? isDark ? 'text-primary bg-white/10 shadow-sm border border-white/10' : 'text-primary bg-white shadow-sm border border-slate-200'
                : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-transparent'
            }`
      }`}
    >
      {label}
    </Link>
  );
}
