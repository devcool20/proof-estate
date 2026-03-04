"use client";
import { useState, useEffect } from "react";
import { listProperties, verifyProperty, approveTokenize, getDocUrl, type Property } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import Link from "next/link";

export default function AdminPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const data = await listProperties();
      setProperties(data.filter(p => p.status === "pending_verification" || p.status === "pending_tokenization"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, approved: boolean) => {
    setProcessingId(id);
    try {
      const res = await verifyProperty(id, user?.wallet || "AdminWallet", approved, approved ? "Verified against government registry" : "Document mismatch");
      alert(res.message);
      fetchProperties();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleApproveTokenization = async (id: string) => {
    setProcessingId(id);
    try {
      const res = await approveTokenize(id, user?.wallet || "AdminWallet");
      alert(`Success! Token Mint: ${res.token_mint}`);
      fetchProperties();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (user && user.role !== "admin") {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <h1 className="text-xl font-bold text-slate-800">You must be an admin to view this page.</h1>
        </div>
    );
  }

  const verifications = properties.filter(p => p.status === "pending_verification");
  const tokenizations = properties.filter(p => p.status === "pending_tokenization");

  return (
    <div className="bg-background-light text-slate-900 font-sans min-h-screen flex flex-col antialiased">
      <main className="flex-grow px-6 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Admin Dashboard</h1>
              <p className="text-slate-500 text-sm">Review property verifications and tokenization requests.</p>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center p-20">
              <span className="material-symbols-outlined text-4xl animate-spin text-primary">refresh</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && properties.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-20 text-center flex flex-col items-center gap-4">
              <span className="material-symbols-outlined text-6xl text-slate-100">task</span>
              <h3 className="text-xl font-bold text-slate-900">Queue Clear</h3>
              <p className="text-slate-500 text-sm max-w-xs">There are no pending actions in the system.</p>
              <button 
                onClick={fetchProperties}
                className="text-primary hover:underline text-sm font-bold flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Check for new requests
              </button>
            </div>
          )}

          {/* Pending Verifications */}
          {!loading && !error && verifications.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">policy</span>
                Pending Verification ({verifications.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {verifications.map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-sm transition-shadow">
                    <div className="space-y-2 flex-grow min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded uppercase tracking-wider">Verification Request</span>
                        <span className="text-xs text-slate-400">ID: {p.id}</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">{p.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {p.address}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0 md:min-w-[200px]">
                      <Link 
                        href={getDocUrl(p.document_url)} 
                        target="_blank"
                        className="flex-1 w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">description</span>
                        View Documents
                      </Link>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify(p.id, false)}
                          disabled={processingId === p.id}
                          className="flex-1 px-4 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-bold hover:bg-red-100 transition-all transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleVerify(p.id, true)}
                          disabled={processingId === p.id}
                          className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-sm shadow-green-200 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {processingId === p.id ? (
                            <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-[18px]">verified_user</span>
                              Approve
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Tokenizations */}
          {!loading && !error && tokenizations.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600">generating_tokens</span>
                Tokenization Requests ({tokenizations.length})
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {tokenizations.map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-sm transition-shadow">
                    <div className="space-y-2 flex-grow min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded uppercase tracking-wider">Tokenize Request</span>
                        <span className="text-xs text-slate-400">ID: {p.id}</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 leading-tight">{p.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <span className="material-symbols-outlined text-[16px]">location_on</span>
                        {p.address}
                      </div>
                      <div className="bg-slate-50 rounded p-3 mt-3 space-y-2 text-sm">
                        <div className="flex justify-between border-b border-slate-200 pb-1">
                          <span className="text-slate-500">Requested Supply</span>
                          <span className="font-semibold">{p.token_supply?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-1">
                          <span className="text-slate-500">Price per Token</span>
                          <span className="font-semibold">${p.token_price_usd}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Yield / Freq</span>
                          <span className="font-semibold text-teal-600">{p.yield_percent}% {p.dist_frequency}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0 md:min-w-[200px]">
                      <button
                        onClick={() => handleApproveTokenization(p.id)}
                        disabled={processingId === p.id}
                        className="flex-1 w-full px-4 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {processingId === p.id ? (
                          <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[18px]">gavel</span>
                            Execute Token Mint
                          </>
                        )}
                      </button>
                    </div>
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
