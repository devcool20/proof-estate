"use client";

import { FC, ReactNode } from "react";

import { AuthProvider } from "@/lib/AuthContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { WalletProviders } from "@/components/WalletProviders";

export const AppProviders: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <ThemeProvider>
      <WalletProviders>
        <AuthProvider>
          {children}
        </AuthProvider>
      </WalletProviders>
    </ThemeProvider>
  );
};
