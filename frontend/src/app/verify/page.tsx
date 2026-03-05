"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitProperty, type PropertyType } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";

interface FormData {
  name: string;
  address: string;
  city: string;
  property_type: PropertyType;
  area_sqft: string;
  asset_value_inr: string;
  owner_wallet: string;
  document_url: string;
  image_url: string;
}

const STEPS = ["Property Details", "Document Hash", "Sign & Submit"];

export default function VerifyPage() {
  const { user } = useAuth();
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
    image_url: "",
  });

  useEffect(() => {
    if (user?.wallet) {
      setForm(prev => ({ ...prev, owner_wallet: user.wallet }));
    }
  }, [user]);

  const [fileSelected, setFileSelected] = useState<string | null>(null);
  const [imageFileSelected, setImageFileSelected] = useState<string | null>(null);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFileSelected(file.name);
      // In production: upload to S3/IPFS and get a URL back
      setForm((prev) => ({ ...prev, image_url: `https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=2000` }));
    }
  };

  const handleSubmit = async () => {
    if (!user) {
        setError("You must be logged in to sign this transaction.");
        return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      const resp = await submitProperty({
        owner_wallet:    user.wallet,
        name:            form.name,
        address:         `${form.address}, ${form.city}`,
        city:            form.city,
        property_type:   form.property_type,
        area_sqft:       form.area_sqft ? Number(form.area_sqft) : undefined,
        asset_value_inr: form.asset_value_inr
          ? Math.round(Number(form.asset_value_inr.replace(/,/g, "")) * 100)
          : undefined,
        document_url:    form.document_url || undefined,
        image_url:       form.image_url || undefined,
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
      <div className="flex-grow flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#10B981]/10 rounded-full blur-[150px] pointer-events-none"></div>
        <div className="glass-panel rounded-3xl shadow-card p-6 md:p-12 max-w-lg w-full space-y-6 md:space-y-8 relative z-10 border-white/10">
          <div className="size-20 md:size-24 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto border border-[#10B981]/30 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            <span className="material-symbols-outlined text-[40px] md:text-[48px] text-[#10B981]">verified</span>
          </div>
          <div>
            <h2 className="text-3xl font-light text-white heading-display mb-2">Protocol Initiated</h2>
            <p className="text-slate-400 font-light">
              Your cryptographic proof has been submitted to the decentralized oracle for registry verification.
            </p>
          </div>
          <div className="bg-black/40 border border-white/5 rounded-2xl p-5 text-left space-y-4 font-mono text-xs overflow-hidden">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <span className="text-slate-500 uppercase tracking-widest text-[10px]">Property ID</span>
              <span className="text-slate-300 max-w-[200px] truncate">{result.property_id}</span>
            </div>
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <span className="text-slate-500 uppercase tracking-widest text-[10px]">Proof Hash</span>
              <span className="text-[#00F0FF] max-w-[200px] truncate">{result.metadata_hash}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 uppercase tracking-widest text-[10px]">Oracle Status</span>
              <span className="text-[#F59E0B] font-bold flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-[#F59E0B] animate-pulse"></span>
                AWAITING VERIFICATION
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 italic">{result.message}</p>
          <Link
            href="/properties"
            className="block w-full py-4 bg-gradient-to-r from-primary to-primary-light text-black rounded-xl font-bold uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow"
          >
            Go to Asset Registry
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col antialiased text-slate-300 relative">
      <main className="flex-grow px-6 py-12 md:py-20 relative">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="max-w-3xl mx-auto space-y-12 relative z-10">
          
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-400 mb-6 font-medium uppercase tracking-widest">
              <Link href="/properties" className="hover:text-primary transition-colors">Asset Registry</Link>
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              <span className="text-white">Initialize Tokenization</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-light text-white tracking-tight heading-display mb-4">Digitize Asset</h2>
            <p className="text-slate-400 font-light max-w-xl mx-auto text-base md:text-lg">
              Submit legal property deeds. We compute a Zero-Knowledge hash to be verified against the official government registry.
            </p>
          </div>

          {/* Stepper */}
          <div className="flex flex-col md:flex-row items-center justify-between relative px-2 mb-10 gap-8 md:gap-0">
            <div className="hidden md:block absolute left-6 right-6 top-1/2 -translate-y-1/2 h-[1px] bg-white/10 -z-10"></div>
            <div className="md:hidden absolute left-1/2 top-6 bottom-6 w-[1px] bg-white/10 -z-10 -translate-x-1/2"></div>
            {STEPS.map((s, i) => (
              <div key={s} className="flex md:flex-col flex-row items-center gap-4 bg-[#060606] px-4 md:px-2 relative">
                <div className={`size-10 md:size-12 rounded-full flex items-center justify-center font-bold transition-all duration-500 shrink-0 ${
                  i < step ? "bg-primary text-black shadow-glow" : i === step ? "bg-white/10 text-white border border-primary shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.2)]" : "bg-white/5 text-slate-600 border border-white/5"
                }`}>
                  {i < step ? <span className="material-symbols-outlined text-[18px] md:text-[20px]">check</span> : i + 1}
                </div>
                <span className={`text-[10px] md:text-xs font-bold uppercase tracking-widest md:absolute md:-bottom-8 md:translate-y-2 whitespace-nowrap ${i === step ? "text-primary" : "text-slate-500"}`}>{s}</span>
              </div>
            ))}
          </div>

          <div className="mt-16"></div>

          {/* Form Card */}
          <div className="glass-panel rounded-3xl shadow-card p-6 md:p-10 border-white/10 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-[#00F0FF] opacity-50"></div>

            {/* Step 0: Property Details */}
            {step === 0 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <h3 className="text-2xl font-light text-white heading-display mb-8">Asset Specifications</h3>
                <div className="space-y-6">
                  <label className="block group">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors">Property Title / Name</span>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. The Obsidian Tower"
                      className="w-full h-14 px-5 border border-white/10 rounded-xl bg-black/40 focus:bg-white/5 focus:border-primary outline-none transition-all text-white placeholder:text-slate-600 font-light text-lg" />
                  </label>
                  <label className="block group">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors">Physical Address</span>
                    <input name="address" value={form.address} onChange={handleChange} placeholder="Plot 42, Financial District"
                      className="w-full h-14 px-5 border border-white/10 rounded-xl bg-black/40 focus:bg-white/5 focus:border-primary outline-none transition-all text-white placeholder:text-slate-600 font-light text-lg" />
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block group">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors">City / Jurisdiction</span>
                      <input name="city" value={form.city} onChange={handleChange} placeholder="Neo-Mumbai"
                        className="w-full h-14 px-5 border border-white/10 rounded-xl bg-black/40 focus:bg-white/5 focus:border-primary outline-none transition-all text-white placeholder:text-slate-600 font-light text-lg" />
                    </label>
                    <label className="block group">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors">Asset Class</span>
                      <select name="property_type" value={form.property_type} onChange={handleChange}
                        className="w-full h-14 px-5 border border-white/10 rounded-xl bg-black/40 focus:bg-white/5 focus:border-primary outline-none transition-all text-white font-light text-lg appearance-none">
                        <option value="commercial">Commercial Space</option>
                        <option value="residential">Residential Unit</option>
                        <option value="land">Raw Land / Plot</option>
                        <option value="warehouse">Industrial / Warehouse</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block group">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors">Total Area (SQ.FT)</span>
                      <input name="area_sqft" value={form.area_sqft} onChange={handleChange} placeholder="5000" type="number"
                        className="w-full h-14 px-5 border border-white/10 rounded-xl bg-black/40 focus:bg-white/5 focus:border-primary outline-none transition-all text-white placeholder:text-slate-600 font-light text-lg" />
                    </label>
                    <label className="block group">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors">Market Valuation (INR)</span>
                      <div className="relative">
                        <span className="absolute left-5 text-slate-500 font-light top-1/2 -translate-y-1/2 text-lg">₹</span>
                        <input name="asset_value_inr" value={form.asset_value_inr} onChange={handleChange} placeholder="500,000,000"
                          className="w-full h-14 pl-10 pr-5 border border-white/10 rounded-xl bg-black/40 focus:bg-white/5 focus:border-primary outline-none transition-all text-white placeholder:text-slate-600 font-light text-lg" />
                      </div>
                    </label>
                  </div>

                  <label className="block group">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors">Cover Image (URL or Upload)</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
                    <div className="flex flex-col sm:flex-row gap-4">
                      <label htmlFor="image-upload" className="h-14 px-5 border border-white/10 rounded-xl bg-black/40 hover:bg-white/5 cursor-pointer flex items-center justify-center text-slate-400 font-light whitespace-nowrap shrink-0 transition-colors">
                         <span className="material-symbols-outlined mr-2">image</span> {imageFileSelected ? "Image Selected" : "Select Image"}
                      </label>
                      <input name="image_url" value={form.image_url} onChange={handleChange} placeholder="e.g. https://images.unsplash.com/..."
                        className="w-full h-14 px-5 border border-white/10 rounded-xl bg-black/40 focus:bg-white/5 focus:border-primary outline-none transition-all text-white placeholder:text-slate-600 font-light text-sm" />
                    </div>
                  </label>

                  <label className="block group opacity-70">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Connected Principal UID (Clerk)</span>
                    <input name="owner_wallet" value={form.owner_wallet} readOnly placeholder="Not connected"
                      className="w-full h-14 px-5 border border-white/5 rounded-xl bg-black/60 text-slate-400 cursor-not-allowed outline-none font-mono text-sm" />
                  </label>
                </div>
                <div className="mt-10 pt-8 border-t border-white/5 flex justify-end">
                  <button
                    onClick={() => setStep(1)}
                    disabled={!form.name || !form.address || !form.city}
                    className="w-full sm:w-auto px-10 py-4 bg-primary disabled:bg-white/5 disabled:text-slate-500 disabled:shadow-none text-black font-bold uppercase tracking-widest text-sm rounded-xl transition-all hover:bg-primary-light shadow-glow hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Proceed Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Document Upload */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <h3 className="text-2xl font-light text-white heading-display mb-2">Document Cryptography</h3>
                <p className="text-white/60 font-light mb-8">Upload the root title deed. We compute a Zero-Knowledge hash to embed in the smart contract.</p>
                
                <div className="border border-dashed border-white/20 rounded-2xl p-8 md:p-12 flex flex-col items-center gap-6 bg-black/20 hover:border-primary/50 transition-colors group">
                  <div className="size-16 md:size-20 rounded-full bg-white/5 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <span className="material-symbols-outlined text-[32px] md:text-[40px] text-white/50 group-hover:text-primary">enhanced_encryption</span>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-white text-lg">Select encrypted file</p>
                    <p className="text-sm text-slate-500 mt-2">Accepted formats: PDF or High-Res Image (Max 10MB)</p>
                  </div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" id="doc-upload" />
                  <label htmlFor="doc-upload"
                    className="w-full sm:w-auto px-8 py-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-xs md:text-sm font-bold uppercase tracking-widest text-white cursor-pointer transition-all text-center">
                    Browse Local Storage
                  </label>
                </div>

                {fileSelected && (
                  <div className="mt-6 flex items-center gap-4 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl p-5">
                    <span className="material-symbols-outlined text-[#10B981] text-[28px]">lock_closed</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-white truncate">{fileSelected}</p>
                      <p className="text-xs text-[#10B981] font-mono mt-1">Hash SHA-256 awaiting execution</p>
                    </div>
                    <span className="material-symbols-outlined text-[#10B981]">check_circle</span>
                  </div>
                )}

                <div className="mt-8 bg-transparent border border-white/10 rounded-xl p-6 text-sm flex gap-4">
                  <span className="material-symbols-outlined shrink-0 text-[#00F0FF] mt-1 text-[24px]">info</span>
                  <div>
                    <p className="font-bold text-white uppercase tracking-widest text-[10px] mb-2">Immutable Privacy Protocol</p>
                    <p className="font-light text-slate-400 leading-relaxed">
                      Your document's content is never exposed to public ledgers. A deterministic cryptographic sequence representing the file is cross-referenced with Oracle DBs to guarantee authenticity without breaching confidence.
                    </p>
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-4">
                  <button onClick={() => setStep(0)} className="w-full sm:flex-1 py-4 border border-white/10 text-slate-300 hover:text-white font-bold uppercase tracking-widest text-sm rounded-xl hover:bg-white/5 transition-all order-2 sm:order-1">Go Back</button>
                  <button onClick={() => setStep(2)} className="w-full sm:flex-[2] py-4 bg-[#00F0FF] text-black font-bold uppercase tracking-widest text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:scale-[1.02] active:scale-[0.98] order-1 sm:order-2">Confirm Hash & Proceed</button>
                </div>
              </div>
            )}

            {/* Step 2: Review & Submit */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <h3 className="text-2xl font-light text-white heading-display mb-8">Sign & Authorize Submission</h3>
                
                <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden text-sm mb-8 font-mono">
                  <div className="px-6 py-4 bg-white/5 border-b border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Execution Payload</p>
                  </div>
                  <div className="divide-y divide-white/5 px-6">
                    {[
                      ["PROPERTY.TITLE", form.name],
                      ["PROPERTY.ADDR", `${form.address}, ${form.city}`],
                      ["ASSET.CLASS", form.property_type],
                      ["ASSET.SIZE", form.area_sqft ? `${Number(form.area_sqft).toLocaleString()} SQ.FT` : "UNKNOWN"],
                      ["ASSET.VALUE", form.asset_value_inr ? `INR ${form.asset_value_inr}` : "UNKNOWN"],
                      ["DOCUMENT.HASH", fileSelected ?? "NULL_REFERENCE"],
                      ["PRINCIPAL.UID", form.owner_wallet || "UNKNOWN_CALLER"],
                    ].map(([key, val]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:justify-between py-4 gap-2">
                        <span className="text-slate-500 text-xs">{key}</span>
                        <span className="text-[#00F0FF] max-w-[300px] truncate text-left sm:text-right">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/20 rounded-xl p-6 text-sm flex gap-4 mb-8">
                  <span className="material-symbols-outlined text-[#F59E0B] text-[24px] shrink-0">gavel</span>
                  <div>
                    <p className="font-bold text-[#F59E0B] uppercase tracking-widest text-[10px] mb-2">Legal Disclaimer</p>
                    <p className="text-amber-100/60 font-light leading-relaxed">
                      By signing this transaction, you agree to submit the hashed asset for cross-verification. Immutable on-chain records cannot be tampered with or revoked.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400 flex gap-3 mb-8">
                    <span className="material-symbols-outlined text-[20px]">error</span>
                    {error}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => setStep(1)} className="w-full sm:flex-1 py-4 border border-white/10 text-slate-300 hover:text-white font-bold uppercase tracking-widest text-sm rounded-xl hover:bg-white/5 transition-all order-2 sm:order-1">Decline</button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`w-full sm:flex-[2] py-4 text-black font-bold uppercase tracking-widest text-sm rounded-xl transition-all flex items-center justify-center gap-3 order-1 sm:order-2 ${isSubmitting ? "bg-slate-400 cursor-wait" : "bg-primary hover:bg-primary-light shadow-glow hover:scale-[1.02] active:scale-[0.98]"}`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
                        Executing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[20px]">fingerprint</span>
                        Authorize On-Chain
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="bg-transparent border border-white/10 rounded-2xl p-6 md:p-8 mt-12">
            <h4 className="text-xl font-light text-white flex items-center gap-3 mb-6 heading-display">
              <span className="size-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] text-[#00F0FF]">account_tree</span>
              </span>
              Execution Workflow
            </h4>
            <ol className="space-y-4 text-slate-400 font-light list-none ml-2 border-l border-white/10 pl-6 relative">
              <li className="relative"><span className="absolute -left-[30px] top-1.5 size-2 rounded-full bg-white/20"></span>You submit immutable property records & title deed.</li>
              <li className="relative"><span className="absolute -left-[30px] top-1.5 size-2 rounded-full bg-[#00F0FF] shadow-[0_0_5px_#00F0FF]"></span>Our validators encode a <code className="text-[#00F0FF] bg-white/5 px-1.5 rounded text-xs font-mono ml-1 border border-white/5">SHA-256 ZK Proof</code>.</li>
              <li className="relative"><span className="absolute -left-[30px] top-1.5 size-2 rounded-full bg-[#F59E0B]"></span>Initialization instruction recorded to Solana mainnet: <strong className="text-[#F59E0B] font-medium uppercase tracking-widest text-[10px] ml-1">Pending</strong>.</li>
              <li className="relative"><span className="absolute -left-[30px] top-1.5 size-2 rounded-full bg-white/20"></span>Decentralized oracle queries official jurisdictional ledgers.</li>
              <li className="relative"><span className="absolute -left-[30px] top-1.5 size-2 rounded-full bg-[#10B981]"></span>Oracles attest validity on-chain via smart contracts: <strong className="text-[#10B981] font-medium uppercase tracking-widest text-[10px] ml-1">Verified</strong>.</li>
              <li className="relative"><span className="absolute -left-[30px] top-1.5 size-2 rounded-full bg-white/20"></span>Asset unlocks for SPL Token-2022 fractionalization.</li>
            </ol>
          </div>

        </div>
      </main>
    </div>
  );
}
