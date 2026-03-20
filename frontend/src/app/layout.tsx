import type { Metadata } from "next";
import { Newsreader, Manrope } from "next/font/google";
import "./globals.css";
import { AppProviders } from "./providers";
import { Navbar } from "../components/Navbar";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const newsreader = Newsreader({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
 <ClerkProvider 
   publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
   appearance={{ baseTheme: dark }}
 >
 <html lang="en" className="dark scroll-smooth">
 <head>
 <link rel="preconnect" href="https://fonts.googleapis.com" />
 <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
 <link
 href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=block"
 rel="stylesheet"
 />
 </head>
 <body className={`${newsreader.variable} ${manrope.variable} font-sans antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-surface`} style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
 <div className="fixed inset-0 z-[-1] opacity-10 pointer-events-none" style={{ backgroundColor: 'var(--bg)' }}></div>
 <div className="fixed inset-0 z-[-2] pointer-events-none" style={{ backgroundColor: 'var(--bg)' }}></div>
 <AppProviders>
 <Navbar />
 {children}
 </AppProviders>
 </body>
 </html>
 </ClerkProvider>
 );
}
