"use client";

import { useMemo, FC, ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import "@solana/wallet-adapter-react-ui/styles.css";

import { AuthProvider } from "@/lib/AuthContext";

export const AppProviders: FC<{ children: ReactNode }> = ({ children }) => {
  // You can also provide a custom RPC endpoint
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);

  // @solana/wallet-adapter-wallets includes all the adapters but supports standard wallet standard
  const wallets = useMemo(
    () => [
      // Add more specific adapters if necessary, otherwise the standard wallet adapters usually catch popular extensions
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
