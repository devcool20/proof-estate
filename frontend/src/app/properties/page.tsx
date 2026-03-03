"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { listProperties, type Property } from "@/lib/api";

const STATUS_LABEL: Record<string, { label: string; color: string; icon: string }> = {
  draft:                { label: "Draft",        color: "bg-slate-100 text-slate-500 border-slate-200",  icon: "draft" },
  pending_verification: { label: "Under Review", color: "bg-amber-100 text-amber-700 border-amber-200",  icon: "hourglass_empty" },
  verified:             { label: "Verified",     color: "bg-green-100 text-green-700 border-green-200",  icon: "verified_user" },
  tokenized:            { label: "Tokenized",    color: "bg-teal-100 text-teal-700 border-teal-200",     icon: "generating_tokens" },
  rejected:             { label: "Rejected",     color: "bg-red-100 text-red-700 border-red-200",        icon: "cancel" },
};

function formatInr(paise?: number) {
  if (!paise) return "—";
  const crore = paise / 1_00_00_000;
  if (crore >= 1) return `₹${crore.toFixed(2)} Cr`;
  const lakh = paise / 1_00_000;
  return `₹${lakh.toFixed(1)} L`;
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProperties()
      .then(setProperties)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-background-light text-slate-900 font-sans min-h-screen flex flex-col antialiased">
      <main className="flex-grow px-6 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">My Properties</h2>
              <p className="text-slate-500 text-sm">Manage your real estate assets — from submission through on-chain tokenization.</p>
            </div>
            <Link
              href="/verify"
              className="bg-primary hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Submit New Asset
            </Link>
          </div>

          {/* Status legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(STATUS_LABEL).map(([key, { label, color, icon }]) => (
              <span key={key} className={`px-3 py-1 rounded-full border font-medium flex items-center gap-1 ${color}`}>
                <span className="material-symbols-outlined text-[14px]">{icon}</span>
                {label}
              </span>
            ))}
          </div>

          {/* Content */}
          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 h-72 animate-pulse" />
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 flex items-center gap-3">
              <span className="material-symbols-outlined">error</span>
              <p>Could not reach the backend: <code className="text-sm">{error}</code>. Make sure the backend is running on port 8080.</p>
            </div>
          )}

          {!loading && !error && properties.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 flex flex-col items-center text-center gap-4">
              <div className="size-16 rounded-full bg-slate-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-slate-400">home_work</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">No properties yet</h3>
              <p className="text-slate-500 text-sm">Submit your first asset for on-chain verification.</p>
              <Link href="/verify" className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold mt-2">
                Submit Asset
              </Link>
            </div>
          )}

          {!loading && !error && properties.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {properties.map((prop) => {
                const st = STATUS_LABEL[prop.status] || STATUS_LABEL["draft"];
                return (
                  <div key={prop.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-md transition-shadow">
                    {/* Image */}
                    <div className="h-44 w-full bg-gradient-to-br from-slate-200 to-slate-300 relative flex items-end p-4">
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 to-transparent" />
                      <div className="relative z-10 flex items-end justify-between w-full">
                        <span className="text-white font-semibold text-sm flex items-center gap-1 drop-shadow">
                          <span className="material-symbols-outlined text-[16px]">domain</span>
                          {prop.property_type ?? "Property"}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full border text-xs font-bold flex items-center gap-1 backdrop-blur-sm bg-white/5 ${st.color}`}>
                          <span className="material-symbols-outlined text-[13px]">{st.icon}</span>
                          {st.label}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-5 flex flex-col flex-grow gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">{prop.name}</h3>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{prop.address}</p>
                      </div>

                      <div className="flex gap-4 text-sm">
                        <div>
                          <p className="text-slate-400 text-xs">Asset Value</p>
                          <p className="font-semibold text-slate-800">{formatInr(prop.asset_value_inr)}</p>
                        </div>
                        {prop.token_supply && (
                          <div>
                            <p className="text-slate-400 text-xs">Token Supply</p>
                            <p className="font-semibold text-slate-800">{prop.token_supply.toLocaleString()}</p>
                          </div>
                        )}
                        {prop.yield_percent && (
                          <div>
                            <p className="text-slate-400 text-xs">Yield</p>
                            <p className="font-semibold text-teal-600">{prop.yield_percent}% p.a.</p>
                          </div>
                        )}
                      </div>

                      {/* Hash / Mint */}
                      {prop.metadata_hash && (
                        <p className="font-mono text-[10px] text-slate-300 truncate">
                          hash: {prop.metadata_hash}
                        </p>
                      )}
                      {prop.token_mint && (
                        <p className="font-mono text-[10px] text-teal-400 truncate">
                          mint: {prop.token_mint}
                        </p>
                      )}

                      {/* CTA */}
                      <div className="mt-auto pt-4 border-t border-slate-100">
                        {prop.status === "verified" && (
                          <Link
                            href={`/tokenize?id=${prop.id}`}
                            className="w-full py-2.5 bg-primary hover:bg-slate-800 text-white rounded-lg font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[18px]">generating_tokens</span>
                            Tokenize this Asset
                          </Link>
                        )}
                        {prop.status === "tokenized" && (
                          <div className="w-full py-2.5 bg-teal-50 border border-teal-100 text-teal-700 rounded-lg font-semibold text-sm flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            Tokenized on Solana
                          </div>
                        )}
                        {prop.status === "pending_verification" && (
                          <div className="w-full py-2.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-lg font-medium text-sm flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">hourglass_empty</span>
                            Awaiting Verification
                          </div>
                        )}
                        {prop.status === "rejected" && (
                          <div className="w-full py-2.5 bg-red-50 border border-red-100 text-red-600 rounded-lg font-medium text-sm flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">cancel</span>
                            Verification Rejected
                          </div>
                        )}
                        {prop.status === "draft" && (
                          <div className="w-full py-2.5 bg-slate-50 border border-slate-100 text-slate-400 rounded-lg font-medium text-sm flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">lock</span>
                            Submit for Verification
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
