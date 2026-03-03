"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// The standard UI button from solana-wallet-adapter
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
      <button className="bg-primary hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap">
        <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="custom-wallet-adapter">
      <BaseWalletMultiButton style={{
        backgroundColor: "var(--color-primary, #0f1729)",
        borderRadius: "0.5rem",
        height: "40px",
        padding: "0 20px",
        fontFamily: "inherit",
        fontSize: "0.875rem",
        fontWeight: "600",
      }} />
      <style jsx global>{`
        .custom-wallet-adapter .wallet-adapter-button {
          transition: background-color 0.2s;
        }
        .custom-wallet-adapter .wallet-adapter-button:hover {
          background-color: var(--color-secondary, #1e293b);
        }
      `}</style>
    </div>
  );
}
