"use client";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getProperty, requestTokenize, type Property } from "@/lib/api";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { IDL, PROGRAM_ID, getPropertyPDA } from "@/lib/solana-utils";

function TokenizeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propId = searchParams.get("id");
  const { connection } = useConnection();
  const { publicKey, sendTransaction, signTransaction, signAllTransactions } = useWallet();

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tokenization params
  const [supply, setSupply] = useState("1000000");
  const [priceUsd, setPriceUsd] = useState("45.00");
  const [yieldPct, setYieldPct] = useState("5.2");
  const [frequency, setFrequency] = useState("monthly");

  const [showModal, setShowModal] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintResult, setMintResult] = useState<{ token_mint: string; message: string } | null>(null);
  const [mintError, setMintError] = useState<string | null>(null);

  useEffect(() => {
    if (!propId) {
      setError("No property ID specified.");
      setLoading(false);
      return;
    }
    getProperty(propId)
      .then((p) => {
        setProperty(p);
        if (p.asset_value_inr && p.token_supply) {
          setSupply(String(p.token_supply));
        }
        if (p.token_price_usd) setPriceUsd(String(p.token_price_usd));
        if (p.yield_percent) setYieldPct(String(p.yield_percent));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [propId]);

  const totalValue = Number(supply) * Number(priceUsd);

  const handleMint = async () => {
    if (!propId || !property || !publicKey) {
      setMintError("Wallet not connected.");
      return;
    }
    setIsMinting(true);
    setMintError(null);
    try {
      console.log("🚀 Requesting tokenization...");
      
      const resp = await requestTokenize(propId, {
        owner_wallet:    publicKey.toBase58(),
        token_supply:    Number(supply),
        token_price_usd: Number(priceUsd),
        yield_percent:   Number(yieldPct),
        dist_frequency:  frequency as any,
      });

      setMintResult({ 
        token_mint: "Pending Admin Approval", 
        message: `Tokenization request submitted. An admin will review and execute the mint.` 
      });
      setShowModal(false);
    } catch (e: any) {
      console.error(e);
      setMintError(e.message || "Failed to submit tokenization request.");
    } finally {
      setIsMinting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────
  if (mintResult) {
    return (
      <div className="bg-background-light min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 max-w-lg w-full space-y-6">
          <div className="size-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto ring-8 ring-teal-50">
            <span className="material-symbols-outlined text-4xl text-teal-600">generating_tokens</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Tokenized Successfully!</h2>
          <p className="text-slate-500 text-sm">{mintResult.message}</p>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-left space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Token Mint</span>
              <span className="text-teal-600 max-w-[240px] truncate">{mintResult.token_mint}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Supply</span>
              <span className="text-slate-700">{Number(supply).toLocaleString()} tokens</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Price per token</span>
              <span className="text-slate-700">${Number(priceUsd).toFixed(2)} USDC</span>
            </div>
          </div>
          <Link
            href="/properties"
            className="block w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
          >
            Back to My Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-background-light text-slate-900 font-sans min-h-screen flex flex-col antialiased relative ${showModal ? "overflow-hidden" : ""}`}>
      <main className={`flex-grow px-6 py-10 transition-opacity duration-300 ${showModal ? "opacity-30 pointer-events-none" : ""}`}>
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Link href="/properties" className="hover:text-primary transition-colors">My Properties</Link>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-slate-700 font-medium">Tokenize Asset</span>
          </div>

          {/* Header */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Tokenize Verified Asset</h2>
            <p className="text-slate-500 text-sm">
              Convert your verified property into fractional SPL tokens on Solana. Investors can then purchase and earn yield proportionally.
            </p>
          </div>

          {loading && <div className="bg-white rounded-xl border border-slate-100 h-48 animate-pulse" />}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          {property && property.status !== "verified" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 flex items-center gap-3">
              <span className="material-symbols-outlined">warning</span>
              This property is <strong>{property.status}</strong>. It must be <strong>Verified</strong> before you can tokenize it.
            </div>
          )}

          {property && property.status === "verified" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Config */}
              <div className="lg:col-span-2 space-y-6">
                {/* Property card */}
                <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4">
                  <div className="size-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-green-600">verified_user</span>
                  </div>
                  <div className="flex-grow min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{property.name}</h3>
                    <p className="text-sm text-slate-400 truncate">{property.address}</p>
                  </div>
                  <span className="px-2.5 py-1 bg-green-100 text-green-700 border border-green-200 text-xs font-bold rounded-full shrink-0">Verified</span>
                </div>

                {/* Fractionalization config */}
                <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-6">
                  <h4 className="font-bold text-slate-900">Fractionalization Parameters</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 mb-1 block">Total Token Supply</span>
                      <div className="relative">
                        <input type="number" value={supply} onChange={(e) => setSupply(e.target.value)}
                          className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">tokens</span>
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 mb-1 block">Price per Token (USDC)</span>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <input type="number" step="0.01" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)}
                          className="w-full h-11 pl-8 pr-4 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium" />
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 mb-1 block">Expected Annual Yield</span>
                      <div className="relative">
                        <input type="number" step="0.1" value={yieldPct} onChange={(e) => setYieldPct(e.target.value)}
                          className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 mb-1 block">Distribution Frequency</span>
                      <select value={frequency} onChange={(e) => setFrequency(e.target.value)}
                        className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all font-medium">
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annually">Annually</option>
                      </select>
                    </label>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4 text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Raise (USDC)</span>
                      <span className="font-bold text-slate-900">${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Annual Yield per Token</span>
                      <span className="font-semibold text-teal-600">
                        ${(Number(priceUsd) * Number(yieldPct) / 100).toFixed(4)} USDC
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Execute */}
              <div className="space-y-4">
                <div className="bg-primary rounded-2xl p-6 text-white space-y-4 relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 bg-white/5 size-32 rounded-full" />
                  <h4 className="font-bold text-sm uppercase tracking-wide text-slate-300 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">gavel</span>
                    Execute Mint
                  </h4>
                  <div className="space-y-3 text-sm relative z-10">
                    {[
                      ["Protocol",     "SPL Token-2022"],
                      ["Mint Authority","Property PDA"],
                      ["Supply",       Number(supply).toLocaleString()],
                      ["Price",        `$${Number(priceUsd).toFixed(2)} USDC`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-white/10 pb-2">
                        <span className="text-slate-300">{k}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full py-3 bg-white hover:bg-slate-100 text-primary font-bold rounded-xl transition-all flex items-center justify-center gap-2 relative z-10"
                  >
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    Initialize Tokenization
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-slate-100 p-4 text-xs text-slate-500 leading-relaxed">
                  <p className="font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">shield</span>
                    Smart Contract Security
                  </p>
                  The <code className="bg-slate-100 px-1 rounded">tokenize_property</code> instruction will only succeed if the Property PDA status is <strong>Verified</strong>. The mint authority is the PDA — permanently non-custodial.
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900">Confirm Tokenization</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="size-16 rounded-full bg-teal-100 flex items-center justify-center ring-8 ring-teal-50">
                  <span className="material-symbols-outlined text-3xl text-teal-600">generating_tokens</span>
                </div>
                <h4 className="text-lg font-bold text-slate-900">Minting {Number(supply).toLocaleString()} Tokens</h4>
                <p className="text-sm text-slate-500">Requesting signature for the <code className="bg-slate-100 px-1 rounded text-xs">tokenize_property</code> instruction</p>
              </div>

              <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 font-mono text-xs space-y-2">
                {[
                  ["Program ID",     "Fg6P...sLnS"],
                  ["Mint Authority", "Property PDA"],
                  ["Token Supply",   Number(supply).toLocaleString()],
                  ["Price per Token",`$${Number(priceUsd).toFixed(2)}`],
                  ["Network Fee",    "~0.000015 SOL"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-slate-100 pb-1 last:border-0 last:pb-0">
                    <span className="text-slate-400">{k}</span>
                    <span className="text-slate-700">{v}</span>
                  </div>
                ))}
              </div>

              {mintError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex gap-2">
                  <span className="material-symbols-outlined text-[16px]">error</span>
                  {mintError}
                </div>
              )}

              <button
                onClick={handleMint}
                disabled={isMinting}
                className={`w-full h-12 font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-white ${
                  isMinting ? "bg-slate-400 cursor-not-allowed" : "bg-primary hover:bg-slate-800"
                }`}
              >
                {isMinting ? (
                  <>
                    <span className="material-symbols-outlined text-[20px] animate-spin">refresh</span>
                    Submitting Request...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">fingerprint</span>
                    Confirm Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TokenizePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>}>
      <TokenizeForm />
    </Suspense>
  );
}
