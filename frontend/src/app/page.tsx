"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { listProperties, type Property } from "@/lib/api";

// Indian real estate images from Unsplash (reliable sources)
const INDIA_HERO_IMAGE = "https://images.unsplash.com/photo-1577495508048-b635879837f1?q=80&w=2070&auto=format&fit=crop"; // Mumbai skyline
const INDIA_STORY_IMAGE = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1035&auto=format&fit=crop"; // modern Indian residential
const INDIA_ASSETS = [
  {
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop", // glass building
    city: "Mumbai, Maharashtra",
    name: "The Bandra BKC Tower",
    desc: "Grade-A commercial tower in Mumbai's prime financial district, generating 9.2% yield. Fully verified on Karnataka Bhoomi.",
  },
  {
    image: "https://images.unsplash.com/photo-1600607687920-4e2a868f0bbb?q=80&w=800&auto=format&fit=crop", // modern building
    city: "Bengaluru, Karnataka",
    name: "Silicon Valley Prestige",
    desc: "Prime tech corridor office space leased to Fortune 500 tenants, tokenized into 10,000 fractional shares.",
  },
  {
    image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=800&auto=format&fit=crop", // luxury building
    city: "Hyderabad, Telangana",
    name: "Financial District Hub",
    desc: "Institutional-grade IT park in Hyderabad's rapidly appreciating corridor, cleared by NeSL/CERSAI verification.",
  },
];

