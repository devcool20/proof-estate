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
  // We force dark mode styling for the premium feel
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
    <header className={`flex items-center justify-between whitespace-nowrap px-6 md:px-12 py-4 sticky top-0 z-[60] transition-all duration-500 w-full max-w-[1920px] mx-auto ${
      isScrolled 
        ? "border-b border-white/5 bg-[#0a0e14]/80 backdrop-blur-2xl"
        : "bg-transparent border-transparent"
    }`}>
      <div className="flex items-center gap-6 md:gap-12">
        {/* Mobile Menu Toggle */}
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden size-10 rounded-full border border-white/10 flex items-center justify-center transition-colors text-white/50 hover:text-white"
        >
          <span className="material-symbols-outlined font-light">{isMobileMenuOpen ? 'close' : 'menu_open'}</span>
        </button>

        <Link href="/" className="flex items-center group">
          <h2 className="text-[#d4af37] text-2xl heading-display font-medium tracking-wide transition-all duration-500 group-hover:scale-105 group-hover:text-[#f2ca50] drop-shadow-md">
            ProofEstate
          </h2>
        </Link>
        
        <nav className="hidden lg:flex items-center gap-2">
          <NavLinks pathname={pathname} user={user} />
        </nav>
      </div>
      
      <div className="flex items-center gap-4">
        <form onSubmit={handleSearch} className="hidden md:flex items-center min-w-48 h-10 max-w-64 relative group border-b border-white/20 hover:border-[#d4af37] focus-within:border-[#d4af37] transition-colors pb-1">
          <span className="absolute left-0 material-symbols-outlined text-[16px] text-white/40 group-focus-within:text-[#d4af37] transition-colors">search</span>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-full bg-transparent text-[11px] font-bold tracking-[0.1em] uppercase pl-7 pr-2 focus:outline-none text-white placeholder:text-white/30 transition-all"
            placeholder="Search Registry..." 
          />
        </form>

        <button
          onClick={toggleTheme}
          className="size-10 rounded-full border border-white/10 flex items-center justify-center transition-all duration-500 hover:scale-105 hover:border-white/20 text-[#d4af37] bg-white/5"
          aria-label="Toggle dark mode"
        >
          <span className="material-symbols-outlined text-[18px] transition-transform duration-700" style={{ transform: theme === 'dark' ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            {theme === 'dark' ? 'contrast' : 'dark_mode'}
          </span>
        </button>
        
        <ClerkLoaded>
          <Show when="signed-in">
            <div className="flex items-center gap-3 md:gap-4 pl-4 border-l border-white/10">
              <WalletConnectButton />
              <div className="h-10 w-10 rounded-full border border-[#d4af37]/30 flex items-center justify-center overflow-hidden transition-transform duration-500 hover:scale-105 hover:border-[#d4af37]">
                 <UserButton 
                   appearance={{
                     elements: { 
                       userButtonAvatarBox: "h-full w-full",
                       userButtonTrigger: "focus:shadow-none focus:outline-none bg-transparent active:bg-transparent hover:bg-transparent p-0 border-none w-full h-full",
                     }
                   }}
                 >
                   <UserButton.MenuItems>
                     <UserButton.Link
                       label="Protocol Configuration"
                       labelIcon={<span className="material-symbols-outlined text-[16px] text-[#d4af37]">room_preferences</span>}
                       href="/profile"
                     />
                   </UserButton.MenuItems>
                 </UserButton>
              </div>
            </div>
          </Show>

          <Show when="signed-out">
            <SignInButton mode="modal">
              <button className="btn-primary ml-2 py-2.5 px-6 text-[9px] font-bold tracking-[0.2em] uppercase rounded-full">
                Authenticate
              </button>
            </SignInButton>
          </Show>
        </ClerkLoaded>

        <ClerkFailed>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary ml-2 py-2.5 px-6 text-[9px] font-bold tracking-[0.2em] uppercase rounded-full"
          >
            Authenticate
          </button>
        </ClerkFailed>
      </div>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[80px] z-50 bg-[#0a0e14]/95 backdrop-blur-xl animate-in fade-in duration-300 border-t border-white/5">
          <div className="p-8 flex flex-col gap-6 animate-in slide-in-from-top-4 duration-500">
            <NavLinks pathname={pathname} user={user} mobile onClick={() => setIsMobileMenuOpen(false)} />
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent my-4"></div>
            <form onSubmit={handleSearch} className="relative group border-b border-white/20 focus-within:border-[#d4af37] transition-colors pb-2">
              <span className="absolute left-0 material-symbols-outlined text-[20px] text-white/40 group-focus-within:text-[#d4af37]">search</span>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-transparent text-sm tracking-widest pl-8 outline-none text-white placeholder:text-white/30"
                placeholder="Search Registry..." 
              />
            </form>
          </div>
        </div>
      )}
    </header>
  );
}

function NavLinks({ pathname, user, mobile, onClick }: { pathname: string, user: User | null, mobile?: boolean, onClick?: () => void }) {
  return (
    <>
      <NavLink href="/" active={pathname === "/"} label="Exhibition" mobile={mobile} onClick={onClick} />
      
      {user?.role === "owner" && (
        <>
          <NavLink href="/properties" active={pathname === "/properties"} label="The Vault" mobile={mobile} onClick={onClick} />
          <NavLink href="/verify" active={pathname === "/verify"} label="Submit Asset" mobile={mobile} onClick={onClick} />
        </>
      )}

      {user?.role === "investor" && (
        <NavLink href="/explore" active={pathname === "/explore"} label="Private Collection" mobile={mobile} onClick={onClick} />
      )}

      {user?.role === "admin" && (
        <NavLink href="/admin" active={pathname === "/admin"} label="Protocol Core" mobile={mobile} onClick={onClick} />
      )}
    </>
  );
}

function NavLink({ href, active, label, mobile, onClick }: { href: string, active: boolean, label: string, mobile?: boolean, onClick?: () => void }) {
  return (
    <Link 
      href={href} 
      onClick={onClick}
      className={`relative uppercase tracking-[0.15em] font-bold transition-all duration-300 group overflow-hidden ${
        mobile 
          ? `block w-full text-lg py-3 ${active ? 'text-[#d4af37]' : 'text-white/60 hover:text-white'}`
          : `text-[10px] px-4 py-2 flex items-center justify-center ${active ? 'text-[#d4af37]' : 'text-white/50 hover:text-white'}`
      }`}
    >
      <span className="relative z-10">{label}</span>
      {!mobile && (
         <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent transition-all duration-500 ${
           active ? 'w-full opacity-100' : 'w-0 opacity-0 group-hover:w-full group-hover:opacity-100'
         }`}></span>
      )}
    </Link>
  );
}
