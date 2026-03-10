"use client";

import { FC, ReactNode } from "react";

import { AuthProvider } from "@/lib/AuthContext";

export const AppProviders: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
};