function CountUpStat({ end, suffix = "", prefix = "" }: { end: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const duration = 1800;
        const step = end / (duration / 16);
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setCount(end); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
        observer.disconnect();
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

export default function LandingPage() {
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    listProperties()
      .then(setProperties)
      .catch(() => {});
  }, []);

  return (
    <div className="flex-grow flex flex-col font-sans bg-[#0f1419] text-[#dee3ea]">
      <main className="flex-grow">

        {/* ── HERO ── */}
        <section className="relative w-full h-[90vh] min-h-[700px] overflow-hidden flex items-center justify-center -mt-[73px]">
          <img
            src={INDIA_HERO_IMAGE}
            alt="Mumbai skyline"
            className="absolute inset-0 w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0f1419]/80 via-[#0f1419]/20 to-[#0f1419]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.06)_0%,transparent_70%)]"></div>

          <div className="relative z-10 flex flex-col items-center justify-center px-4 pt-20 max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-3 mb-8 border border-[#d4af37]/20 bg-[#d4af37]/5 rounded-full px-5 py-2 backdrop-blur-sm animate-fade-up">
              <span className="size-2 rounded-full bg-[#f2ca50] animate-pulse shadow-[0_0_8px_#f2ca50]"></span>
              <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase">
                India Real Estate Tokenization Protocol
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium mb-8 heading-display leading-[1.05] tracking-tight text-white animate-fade-up" style={{ animationDelay: "100ms" }}>
              Own India's Finest<br/>
              <span className="text-[#f2ca50] italic font-light">Real Estate</span>
            </h1>

            <p className="text-white/60 text-base md:text-lg max-w-2xl mb-12 leading-relaxed animate-fade-up" style={{ animationDelay: "200ms" }}>
              ProofEstate tokenizes Grade-A Indian commercial real estate into blockchain-secured fractional shares on Solana. Starting at ₹10 Lakhs.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-up" style={{ animationDelay: "300ms" }}>
              <Link href="/explore" className="btn-primary px-10 py-4 text-sm font-bold tracking-wider uppercase transition-transform hover:scale-105">
                Explore the Registry
              </Link>
              <a href="#how-it-works" className="px-10 py-4 text-sm font-bold tracking-wider uppercase text-white/70 hover:text-white transition-colors border border-white/10 rounded-2xl hover:bg-white/5 backdrop-blur-md">
                How It Works
              </a>
            </div>
          </div>

          {/* Scroll hint */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 animate-bounce">
            <span className="text-[9px] font-bold tracking-[0.2em] uppercase">Scroll</span>
            <span className="material-symbols-outlined text-[18px]">keyboard_arrow_down</span>
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <section className="border-y border-white/5 bg-[#171c21] py-10 px-6 md:px-12">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Fractional RE Market 2025", end: 9800, prefix: "₹", suffix: "Cr+" },
              { label: "Market Growth Since 2021", end: 326, suffix: "%" },
              { label: "Target HNIs in India", end: 850000, suffix: "+" },
              { label: "NRI Diaspora Investors", end: 32, suffix: "M+" },
            ].map((stat) => (
              <div key={stat.label} className="text-center md:text-left">
                <p className="text-3xl font-medium heading-display text-[#f2ca50] mb-1">
                  <CountUpStat end={stat.end} prefix={stat.prefix} suffix={stat.suffix} />
                </p>
                <p className="text-[9px] font-bold tracking-[0.15em] text-white/40 uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="py-28 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">The Protocol</span>
            <h2 className="text-4xl md:text-5xl font-medium heading-display text-white mb-6">How ProofEstate Works</h2>
            <p className="text-white/50 text-sm max-w-xl mx-auto leading-relaxed">
              A three-step journey from raw property deed to liquid digital asset, secured by Solana blockchain and verified by government registries.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-16 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-px bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent"></div>

            {[
              {
                step: "01",
                icon: "verified_user",
                title: "Cryptographic Verification",
                desc: "Every asset undergoes a rigorous 48-hour title verification: automated queries to Karnataka Bhoomi, NeSL/CERSAI charge searches, and RERA compliance checks. India has 4.9M+ hectares in active land disputes — our verification creates institutional-grade certainty.",
                tag: "Title Security",
              },
              {
                step: "02",
                icon: "token",
                title: "Blockchain Tokenization",
                desc: "Verified assets are tokenized via SEBI-compliant SPV structures on the Solana blockchain. 10,000 fractional shares are minted per asset, each representing irrevocable, immutable on-chain proof of ownership. Transaction costs: $0.00025 per trade.",
                tag: "Solana Protocol",
              },
              {
                step: "03",
                icon: "candlestick_chart",
                title: "Liquid Secondary Market",
                desc: "Trade fractional real estate shares anytime on our secondary marketplace — with the same ease as a stock portfolio. Solana's 65,000 TPS capacity means instant settlement, zero congestion, and a true liquid real estate asset class for the first time.",
                tag: "₹10L Minimum",
              },
            ].map((item, i) => (
              <div key={item.step} className="relative group">
                <div className="bg-[#171c21] rounded-[2rem] p-10 border border-white/5 h-full flex flex-col gap-6 transition-all duration-500 hover:border-[#d4af37]/20 hover:bg-[#1a2027] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                  <div className="flex items-start justify-between">
                    <div className="size-16 rounded-2xl bg-[#d4af37]/5 border border-[#d4af37]/10 flex items-center justify-center group-hover:bg-[#d4af37]/10 transition-colors">
                      <span className="material-symbols-outlined text-3xl text-[#d4af37] font-light">{item.icon}</span>
                    </div>
                    <span className="text-[#d4af37]/20 text-5xl font-bold heading-display">{item.step}</span>
                  </div>
                  <div>
                    <span className="text-[#d4af37] text-[9px] font-bold tracking-[0.2em] uppercase mb-3 block">{item.tag}</span>
                    <h3 className="text-2xl font-medium heading-display text-white mb-4">{item.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── INDIAN ASSETS SHOWCASE ── */}
        <section className="py-24 px-6 md:px-12 lg:px-24 mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">Featured Registry</span>
              <h2 className="text-4xl font-medium heading-display text-white">Curated Indian Assets</h2>
            </div>
            <Link href="/explore" className="text-[#d4af37] text-[10px] font-bold tracking-widest uppercase border-b border-[#d4af37]/30 hover:border-[#d4af37] pb-1 transition-colors self-end whitespace-nowrap">
              View Full Registry →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Main Feature */}
            <div className="md:col-span-7 group relative rounded-[2rem] overflow-hidden h-[520px] border border-white/5 cursor-pointer">
              <img
                src={INDIA_ASSETS[0].image}
                alt={INDIA_ASSETS[0].name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.8s] ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f1419] via-[#0f1419]/40 to-transparent"></div>
              <div className="absolute bottom-10 left-10 right-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="size-2 rounded-full bg-[#f2ca50] animate-pulse"></div>
                  <span className="text-[#f2ca50] text-[10px] font-bold tracking-widest uppercase">Verified Asset · {INDIA_ASSETS[0].city}</span>
                </div>
                <h3 className="text-3xl font-medium heading-display text-white mb-3">{INDIA_ASSETS[0].name}</h3>
                <p className="text-white/70 text-sm max-w-md mb-6 leading-relaxed">{INDIA_ASSETS[0].desc}</p>
                <Link href="/explore" className="flex items-center gap-2 text-[#d4af37] text-xs font-bold tracking-widest uppercase group-hover:gap-4 transition-all">
                  Explore Narrative <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </Link>
              </div>
            </div>

            {/* Side cards */}
            <div className="md:col-span-5 flex flex-col gap-6">
              {INDIA_ASSETS.slice(1).map((asset, i) => (
                <div key={i} className="group relative rounded-[2rem] overflow-hidden h-[244px] border border-white/5 cursor-pointer">
                  <img
                    src={asset.image}
                    alt={asset.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f1419] via-[#0f1419]/30 to-transparent"></div>
                  <div className="absolute bottom-7 left-8 right-8">
                    <p className="text-[#d4af37] text-[9px] font-bold tracking-widest uppercase mb-2">{asset.city}</p>
                    <h3 className="text-xl font-medium heading-display text-white">{asset.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── WHY BLOCKCHAIN ── */}
        <section className="py-24 px-6 md:px-12 lg:px-24 mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">The Vision</span>
              <h2 className="text-4xl md:text-5xl font-medium heading-display text-white mb-6 leading-tight">
                Why Blockchain<br/>Changes Everything
              </h2>
              <p className="text-white/60 text-sm leading-relaxed mb-8">
                India's fractional real estate market grew <strong className="text-white">326%</strong> from ₹2,300 crore to ₹9,800 crore between 2021–2025 — and regulators have responded. SEBI's SM-REIT framework (March 2024) and PropShare's BSE listing (December 2024) confirm that institutional-grade fractional real estate is no longer a concept — it's a mandate.
              </p>
              <p className="text-white/60 text-sm leading-relaxed mb-8">
                But no existing platform combines verified title security with blockchain tokenization and real secondary liquidity. ProofEstate is built to fill that <strong className="text-white">structural gap</strong> — the CIBIL equivalent for Indian property titles, on-chain.
              </p>
              <div className="flex flex-wrap gap-3">
                {["SEBI SM-REIT Compliant", "NeSL/CERSAI Integrated", "Solana Powered", "Karnataka Bhoomi Verified"].map(tag => (
                  <span key={tag} className="text-[9px] font-bold tracking-widest uppercase bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] px-3 py-1.5 rounded-full">{tag}</span>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  icon: "security",
                  title: "Institutional-Grade Title Verification",
                  desc: "Automated government registry checks replace 30-45 day manual legal due diligence. 48-hour turnaround. Clear, dispute-free title — every time.",
                },
                {
                  icon: "currency_rupee",
                  title: "Starting at ₹10 Lakhs",
                  desc: "SEBI's SM-REIT framework allows retail-accessible minimum investments — previously restricted to ₹25L+ with zero secondary liquidity. We serve the unserved.",
                },
                {
                  icon: "public",
                  title: "NRI-First Design",
                  desc: "32 million NRIs deploy $13-15B annually into Indian real estate. Via GIFT City IFSC structuring, ProofEstate gives the diaspora direct, FEMA-compliant, liquid India CRE exposure.",
                },
                {
                  icon: "bolt",
                  title: "Solana: $0.00025 Per Transaction",
                  desc: "At 1 million trades per year, Ethereum L1 costs $50M. Solana costs $250. Sub-cent settlement makes secondary market trading economic at all investment sizes.",
                },
              ].map((item) => (
                <div key={item.title} className="bg-[#171c21] border border-white/5 rounded-2xl p-6 flex items-start gap-5 hover:border-[#d4af37]/20 transition-all duration-300 group">
                  <div className="size-11 rounded-xl bg-[#d4af37]/5 group-hover:bg-[#d4af37]/10 flex items-center justify-center shrink-0 transition-colors">
                    <span className="material-symbols-outlined text-[18px] text-[#d4af37] font-light">{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm mb-1.5">{item.title}</h4>
                    <p className="text-white/50 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── THE OPPORTUNITY ── */}
        <section className="py-24 px-6 md:px-12 lg:px-24 border-y border-white/5 bg-[#0a0e14]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">Market Intelligence</span>
              <h2 className="text-4xl font-medium heading-display text-white">The Structural Gap We Fill</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: "domain_verification",
                  title: "Verification Moat",
                  desc: "No Indian proptech platform has automated NeSL/CERSAI charge searches or state registry queries. Building this first creates a data flywheel: India's equivalent of CIBIL for property titles.",
                  badge: "The Whitespace"
                },
                {
                  icon: "groups",
                  title: "The Retail Gap",
                  desc: "Every SEBI-registered fractional platform requires ₹10–25 lakh minimum. The ₹1–10 lakh retail segment — approximately 5 million digitally active investors — is entirely unserved.",
                  badge: "5M Investors"
                },
                {
                  icon: "flight",
                  title: "NRI Demand Unmet",
                  desc: "32 million diaspora investors deploying $13–15 billion annually into Indian real estate face severe friction. Tokenized, FEMA-compliant, digitally tradeable assets via GIFT City IFSC solve this cleanly.",
                  badge: "$15B/Year"
                },
              ].map((item) => (
                <div key={item.title} className="bg-[#171c21] rounded-[2rem] p-10 border border-white/5 flex flex-col gap-6 hover:border-[#d4af37]/20 transition-all duration-500">
                  <div className="flex items-start justify-between">
                    <div className="size-14 rounded-2xl bg-[#d4af37]/5 border border-[#d4af37]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl text-[#d4af37] font-light">{item.icon}</span>
                    </div>
                    <span className="text-[8px] font-bold tracking-widest uppercase bg-[#d4af37]/10 border border-[#d4af37]/20 text-[#d4af37] px-3 py-1.5 rounded-full self-start">{item.badge}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium heading-display text-white mb-3">{item.title}</h3>
                    <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STORY / VISION ── */}
        <section className="py-28 px-6 md:px-12 lg:px-24 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 relative w-full aspect-[4/5] max-w-md mx-auto order-2 lg:order-1">
            <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/4 w-64 h-64 bg-[#f2ca50]/10 rounded-full blur-[100px]"></div>
            <div className="relative w-full h-full rounded-[2rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.5)] border border-white/5">
              <img
                src={INDIA_STORY_IMAGE}
                alt="Modern Indian Real Estate"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Floating stat card */}
            <div className="absolute -bottom-6 -right-6 bg-[#171c21] border border-[#d4af37]/20 rounded-2xl p-6 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
              <p className="text-[9px] font-bold tracking-widest text-white/40 uppercase mb-1">Market by 2030</p>
              <p className="text-3xl font-medium heading-display text-[#f2ca50]">$5B+</p>
              <p className="text-[9px] text-white/40 font-medium mt-1">Knight Frank Estimate</p>
            </div>
          </div>

          <div className="flex-1 space-y-8 z-10 order-1 lg:order-2">
            <div>
              <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">Our Vision</span>
              <h2 className="text-4xl md:text-5xl font-medium heading-display leading-tight text-white">
                The Protocol That<br/>
                <span className="text-[#f2ca50] italic font-light">Unlocks India's Wealth</span>
              </h2>
            </div>
            <p className="text-white/60 text-sm font-medium max-w-md leading-relaxed">
              For too long, Indian commercial real estate has been the preserve of the ultra-wealthy. The average holding period is 8 years — trapping capital that could be deployed across multiple opportunities. ProofEstate is the infrastructure that changes this.
            </p>
            <p className="text-white/60 text-sm font-medium max-w-md leading-relaxed">
              We are building the "CIBIL of Indian property titles" — a verification database accumulated over thousands of properties across every Indian state, powering a new era of liquid, transparent, and accessible real estate ownership.
            </p>
            <div className="flex items-center gap-12 pt-4">
              <div>
                <p className="text-[#f2ca50] text-3xl font-medium heading-display mb-1">
                  <CountUpStat end={326} suffix="%" />
                </p>
                <p className="text-[9px] font-bold tracking-widest text-white/40 uppercase">Market Growth 2021-25</p>
              </div>
              <div>
                <p className="text-[#f2ca50] text-3xl font-medium heading-display mb-1">48h</p>
                <p className="text-[9px] font-bold tracking-widest text-white/40 uppercase">Verification Turnaround</p>
              </div>
              <div>
                <p className="text-[#f2ca50] text-3xl font-medium heading-display mb-1">₹10L</p>
                <p className="text-[9px] font-bold tracking-widest text-white/40 uppercase">Minimum Investment</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER CTA ── */}
        <section className="py-32 px-6 flex flex-col items-center justify-center text-center relative overflow-hidden bg-[#0f1419]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#d4af37]/5 rounded-full blur-[150px]"></div>

          <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase mb-8 relative z-10">Join the Protocol</span>
          <h2 className="text-5xl md:text-6xl font-medium heading-display text-white mb-8 relative z-10 leading-tight max-w-3xl">
            The Future of Indian<br/>
            <span className="italic text-[#f2ca50] font-light">Real Estate Ownership</span>
          </h2>
          <p className="text-white/50 text-sm max-w-md mx-auto mb-10 relative z-10 leading-relaxed">
            Powered by Solana. Secured by zero-knowledge proof. Compliant with SEBI SM-REIT framework. Ready for India's 850,000 HNIs and 32M NRI investors.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
            <Link href="/explore" className="btn-primary px-10 py-4 text-sm font-bold tracking-wider uppercase transition-transform hover:scale-105">
              Access the Registry
            </Link>
            <Link href="/verify" className="px-10 py-4 text-sm font-bold tracking-wider uppercase text-white/70 hover:text-white transition-colors border border-white/10 rounded-2xl hover:bg-white/5">
              Submit Your Asset
            </Link>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="py-16 border-t border-white/5 bg-[#0a0e14] px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="max-w-xs">
            <h3 className="heading-display text-2xl font-medium text-[#d4af37] mb-4">ProofEstate</h3>
            <p className="text-white/40 text-xs leading-relaxed">
              India's first blockchain-native platform for verified, tokenized real estate. Built for the 32M NRI diaspora and India's 850K HNIs.
            </p>
            <p className="text-[#d4af37]/40 text-[9px] font-bold tracking-widest uppercase mt-4">
              Solana · SEBI SM-REIT · GIFT City IFSC
            </p>
          </div>

          <div className="flex gap-16 flex-wrap">
            <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-bold tracking-widest text-[#d4af37] uppercase">Registry</h4>
              <Link href="/explore" className="text-xs text-white/50 hover:text-white transition-colors">Marketplace</Link>
              <Link href="/verify" className="text-xs text-white/50 hover:text-white transition-colors">Submit Asset</Link>
              <Link href="/profile" className="text-xs text-white/50 hover:text-white transition-colors">My Portfolio</Link>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-bold tracking-widest text-[#d4af37] uppercase">Cities</h4>
              <span className="text-xs text-white/50">Bengaluru</span>
              <span className="text-xs text-white/50">Mumbai</span>
              <span className="text-xs text-white/50">Hyderabad</span>
              <span className="text-xs text-white/50">Delhi NCR</span>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-bold tracking-widest text-[#d4af37] uppercase">Compliance</h4>
              <span className="text-xs text-white/50">SEBI SM-REIT</span>
              <span className="text-xs text-white/50">IFSCA GIFT City</span>
              <span className="text-xs text-white/50">NeSL/CERSAI</span>
              <span className="text-xs text-white/50">FEMA Compliant</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] tracking-widest text-white/20 uppercase">
            © 2026 ProofEstate. This is a prototype. All data is illustrative.
          </p>
          <p className="text-[10px] tracking-widest text-white/20 uppercase">
            Built on Solana · Secured by Zero-Knowledge Proof
          </p>
        </div>
      </footer>
    </div>
  );
}
