import type { Metadata } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";
import { Navbar } from "../components/Navbar";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const playfair = Playfair_Display({
 variable: "--font-playfair",
 subsets: ["latin"],
 weight: ["400", "500", "600", "700", "800", "900"],
});

const plusJakarta = Plus_Jakarta_Sans({
 variable: "--font-jakarta",
 subsets: ["latin"],
 weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
 title: "ProofEstate | RWA Protocol",
 description: "On-chain verification and tokenization protocol for real-world real estate.",
};

export default function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 return (
 <ClerkProvider appearance={{ baseTheme: dark }}>
 <html lang="en" className="dark scroll-smooth">
 <head>
 <link rel="preconnect" href="https://fonts.googleapis.com" />
 <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
 <link
 href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
 rel="stylesheet"
 />
 </head>
 <body className={`${playfair.variable} ${plusJakarta.variable} font-sans antialiased text-slate-200 bg-[#060606] min-h-screen flex flex-col selection:bg-[#D4AF37] selection:text-black`}>
 <div className="fixed inset-0 z-[-1] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 mix-blend-screen pointer-events-none"></div>
 <div className="fixed inset-0 z-[-2] bg-gradient-to-br from-[#0a0a0a] via-[#060606] to-[#040d12] pointer-events-none"></div>
 <AppProviders>
 <Navbar />
 {children}
 </AppProviders>
 </body>
 </html>
 </ClerkProvider>
 );
}
