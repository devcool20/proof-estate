import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";
import { Navbar } from "../components/Navbar";
import { ClerkProvider } from "@clerk/nextjs";

const inter = Inter({
 variable: "--font-inter",
 subsets: ["latin"],
});

export const metadata: Metadata = {
 title: "LedgerEstate",
 description: "On-chain verification and tokenization protocol for real-world real estate.",
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <ClerkProvider>
 <html lang="en">
 <head>
 <link rel="preconnect" href="https://fonts.googleapis.com" />
 <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
 <link
 href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
 rel="stylesheet"
 />
 </head>
 <body className={`${inter.variable} font-sans antialiased text-slate-900 bg-background-light min-h-screen flex flex-col`}>
 <AppProviders>
 <Navbar />
 {children}
 </AppProviders>
 </body>
 </html>
 </ClerkProvider>
 );
}
