"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WalletConnectButton } from './WalletButton';

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-border-light bg-white px-6 md:px-10 py-3 sticky top-0 z-[60]">
      <div className="flex items-center gap-6 md:gap-8">
        <Link href="/" className="flex items-center gap-3 md:gap-4 text-primary">
          <div className="size-8 rounded-lg bg-primary text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">token</span>
          </div>
          <h2 className="text-primary text-lg font-bold leading-tight tracking-tight">ProofEstate</h2>
        </Link>
        <div className="hidden lg:flex items-center gap-1 bg-background-light p-1 rounded-lg border border-border-light">
          <NavLink href="/" active={pathname === "/"} label="Dashboard" />
          <NavLink href="/properties" active={pathname === "/properties"} label="Properties" />
          <NavLink href="/admin" active={pathname === "/admin"} label="Verifier" />
          <NavLink href="/verify" active={pathname === "/verify"} label="Submit Asset" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <label className="hidden md:flex items-center min-w-40 h-10 max-w-64 relative group">
          <span className="absolute left-3 text-slate-400 material-symbols-outlined text-[20px]">search</span>
          <input className="w-full h-full rounded-lg text-sm bg-slate-50 border border-slate-200 pl-10 pr-4 text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400" placeholder="Search properties..." />
        </label>
        <WalletConnectButton />
        <div className="h-10 w-10 rounded-full bg-cover bg-center border border-slate-200 cursor-pointer shadow-sm hover:ring-2 hover:ring-primary/20 transition-all" style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuD466DMnbibPWdx4tc4Z4ECcbF-toAwySCarcxbNOYSUCuUUUv2cqW5flvM-GuZpdWlop3PBIGoURkQKUOl8vb5IEujfvGMCIzQbB7Jeb3i_eolpzdUG1movJiEN0yOzuyEx76sd3jgSmHX4ZdI6gnLv54RIgguGpkEdFSv6KETZYSqf1faX6PAhZ9j4UTs-k32g10-4ih3jxQ-ZVw-ouD8cqqVddRF5Kn40k00rzCkEC9K9ygsddjagkuUxQBgknxMk3PVV1oHQpki')" }}>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, active, label }: { href: string, active: boolean, label: string }) {
  return (
    <Link 
      href={href} 
      className={`text-sm font-medium leading-normal px-4 py-1.5 rounded-md transition-colors ${
        active 
          ? "text-white bg-primary shadow-sm" 
          : "text-text-secondary-light hover:text-primary hover:bg-white"
      }`}
    >
      {label}
    </Link>
  );
}
