"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Using a dynamic import for the standard adapter button to avoid SSR issues
const BaseWalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export function WalletConnectButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-[36px] h-[36px] md:w-[40px] md:h-[40px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center animate-pulse shrink-0 shadow-inner">
        <span className="material-symbols-outlined text-[16px] md:text-[20px] text-slate-500">wallet</span>
      </div>
    );
  }

  return (
    <div className="luxury-wallet-button">
      <BaseWalletMultiButton />
      <style jsx global>{`
        .luxury-wallet-button .wallet-adapter-button {
          background: linear-gradient(90deg, #D4AF37 0%, #F3E5AB 100%) !important;
          color: black !important;
          width: 40px !important;
          height: 40px !important;
          min-width: 40px !important;
          border-radius: 50% !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.2) !important;
          border: none !important;
          font-size: 0 !important; /* Hide text */
        }
        
        @media (max-width: 768px) {
          .luxury-wallet-button .wallet-adapter-button {
            width: 36px !important;
            height: 36px !important;
            min-width: 36px !important;
          }
          .luxury-wallet-button .wallet-adapter-button svg {
            width: 16px !important;
            height: 16px !important;
          }
        }

        .luxury-wallet-button .wallet-adapter-button:hover {
          transform: translateY(-2px) !important;
          box-shadow: 0 8px 25px rgba(212, 175, 55, 0.4) !important;
          filter: brightness(1.05) !important;
        }
        
        .luxury-wallet-button .wallet-adapter-button:active {
          transform: translateY(0px) !important;
        }

        .luxury-wallet-button .wallet-adapter-button i {
          margin: 0 !important;
        }

        .luxury-wallet-button .wallet-adapter-button svg {
          width: 20px !important;
          height: 20px !important;
          margin: 0 !important;
        }
      `}</style>
    </div>
  );
}
