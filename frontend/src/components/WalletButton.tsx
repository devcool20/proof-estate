"use client";

import dynamic from "next/dynamic";

// Using a dynamic import for the standard adapter button to avoid SSR issues
const BaseWalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export function WalletConnectButton() {
  return (
    <div className="luxury-wallet-button">
      <BaseWalletMultiButton />
      <style jsx global>{`
      .luxury-wallet-button .wallet-adapter-button {
        background: linear-gradient(90deg, var(--brand-primary) 0%, var(--brand-primary-light) 100%) !important;
        color: black !important;
        width: 34px !important;
        height: 34px !important;
        min-width: 34px !important;
        border-radius: 50% !important;
        padding: 0 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        box-shadow: 0 4px 15px rgba(var(--color-primary-rgb), 0.2) !important;
        border: none !important;
        font-size: 0 !important; /* Hide text */
      }
      
      @media (max-width: 768px) {
        .luxury-wallet-button .wallet-adapter-button {
          width: 30px !important;
          height: 30px !important;
          min-width: 30px !important;
        }
        .luxury-wallet-button .wallet-adapter-button svg {
          width: 16px !important;
          height: 16px !important;
        }
      }

      .luxury-wallet-button .wallet-adapter-button:hover {
        transform: translateY(-2px) !important;
        box-shadow: 0 8px 25px rgba(var(--color-primary-rgb), 0.4) !important;
        filter: brightness(1.05) !important;
      }
      
      .luxury-wallet-button .wallet-adapter-button:active {
        transform: translateY(0px) !important;
      }

      .luxury-wallet-button .wallet-adapter-button i {
        margin: 0 !important;
      }

      .luxury-wallet-button .wallet-adapter-button svg {
        width: 16px !important;
        height: 16px !important;
        margin: 0 !important;
      }
    `}</style>
    </div>
  );
}
