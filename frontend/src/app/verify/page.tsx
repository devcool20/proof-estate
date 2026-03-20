"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { submitProperty, type PropertyType } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";

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
  description: string;
  amenities: string[];
  location_benefits: string[];
  market_analysis: string;
  risk_assessment: string;
  legal_status: string;
  environmental_clearance: boolean;
  building_approvals: string[];
  total_floors: string;
  parking_spaces: string;
  construction_year: string;
  last_renovation_year: string;
}

const STEPS = ["Asset Initialization", "Cryptographic Proof", "Authorization"];

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
    description: "",
    amenities: [],
    location_benefits: [],
    market_analysis: "",
    risk_assessment: "",
    legal_status: "clear",
    environmental_clearance: false,
    building_approvals: [],
    total_floors: "",
    parking_spaces: "",
    construction_year: "",
    last_renovation_year: "",
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileSelected(file.name);
      setForm((prev) => ({ ...prev, document_url: `https://docs.ProofEstate.io/${file.name}` }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFileSelected(file.name);
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

  const inputCls = "bg-transparent border-b border-white/20 text-white text-lg font-light pb-2 focus:outline-none focus:border-[#d4af37] transition-all placeholder:text-white/20";
  const labelCls = "text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] block mb-3 group-focus-within:text-[#d4af37] transition-colors";

  // Success screen
  if (step === 3 && result) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center relative min-h-screen bg-[#0f1419]">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#d4af37]/5 rounded-full blur-[150px] pointer-events-none"></div>
        
        <div className="bg-[#171c21] border border-white/5 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.5)] p-12 max-w-xl w-full relative z-10 animate-fade-in">
          <div className="size-16 bg-[#d4af37]/10 rounded-full flex items-center justify-center mx-auto border border-[#d4af37]/30 shadow-sm animate-pulse mb-8">
            <span className="material-symbols-outlined text-[32px] text-[#d4af37]">verified</span>
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-medium heading-display mb-2 text-white">Registry Initiated</h2>
            <p className="font-medium text-sm text-white/50 leading-relaxed">
              Your asset parameters have been cryptographically sealed and submitted to the decentralized oracle network.
            </p>
          </div>
          
          <div className="rounded-2xl bg-[#0a0e14] border border-white/5 p-6 text-left space-y-4 font-mono text-[10px] mb-8">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <span className="font-bold uppercase tracking-widest text-[#d4af37]">Protocol ID</span>
              <span className="font-bold max-w-[180px] truncate text-white">{result.property_id}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <span className="font-bold uppercase tracking-widest text-[#d4af37]">ZK Hash</span>
              <span className="text-white/80 font-bold max-w-[180px] truncate">{result.metadata_hash}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase tracking-widest text-[#d4af37]">Oracle State</span>
              <span className="text-[#f2ca50] font-bold flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#f2ca50] animate-pulse shadow-[0_0_10px_#f2ca50]"></span>
                AWAITING VALIDATION
              </span>
            </div>
          </div>
          
          <p className="text-[10px] text-white/30 italic font-medium mb-8 flex justify-center">{result.message}</p>
          
          <Link
            href="/properties"
            className="w-full btn-primary py-4 text-[10px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 transition-transform hover:scale-[1.02]"
          >
            Access The Vault <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col antialiased bg-[#0f1419] text-[#dee3ea] min-h-screen relative">
      <main className="flex-grow px-6 md:px-12 py-16 lg:py-24 relative z-10 w-full max-w-[1920px] mx-auto flex justify-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#d4af37]/5 rounded-full blur-[150px] pointer-events-none"></div>
        
        <div className="max-w-3xl w-full relative z-10">
          
          {/* Header */}
          <div className="text-center mb-16">
             <span className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase mb-4 block">
               Protocol Origination (Bharat Edition)
             </span>
             <h1 className="text-4xl md:text-5xl font-medium heading-display text-white mb-6">Asset Tokenization</h1>
             <p className="text-white/50 text-basis max-w-lg mx-auto leading-relaxed">
               Submit premium Indian real estate assets to the ProofEstate registry. All submissions undergo cryptographically-secured validation and SEBI-compliant verification steps.
             </p>
          </div>

          {/* Stepper */}
          <div className="flex flex-col md:flex-row justify-between mb-16 relative gap-8 md:gap-0">
            {STEPS.map((s, i) => (
              <div key={s} className={`flex flex-col items-center gap-4 relative z-10 transition-colors duration-500 ${i <= step ? 'text-[#d4af37]' : 'text-white/20'}`}>
                <div className={`size-12 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 border ${
                  i < step
                    ? 'bg-[#d4af37]/10 border-[#d4af37]/30 text-[#d4af37]'
                    : i === step
                    ? 'bg-[#d4af37] border-[#d4af37] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                    : 'bg-[#0a0e14] border-white/10 text-white/20'
                }`}>
                  {i < step ? <span className="material-symbols-outlined text-[18px]">check</span> : i + 1}
                </div>
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] whitespace-nowrap">{s}</span>
              </div>
            ))}
          </div>

          {/* Form Card */}
          <section className="bg-[#171c21] rounded-[2rem] p-8 md:p-12 border border-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
            
            {/* Step 0: Property Details */}
            {step === 0 && (
              <div className="animate-fade-in space-y-10">
                <h3 className="text-[9px] font-bold text-[#d4af37] uppercase tracking-[0.2em] flex items-center gap-3 pb-4 border-b border-white/5">
                  <span className="material-symbols-outlined text-[16px]">domain</span>
                  Physical Asset Specifications
                </h3>
                
                <div className="space-y-8">
                  <label className="block group">
                    <span className={labelCls}>Asset Designation</span>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="The Obsidian Pavilion" className={`w-full ${inputCls}`} />
                  </label>
                  
                  <label className="block group">
                    <span className={labelCls}>Geographic Coordination</span>
                    <input name="address" value={form.address} onChange={handleChange} placeholder="Sector 4, High Ridge" className={`w-full ${inputCls}`} />
                  </label>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <label className="block group">
                      <span className={labelCls}>Jurisdiction (City)</span>
                      <input name="city" value={form.city} onChange={handleChange} placeholder="Mumbai / Delhi / Dubai" className={`w-full ${inputCls}`} />
                    </label>
                    <label className="block group">
                      <span className={labelCls}>Asset Class</span>
                      <select name="property_type" value={form.property_type} onChange={handleChange} className={`w-full appearance-none ${inputCls} bg-[#171c21]`}>
                        <option value="commercial">Commercial Estate</option>
                        <option value="residential">Residential Reserve</option>
                        <option value="land">Undeveloped Territory</option>
                        <option value="warehouse">Industrial Hub</option>
                      </select>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <label className="block group">
                      <span className={labelCls}>Dimensional Volume (SQ.FT)</span>
                      <input name="area_sqft" value={form.area_sqft} onChange={handleChange} placeholder="12400" type="number" className={`w-full ${inputCls}`} />
                    </label>
                    <label className="block group">
                      <span className={labelCls}>Valuation Estimate (INR Crores)</span>
                      <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-white/20 text-lg">₹</span>
                        <input name="asset_value_inr" value={form.asset_value_inr} onChange={handleChange} placeholder="8.40" className={`w-full pl-6 ${inputCls}`} />
                      </div>
                    </label>
                  </div>

                  <label className="block group">
                    <span className={labelCls}>Primary Visual Representation</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
                    <div className="flex flex-col sm:flex-row gap-4 mt-2">
                      <label htmlFor="image-upload" className="h-[46px] px-6 border border-white/20 hover:border-[#d4af37] rounded-full cursor-pointer flex items-center justify-center font-bold text-[9px] uppercase tracking-[0.2em] whitespace-nowrap shrink-0 transition-colors text-white/70 hover:text-white">
                         <span className="material-symbols-outlined mr-2 text-[14px]">image</span> {imageFileSelected ? "Acquired" : "Select File"}
                      </label>
                      <input name="image_url" value={form.image_url} onChange={handleChange} placeholder="Or provide secure URI" className={`w-full ${inputCls}`} />
                    </div>
                  </label>

                  <label className="block group">
                    <span className={labelCls}>Architectural Context</span>
                    <textarea name="description" value={form.description} onChange={handleChange} placeholder="Outline the historical and architectural significance of the asset..." rows={3} className={`w-full resize-none ${inputCls}`} />
                  </label>
                </div>
                
                <div className="pt-8 flex justify-end border-t border-white/5">
                  <button
                    onClick={() => setStep(1)}
                    disabled={!form.name || !form.address || !form.city}
                    className="btn-primary py-4 px-12 text-[10px] uppercase font-bold tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:grayscale"
                  >
                    Proceed to Cryptography <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Document Upload */}
            {step === 1 && (
              <div className="animate-fade-in space-y-10">
                <h3 className="text-[9px] font-bold text-[#d4af37] uppercase tracking-[0.2em] flex items-center gap-3 pb-4 border-b border-white/5">
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Document Cryptography
                </h3>
                
                <p className="text-white/50 text-sm leading-relaxed">
                  Provide the root ownership deed, 7/12 extract, or Sale Deed. We compute a Zero-Knowledge hash to embed immutably onto the Solana network, ensuring title verification without public data exposure.
                </p>
                
                <div className="border border-dashed border-white/20 hover:border-[#d4af37] rounded-[2rem] p-12 flex flex-col items-center gap-6 transition-colors cursor-pointer group bg-[#0a0e14]">
                  <div className="size-16 rounded-full border border-white/10 group-hover:border-[#d4af37]/30 flex items-center justify-center group-hover:bg-[#d4af37]/5 transition-all shadow-[inset_0_0_15px_rgba(255,255,255,0.02)]">
                    <span className="material-symbols-outlined text-[32px] text-white/30 group-hover:text-[#d4af37] transition-colors font-light">enhanced_encryption</span>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-white text-lg heading-display mb-1">Select Encrypted Payload</p>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30 mt-2">PDF / TIFF / RAW (Max 20MB)</p>
                  </div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" id="doc-upload" />
                  <label htmlFor="doc-upload" className="px-8 py-3 mt-4 border border-white/20 hover:border-[#d4af37] text-white/60 hover:text-white rounded-full text-[9px] font-bold uppercase tracking-[0.2em] cursor-pointer transition-colors">
                    Access Local Files
                  </label>
                </div>

                {fileSelected && (
                  <div className="flex items-center gap-4 bg-[#d4af37]/5 border border-[#d4af37]/20 rounded-[1.5rem] p-6">
                    <span className="material-symbols-outlined text-[#d4af37] text-[24px]">lock_closed</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{fileSelected}</p>
                      <p className="text-[10px] text-[#d4af37] font-bold font-mono mt-1 tracking-widest uppercase">SHA-256 computation pending</p>
                    </div>
                  </div>
                )}

                <div className="pt-8 flex justify-between border-t border-white/5 items-center">
                  <button onClick={() => setStep(0)} className="text-white/40 hover:text-white text-[9px] font-bold uppercase tracking-[0.2em] transition-colors">
                    Revert
                  </button>
                  <button onClick={() => setStep(2)} className="btn-primary py-4 px-12 text-[10px] uppercase font-bold tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] transition-transform">
                    Confirm Payload <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Review & Submit */}
            {step === 2 && (
              <div className="animate-fade-in space-y-10">
                <h3 className="text-[9px] font-bold text-[#d4af37] uppercase tracking-[0.2em] flex items-center gap-3 pb-4 border-b border-white/5">
                  <span className="material-symbols-outlined text-[16px]">verified_user</span>
                  Protocol Authorization
                </h3>
                
                <div className="rounded-[1.5rem] border border-white/5 overflow-hidden bg-[#0a0e14] mb-8">
                  <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#d4af37]">Contract Parameters</p>
                  </div>
                  <div className="divide-y divide-white/5 px-6 font-mono text-[10px]">
                    {[
                      ["ASSET_ID", form.name],
                      ["GEO_LOC", `${form.address}, ${form.city}`],
                      ["CLASS", form.property_type.toUpperCase()],
                      ["VOL_SQ", form.area_sqft ? `${Number(form.area_sqft).toLocaleString()}` : "NULL"],
                      ["VAL_INR", form.asset_value_inr ? `₹${form.asset_value_inr} Cr` : "NULL"],
                      ["ZK_HASH", fileSelected ?? "NULL_REF"],
                      ["SIG", form.owner_wallet || "UNKNOWN"],
                    ].map(([key, val]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:justify-between py-4 gap-2">
                        <span className="text-white/40 font-bold uppercase">{key}</span>
                        <span className="text-white font-bold max-w-[250px] truncate text-left sm:text-right">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#d4af37]/5 border border-[#d4af37]/20 rounded-2xl p-6 flex gap-4">
                  <span className="material-symbols-outlined text-[#d4af37] text-[24px] shrink-0 font-light">gavel</span>
                  <div>
                     <p className="font-bold text-[#d4af37] uppercase tracking-[0.2em] text-[8px] mb-2">Legal Execution</p>
                     <p className="text-[#dee3ea]/70 font-medium leading-relaxed text-xs">
                        By authorizing this signature, you execute an irrevocable on-chain transaction. The asset will be locked into the registry for oracle verification.
                     </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-[10px] text-red-400 flex items-center gap-3 font-bold uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {error}
                  </div>
                )}

                <div className="pt-8 flex flex-col sm:flex-row justify-end items-center gap-6 border-t border-white/5">
                  <button onClick={() => setStep(1)} className="text-white/40 hover:text-white text-[9px] font-bold uppercase tracking-[0.2em] transition-colors order-2 sm:order-1">
                    Decline Signature
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="w-full sm:w-auto btn-primary py-4 px-12 text-[10px] font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale hover:scale-[1.02] transition-transform order-1 sm:order-2"
                  >
                    {isSubmitting ? (
                      <><span className="material-symbols-outlined text-[16px] animate-spin">autorenew</span> Executing...</>
                    ) : (
                      <><span className="material-symbols-outlined text-[16px]">fingerprint</span> Authorize Registry</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Workflow Note */}
          <div className="mt-16 text-center space-y-2">
            <span className="material-symbols-outlined text-white/20 text-3xl font-light">account_tree</span>
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/30">
              Protocol Sequence
            </p>
            <p className="text-white/40 text-xs max-w-sm mx-auto leading-relaxed">
              Origination &rarr; ZK Hash Encryption &rarr; Oracle Verification &rarr; SPL Fractionalization
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
