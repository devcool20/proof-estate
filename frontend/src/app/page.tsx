"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { listProperties, type Property } from "@/lib/api";

function StatCard({ icon, label, value, accent }: { icon: string; label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 hover:shadow-sm transition-shadow">
      <div className={`size-12 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <div>
        <p className="text-slate-400 text-xs font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProperties()
      .then(setProperties)
      .catch(() => {/* backend offline — show zeros */})
      .finally(() => setLoading(false));
  }, []);

  const total      = properties.length;
  const verified   = properties.filter((p) => p.status === "verified").length;
  const tokenized  = properties.filter((p) => p.status === "tokenized").length;
  const pending    = properties.filter((p) => p.status === "pending_verification").length;

  const recentProps = properties.slice(0, 5);

  return (
    <div className="bg-background-light text-slate-900 font-sans min-h-screen flex flex-col antialiased">
      <main className="flex-grow px-6 py-10">
        <div className="max-w-6xl mx-auto space-y-10">

          {/* Hero */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6">
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-2">ProofEstate</h1>
              <p className="text-slate-500 max-w-xl">
                On-chain verification and tokenization protocol for real-world real estate.
                Submit your property, get it verified against government registries, and tokenize it into fractional SPL tokens on Solana.
              </p>
              <div className="flex gap-3 mt-5">
                <Link href="/verify" className="bg-primary hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Submit Asset
                </Link>
                <Link href="/properties" className="bg-white border border-slate-200 hover:border-primary/30 text-slate-700 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">home_work</span>
                  My Properties
                </Link>
              </div>
            </div>
            {/* Visual accent */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 flex flex-col gap-2 min-w-[220px] shadow-sm">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Network</p>
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-sm font-semibold text-slate-800">Solana Devnet</span>
              </div>
              <p className="font-mono text-[10px] text-slate-300 truncate">Fg6P...sLnS</p>
              <div className="border-t border-slate-100 pt-2 mt-1 text-xs text-slate-400">
                Anchor Program • SPL Token-2022
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon="home_work"           label="Total Properties"    value={loading ? "—" : total}     accent="bg-slate-100 text-slate-500" />
            <StatCard icon="hourglass_empty"      label="Pending Verification" value={loading ? "—" : pending}   accent="bg-amber-50 text-amber-500" />
            <StatCard icon="verified_user"        label="Verified"            value={loading ? "—" : verified}  accent="bg-green-50 text-green-600" />
            <StatCard icon="generating_tokens"    label="Tokenized"           value={loading ? "—" : tokenized} accent="bg-teal-50 text-teal-600" />
          </div>

          {/* How it works */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-5">How it works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { step: "1", icon: "upload_file", title: "Submit Asset", desc: "Upload your title deed. We hash the document and store the proof on Solana.", color: "bg-primary/5 text-primary" },
                { step: "2", icon: "policy", title: "Verification", desc: "Our service cross-checks against government registries (RERA / Bhoomi / MCD).", color: "bg-amber-50 text-amber-600" },
                { step: "3", icon: "generating_tokens", title: "Tokenize", desc: "Mint fractional SPL tokens representing ownership shares of the property.", color: "bg-teal-50 text-teal-600" },
                { step: "4", icon: "payments", title: "Earn Yield", desc: "Token holders receive rental income proportionally via on-chain rent distribution.", color: "bg-purple-50 text-purple-600" },
              ].map(({ step, icon, title, desc, color }) => (
                <div key={step} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3 hover:shadow-sm transition-shadow">
                  <div className={`size-10 rounded-xl flex items-center justify-center ${color}`}>
                    <span className="material-symbols-outlined text-[22px]">{icon}</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 mb-0.5">Step {step}</p>
                    <h3 className="font-bold text-slate-900">{title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Properties */}
          {recentProps.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-900">Recent Properties</h2>
                <Link href="/properties" className="text-sm text-primary hover:underline font-medium">View all</Link>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
                {recentProps.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="size-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px] text-slate-400">home_work</span>
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 truncate">{p.address}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border shrink-0 ${
                      p.status === "verified"             ? "bg-green-100 text-green-700 border-green-200" :
                      p.status === "tokenized"            ? "bg-teal-100 text-teal-700 border-teal-200" :
                      p.status === "pending_verification" ? "bg-amber-100 text-amber-700 border-amber-200" :
                      "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {p.status.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
