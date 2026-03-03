"use client";
import { useState, useEffect } from "react";
import { listProperties, verifyProperty, type Property } from "@/lib/api";
import Link from "next/link";

export default function AdminPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const data = await listProperties();
      setProperties(data.filter(p => p.status === "pending_verification"));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, approved: boolean) => {
    setProcessingId(id);
    try {
      const res = await verifyProperty(id, "VerifierWallet-1111111111", approved, approved ? "Verified against government registry" : "Document mismatch");
      alert(res.message);
      // Refresh list
      fetchProperties();
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="bg-background-light text-slate-900 font-sans min-h-screen flex flex-col antialiased">
      <main className="flex-grow px-6 py-10">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Government Verifier Dashboard</h1>
              <p className="text-slate-500 text-sm">Review property documents against land registries and approve for on-chain status.</p>
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
              <p className="text-slate-500 text-sm max-w-xs">There are no properties currently pending verification in the system.</p>
              <button 
                onClick={fetchProperties}
                className="text-primary hover:underline text-sm font-bold flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Check for new submissions
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {properties.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-sm transition-shadow">
                <div className="space-y-2 flex-grow min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-0.5 rounded uppercase tracking-wider">New Submission</span>
                    <span className="text-xs text-slate-400">ID: {p.id}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight">{p.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-slate-500">
                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                    {p.address}
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs font-medium pt-2 text-slate-400">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                      Owner: {p.owner_wallet.slice(0, 12)}...
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                      Submitted: {p.submitted_at ? new Date(p.submitted_at).toLocaleString() : "Recently"}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0 md:min-w-[200px]">
                  <Link 
                    href={p.document_url || "#"} 
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
                      className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-sm shadow-green-200 flex items-center justify-center gap-2 disabled:opacity-50"
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
      </main>
    </div>
  );
}
