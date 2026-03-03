"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitProperty, type PropertyType } from "@/lib/api";

interface FormData {
  name: string;
  address: string;
  city: string;
  property_type: PropertyType;
  area_sqft: string;
  asset_value_inr: string;
  owner_wallet: string;
  document_url: string;
}

const STEPS = ["Property Details", "Document Upload", "Review & Submit"];

export default function VerifyPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    name: "",
    address: "",
    city: "",
    property_type: "commercial",
    area_sqft: "",
    asset_value_inr: "",
    owner_wallet: "",
    document_url: "",
  });
  const [fileSelected, setFileSelected] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ property_id: string; metadata_hash: string; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileSelected(file.name);
      // In production: upload to S3/IPFS and get a URL back
      setForm((prev) => ({ ...prev, document_url: `https://docs.proofestate.io/${file.name}` }));
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const resp = await submitProperty({
        owner_wallet:    form.owner_wallet || "AnonymousWallet111111111111111111111111111",
        name:            form.name,
        address:         `${form.address}, ${form.city}`,
        city:            form.city,
        property_type:   form.property_type,
        area_sqft:       form.area_sqft ? Number(form.area_sqft) : undefined,
        asset_value_inr: form.asset_value_inr
          ? Math.round(Number(form.asset_value_inr.replace(/,/g, "")) * 100)
          : undefined,
        document_url:    form.document_url || undefined,
      });
      setResult(resp);
      setStep(3); // success screen
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success screen
  if (step === 3 && result) {
    return (
      <div className="bg-background-light min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 max-w-lg w-full space-y-6">
          <div className="size-20 bg-green-100 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50">
            <span className="material-symbols-outlined text-4xl text-green-600">check_circle</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Submission Received!</h2>
          <p className="text-slate-500 text-sm">
            Your property has been submitted for government registry verification. You will be notified once the status changes to <strong>Verified</strong>.
          </p>
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 text-left space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-slate-400">Property ID</span>
              <span className="text-slate-700 max-w-[200px] truncate">{result.property_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Metadata Hash</span>
              <span className="text-slate-700 max-w-[200px] truncate">{result.metadata_hash}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className="text-amber-600 font-semibold">Pending Verification</span>
            </div>
          </div>
          <p className="text-xs text-slate-400">{result.message}</p>
          <Link
            href="/properties"
            className="block w-full py-3 bg-primary text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all"
          >
            View My Properties
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background-light text-slate-900 font-sans min-h-screen flex flex-col antialiased">
      <main className="flex-grow px-6 py-10">
        <div className="max-w-2xl mx-auto space-y-8">
          
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
              <Link href="/properties" className="hover:text-primary transition-colors">My Properties</Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-slate-700 font-medium">Submit New Asset</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Submit Asset for Verification</h2>
            <p className="text-slate-500 mt-2 text-sm">
              Once submitted, our system checks the property against government registries and stores an immutable proof on Solana.
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  i < step ? "bg-primary text-white" : i === step ? "bg-primary text-white ring-4 ring-primary/20" : "bg-slate-100 text-slate-400"
                }`}>
                  {i < step ? <span className="material-symbols-outlined text-[14px]">check</span> : i + 1}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-slate-900" : "text-slate-400"}`}>{s}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-primary" : "bg-slate-100"}`} />}
              </div>
            ))}
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6">

            {/* Step 0: Property Details */}
            {step === 0 && (
              <>
                <h3 className="text-lg font-bold text-slate-900">Property Details</h3>
                <div className="space-y-4">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700 block mb-1">Property Name *</span>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Sunrise Commercial Tower, Andheri"
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700 block mb-1">Street Address *</span>
                    <input name="address" value={form.address} onChange={handleChange} placeholder="e.g. Plot 42, MIDC, Andheri East"
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" />
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 block mb-1">City *</span>
                      <input name="city" value={form.city} onChange={handleChange} placeholder="Mumbai"
                        className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 block mb-1">Property Type</span>
                      <select name="property_type" value={form.property_type} onChange={handleChange}
                        className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm">
                        <option value="commercial">Commercial</option>
                        <option value="residential">Residential</option>
                        <option value="land">Land / Plot</option>
                        <option value="warehouse">Warehouse</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 block mb-1">Area (sq.ft)</span>
                      <input name="area_sqft" value={form.area_sqft} onChange={handleChange} placeholder="5000" type="number"
                        className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 block mb-1">Estimated Value (₹)</span>
                      <input name="asset_value_inr" value={form.asset_value_inr} onChange={handleChange} placeholder="5,00,00,000"
                        className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm" />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-700 block mb-1">Owner Wallet Address (Solana)</span>
                    <input name="owner_wallet" value={form.owner_wallet} onChange={handleChange} placeholder="Your Solana wallet public key (auto-filled if wallet connected)"
                      className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm font-mono" />
                  </label>
                </div>
                <button
                  onClick={() => setStep(1)}
                  disabled={!form.name || !form.address || !form.city}
                  className="w-full py-3 bg-primary hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl transition-all"
                >
                  Continue
                </button>
              </>
            )}

            {/* Step 1: Document Upload */}
            {step === 1 && (
              <>
                <h3 className="text-lg font-bold text-slate-900">Upload Documents</h3>
                <p className="text-sm text-slate-500">Upload your title deed, sale agreement, or government registry document. We'll compute a SHA-256 hash and store it on-chain as immutable proof.</p>
                
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center gap-4 hover:border-primary/40 transition-colors">
                  <div className="size-14 rounded-full bg-primary/5 flex items-center justify-center">
                    <span className="material-symbols-outlined text-3xl text-primary">upload_file</span>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-700">Drag & drop or click to upload</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG – max 10MB</p>
                  </div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange}
                    className="hidden" id="doc-upload" />
                  <label htmlFor="doc-upload"
                    className="px-5 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                    Choose File
                  </label>
                </div>

                {fileSelected && (
                  <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-lg p-3">
                    <span className="material-symbols-outlined text-green-600">description</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800 truncate">{fileSelected}</p>
                      <p className="text-xs text-green-600">SHA-256 hash will be computed on upload</p>
                    </div>
                    <span className="material-symbols-outlined text-green-600">check_circle</span>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700 flex gap-3">
                  <span className="material-symbols-outlined shrink-0 mt-0.5">info</span>
                  <div>
                    <p className="font-semibold">Why do we need your documents?</p>
                    <p className="text-xs text-blue-600 mt-1">
                      Our system checks your title deed against government land registries (like DIGI-locker / Bhoomi / RERA). Only the cryptographic hash of your document is stored on Solana — never the document itself.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all">Back</button>
                  <button onClick={() => setStep(2)} className="flex-1 py-3 bg-primary hover:bg-slate-800 text-white font-bold rounded-xl transition-all">Continue</button>
                </div>
              </>
            )}

            {/* Step 2: Review & Submit */}
            {step === 2 && (
              <>
                <h3 className="text-lg font-bold text-slate-900">Review & Submit</h3>
                <div className="space-y-3 text-sm">
                  {[
                    ["Property Name", form.name],
                    ["Address", `${form.address}, ${form.city}`],
                    ["Type", form.property_type],
                    ["Area", form.area_sqft ? `${Number(form.area_sqft).toLocaleString()} sq.ft` : "—"],
                    ["Asset Value", form.asset_value_inr ? `₹${form.asset_value_inr}` : "—"],
                    ["Document", fileSelected ?? "None uploaded"],
                    ["Owner Wallet", form.owner_wallet || "Not connected"],
                  ].map(([key, val]) => (
                    <div key={key} className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-400">{key}</span>
                      <span className="text-slate-900 font-medium max-w-[280px] truncate text-right">{val}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-700 flex gap-2">
                  <span className="material-symbols-outlined text-[16px] shrink-0">warning</span>
                  After submission, our verification service will cross-check the property with government registries. This may take 1–3 business days. You cannot edit the submission once it is on-chain.
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex gap-2">
                    <span className="material-symbols-outlined text-[16px]">error</span>
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all">Back</button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`flex-1 py-3 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${isSubmitting ? "bg-slate-400 cursor-not-allowed" : "bg-primary hover:bg-slate-800"}`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">send</span>
                        Submit for Verification
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Info box */}
          <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">account_tree</span>
              How the Verification Process Works
            </h4>
            <ol className="space-y-2 text-sm text-slate-500 list-decimal list-inside">
              <li>You submit property details and a scanned title deed.</li>
              <li>Our backend computes a <code className="text-xs bg-slate-100 px-1 rounded">SHA-256</code> hash of your document.</li>
              <li>The hash is sent to Solana via the <code className="text-xs bg-slate-100 px-1 rounded">initialize_property</code> instruction. Status: <strong className="text-amber-600">Pending</strong>.</li>
              <li>A trusted verifier checks the document against government registries (RERA / Bhoomi / Municipal records).</li>
              <li>Once cleared, the verifier calls <code className="text-xs bg-slate-100 px-1 rounded">verify_property</code> on-chain. Status: <strong className="text-green-600">Verified</strong>.</li>
              <li>You can now tokenize the property into SPL fractional tokens.</li>
            </ol>
          </div>

        </div>
      </main>
    </div>
  );
}
