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

const STEPS = ["Property Details", "Document Hash", "Sign & Submit"];

export default function VerifyPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const card = isDark ? 'bg-[var(--bg-card)] border-white/5' : 'bg-white border-slate-200';
  const inputCls = isDark
    ? 'border-white/10 bg-[var(--bg-input)] text-white placeholder:text-slate-500 focus:border-primary'
    : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-primary';
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
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileSelected(file.name);
      setForm((prev) => ({ ...prev, document_url: `https://docs.proofestate.io/${file.name}` }));
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

  // Success screen
  if (step === 3 && result) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center relative min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#10B981]/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className={`rounded-[20px] shadow-xl p-6 md:p-8 max-w-md w-full space-y-5 relative z-10 border ${card}`}>
          <div className="size-14 md:size-16 bg-[#10B981]/10 rounded-full flex items-center justify-center mx-auto border border-[#10B981]/30 shadow-sm animate-bounce-slow">
            <span className="material-symbols-outlined text-[28px] md:text-[32px] text-[#10B981]">verified</span>
          </div>
          <div>
            <h2 className="text-xl font-bold heading-display mb-2" style={{ color: 'var(--text)' }}>Protocol Initiated</h2>
            <p className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>
              Your cryptographic proof has been submitted to the decentralized oracle for registry verification.
            </p>
          </div>
          <div className={`rounded-xl p-4 text-left space-y-3 font-mono text-[11px] overflow-hidden shadow-inner border ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
            <div className={`flex justify-between items-center pb-2.5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <span className="font-bold uppercase tracking-widest text-[9px]" style={{ color: 'var(--text-secondary)' }}>Property ID</span>
              <span className="font-bold max-w-[180px] truncate" style={{ color: 'var(--text)' }}>{result.property_id}</span>
            </div>
            <div className={`flex justify-between items-center pb-2.5 border-b ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
              <span className="font-bold uppercase tracking-widest text-[9px]" style={{ color: 'var(--text-secondary)' }}>Proof Hash</span>
              <span className="text-primary font-bold max-w-[180px] truncate">{result.metadata_hash}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold uppercase tracking-widest text-[9px]" style={{ color: 'var(--text-secondary)' }}>Oracle Status</span>
              <span className="text-[#F59E0B] font-bold flex items-center gap-1.5 text-[11px]">
                <span className="size-1.5 rounded-full bg-[#F59E0B] animate-pulse"></span>
                AWAITING VERIFICATION
              </span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic font-medium">{result.message}</p>
          <Link
            href="/properties"
            className="block w-full py-2.5 bg-primary text-white rounded-lg font-bold uppercase tracking-widest text-[11px] hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
          >
            Go to Asset Registry
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex flex-col antialiased min-h-screen relative" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <main className="flex-grow px-6 py-8 md:py-14 relative">
        <div className="absolute top-0 right-1/4 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="max-w-2xl mx-auto space-y-8 relative z-10">
          
          {/* Header */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs mb-4 font-bold uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
              <Link href="/properties" className="hover:text-primary transition-colors">Asset Registry</Link>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              <span style={{ color: 'var(--text)' }}>Initialize Tokenization</span>
            </div>
            <h2 className="text-xl md:text-3xl font-bold tracking-tight heading-display mb-2" style={{ color: 'var(--text)' }}>Digitize Asset</h2>
            <p className="font-medium max-w-lg mx-auto text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>
              Submit legal property deeds. We compute a Zero-Knowledge hash to be verified against the official government registry.
            </p>
          </div>

          {/* Stepper */}
          <div className="flex flex-col md:flex-row items-center justify-between relative px-2 mb-6 gap-6 md:gap-0">
            <div className="hidden md:block absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 rounded-full -z-10" style={{ backgroundColor: 'var(--border)' }}></div>
            <div className="md:hidden absolute left-1/2 top-4 bottom-4 w-0.5 rounded-full -z-10 -translate-x-1/2" style={{ backgroundColor: 'var(--border)' }}></div>
            {STEPS.map((s, i) => (
              <div key={s} className="flex md:flex-col flex-row items-center gap-3 px-3 md:px-2 relative" style={{ backgroundColor: 'var(--bg)' }}>
                <div className={`size-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-500 shrink-0 border-[3px] ${
                  i < step
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : i === step
                    ? `text-primary border-primary shadow-lg ${isDark ? 'bg-[var(--bg-card)]' : 'bg-white'}`
                    : `text-slate-400 border-slate-200 shadow-sm ${isDark ? 'bg-[var(--bg-card)]' : 'bg-white'}`
                }`} style={i >= step ? { borderColor: i === step ? undefined : 'var(--border)' } : {}}>
                  {i < step ? <span className="material-symbols-outlined text-[16px]">check</span> : i + 1}
                </div>
                <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-widest md:absolute md:-bottom-6 md:translate-y-2 whitespace-nowrap ${i === step ? "text-primary" : "text-slate-500"}`}>{s}</span>
              </div>
            ))}
          </div>

          <div className="mt-10"></div>

          {/* Form Card */}
          <div className={`rounded-[20px] shadow-sm border p-5 md:p-7 relative overflow-hidden ${card}`}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-light"></div>

            {/* Step 0: Property Details */}
            {step === 0 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <h3 className="text-lg font-bold heading-display mb-5" style={{ color: 'var(--text)' }}>Asset Specifications</h3>
                <div className="space-y-4">
                  <label className="block group">
                    <span className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 group-focus-within:text-primary transition-colors" style={{ color: 'var(--text-secondary)' }}>Property Title / Name</span>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. The Obsidian Tower"
                      className={`w-full h-10 px-3 border rounded-lg focus:ring-1 focus:ring-primary/50 outline-none transition-all font-medium text-sm shadow-sm ${inputCls}`} />
                  </label>
                  <label className="block group">
                    <span className="text-[10px] font-bold uppercase tracking-widest block mb-1.5 group-focus-within:text-primary transition-colors" style={{ color: 'var(--text-secondary)' }}>Physical Address</span>
                    <input name="address" value={form.address} onChange={handleChange} placeholder="Plot 42, Financial District"
                      className={`w-full h-10 px-3 border rounded-lg focus:ring-1 focus:ring-primary/50 outline-none transition-all font-medium text-sm shadow-sm ${inputCls}`} />
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block group">
                      <span className="text-[11px] font-bold uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors" style={{ color: 'var(--text-secondary)' }}>City / Jurisdiction</span>
                      <input name="city" value={form.city} onChange={handleChange} placeholder="Neo-Mumbai"
                        className={`w-full h-10 px-3 border rounded-lg focus:ring-1 focus:ring-primary/50 outline-none transition-all font-medium text-sm shadow-sm ${inputCls}`} />
                    </label>
                    <label className="block group">
                      <span className="text-[11px] font-bold uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors" style={{ color: 'var(--text-secondary)' }}>Asset Class</span>
                      <select name="property_type" value={form.property_type} onChange={handleChange}
                        className={`w-full h-10 px-3 border rounded-lg focus:ring-1 focus:ring-primary/50 outline-none transition-all font-medium text-sm shadow-sm appearance-none ${inputCls}`}>
                        <option value="commercial">Commercial Space</option>
                        <option value="residential">Residential Unit</option>
                        <option value="land">Raw Land / Plot</option>
                        <option value="warehouse">Industrial / Warehouse</option>
                      </select>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block group">
                      <span className="text-[11px] font-bold uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors" style={{ color: 'var(--text-secondary)' }}>Total Area (SQ.FT)</span>
                      <input name="area_sqft" value={form.area_sqft} onChange={handleChange} placeholder="5000" type="number"
                        className={`w-full h-10 px-3 border rounded-lg focus:ring-1 focus:ring-primary/50 outline-none transition-all font-medium text-sm shadow-sm ${inputCls}`} />
                    </label>
                    <label className="block group">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block mb-2 group-focus-within:text-primary transition-colors">Market Valuation (INR)</span>
                      <div className="relative">
                        <span className="absolute left-3 font-bold top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-secondary)' }}>₹</span>
                        <input name="asset_value_inr" value={form.asset_value_inr} onChange={handleChange} placeholder="500,000,000"
                          className={`w-full h-10 pl-7 pr-3 border rounded-lg focus:ring-1 focus:ring-primary/50 outline-none transition-all font-medium text-sm shadow-sm ${inputCls}`} />
                      </div>
                    </label>
                  </div>

                  <label className="block group">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5 group-focus-within:text-primary transition-colors">Cover Image (URL or Upload)</span>
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" id="image-upload" />
                    <div className="flex flex-col sm:flex-row gap-3">
                      <label htmlFor="image-upload" className={`h-10 px-4 border rounded-lg cursor-pointer flex items-center justify-center font-bold text-xs whitespace-nowrap shrink-0 transition-colors shadow-sm ${isDark ? 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                         <span className="material-symbols-outlined mr-1.5 text-[16px]">image</span> {imageFileSelected ? "Image Selected" : "Select Image"}
                      </label>
                      <input name="image_url" value={form.image_url} onChange={handleChange} placeholder="e.g. https://images.unsplash.com/..."
                        className={`w-full h-10 px-3 border rounded-lg focus:ring-1 focus:ring-primary/50 outline-none transition-all font-medium text-xs shadow-sm ${inputCls}`} />
                    </div>
                  </label>

                  <label className="block group opacity-70">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Connected Principal UID (Clerk)</span>
                    <input name="owner_wallet" value={form.owner_wallet} readOnly placeholder="Not connected"
                      className={`w-full h-10 px-3 border rounded-lg cursor-not-allowed outline-none font-mono text-xs shadow-inner ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500'}`} />
                  </label>
                  {/* Description */}
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-widest mb-3 block" style={{ color: 'var(--text-secondary)' }}>Property Description</span>
                    <textarea name="description" value={form.description} onChange={handleChange} placeholder="Describe the property, its features, and investment potential..."
                      rows={4}
                      className={`w-full px-5 py-4 border rounded-xl focus:ring-1 focus:ring-primary/50 outline-none transition-all font-medium resize-none shadow-sm ${inputCls}`} />
                  </label>

                  {/* Building Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <label className="block">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Total Floors</span>
                      <input name="total_floors" value={form.total_floors} onChange={handleChange} placeholder="15" type="number"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/50  outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium text-sm shadow-sm" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Parking Spaces</span>
                      <input name="parking_spaces" value={form.parking_spaces} onChange={handleChange} placeholder="50" type="number"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/50  outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium text-sm shadow-sm" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Construction Year</span>
                      <input name="construction_year" value={form.construction_year} onChange={handleChange} placeholder="2020" type="number"
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary/50  outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium text-sm shadow-sm" />
                    </label>
                  </div>

                  {/* Market Analysis */}
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-widest mb-3 block" style={{ color: 'var(--text-secondary)' }}>Market Analysis</span>
                    <textarea name="market_analysis" value={form.market_analysis} onChange={handleChange} placeholder="Current market conditions, comparable properties, growth projections..."
                      rows={3}
                      className={`w-full px-5 py-4 border rounded-xl focus:ring-1 focus:ring-primary/50 outline-none transition-all font-medium resize-none shadow-sm ${inputCls}`} />
                  </label>

                  {/* Legal Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <label className="block">
                      <span className="text-[11px] font-bold uppercase tracking-widest mb-3 block" style={{ color: 'var(--text-secondary)' }}>Legal Status</span>
                      <select name="legal_status" value={form.legal_status} onChange={handleChange}
                        className={`w-full h-10 px-3 border rounded-lg focus:ring-1 focus:ring-primary/50 outline-none transition-all font-medium text-sm shadow-sm ${inputCls}`}>
                        <option value="clear">Clear Title</option>
                        <option value="pending">Pending Clearance</option>
                        <option value="disputed">Under Dispute</option>
                        <option value="encumbered">Encumbered</option>
                      </select>
                    </label>
                    <label className="flex items-center gap-3 pt-8 cursor-pointer">
                      <input type="checkbox" name="environmental_clearance" checked={form.environmental_clearance} 
                        onChange={(e) => setForm(prev => ({ ...prev, environmental_clearance: e.target.checked }))}
                        className="w-6 h-6 rounded border-slate-300 bg-white text-primary focus:ring-primary/50 shadow-sm cursor-pointer" />
                      <span className="text-slate-800 font-bold">Environmental Clearance Obtained</span>
                    </label>
                  </div>
                </div>
                <div className={`mt-6 pt-5 flex justify-end border-t ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                  <button
                    onClick={() => setStep(1)}
                    disabled={!form.name || !form.address || !form.city}
                    className="w-full sm:w-auto px-6 py-2.5 bg-primary disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none text-white font-bold uppercase tracking-widest text-[11px] rounded-lg transition-all hover:bg-primary-dark shadow-md hover:shadow-lg hover:-translate-y-0.5"
                  >
                    Proceed Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Document Upload */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <h3 className="text-lg font-bold heading-display mb-1.5" style={{ color: 'var(--text)' }}>Document Cryptography</h3>
                <p className="font-medium mb-5 text-sm" style={{ color: 'var(--text-secondary)' }}>Upload the root title deed. We compute a Zero-Knowledge hash to embed in the smart contract.</p>
                
                <div className={`border-2 border-dashed rounded-[16px] p-5 md:p-8 flex flex-col items-center gap-4 hover:border-primary/50 transition-colors cursor-pointer group shadow-sm ${isDark ? 'border-white/10 bg-white/5 hover:bg-primary/5' : 'border-slate-200 bg-slate-50 hover:bg-blue-50/50'}`}>
                  <div className={`size-12 md:size-14 rounded-full border flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/10 group-hover:border-primary/30 transition-all shadow-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                    <span className="material-symbols-outlined text-[24px] md:text-[28px] text-slate-400 group-hover:text-primary transition-colors">enhanced_encryption</span>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-sm" style={{ color: 'var(--text)' }}>Select encrypted file</p>
                    <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>Accepted formats: PDF or High-Res Image (Max 10MB)</p>
                  </div>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="hidden" id="doc-upload" />
                  <label htmlFor="doc-upload"
                    className={`w-full sm:w-auto px-6 py-2.5 border shadow-sm rounded-lg text-[10px] md:text-[11px] font-bold uppercase tracking-widest cursor-pointer transition-all text-center ${isDark ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'}`}>
                    Browse Local Storage
                  </label>
                </div>

                {fileSelected && (
                  <div className="mt-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm">
                    <span className="material-symbols-outlined text-[#10B981] text-[24px]">lock_closed</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{fileSelected}</p>
                      <p className="text-xs text-[#10B981] font-bold font-mono mt-0.5">Hash SHA-256 awaiting execution</p>
                    </div>
                    <span className="material-symbols-outlined text-[#10B981] text-[24px]">check_circle</span>
                  </div>
                )}

                <div className="mt-5 bg-blue-50 border border-blue-100 rounded-xl p-4 text-xs flex gap-3 shadow-sm">
                  <span className="material-symbols-outlined shrink-0 text-primary mt-0.5 text-[20px]">info</span>
                  <div>
                    <p className="font-bold text-primary uppercase tracking-widest text-[10px] mb-1">Immutable Privacy Protocol</p>
                    <p className="font-medium text-slate-600 leading-relaxed text-xs">
                      Your document's content is never exposed to public ledgers. A deterministic cryptographic sequence representing the file is cross-referenced with Oracle DBs to guarantee authenticity without breaching confidence.
                    </p>
                  </div>
                </div>

                <div className={`mt-6 pt-5 flex flex-col sm:flex-row gap-3 border-t ${isDark ? 'border-white/5' : 'border-slate-200'}`}>
                  <button onClick={() => setStep(0)} className={`w-full sm:flex-1 py-2.5 border-2 font-bold uppercase tracking-widest text-[11px] rounded-lg transition-all shadow-sm order-2 sm:order-1 ${isDark ? 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>Go Back</button>
                  <button onClick={() => setStep(2)} className="w-full sm:flex-[2] py-2.5 bg-primary hover:bg-primary-dark text-white font-bold uppercase tracking-widest text-[11px] rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 order-1 sm:order-2">Confirm Hash & Proceed</button>
                </div>
              </div>
            )}

            {/* Step 2: Review & Submit */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <h3 className="text-lg font-bold heading-display mb-5" style={{ color: 'var(--text)' }}>Sign & Authorize Submission</h3>
                
                <div className={`rounded-xl border overflow-hidden text-xs mb-5 font-mono shadow-inner ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
                  <div className={`px-4 py-3 border-b shadow-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-200'}`}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Execution Payload</p>
                  </div>
                  <div className={`divide-y px-4 font-medium ${isDark ? 'divide-white/5 text-slate-400' : 'divide-slate-200 text-slate-600'}`}>
                    {[
                      ["PROPERTY.TITLE", form.name],
                      ["PROPERTY.ADDR", `${form.address}, ${form.city}`],
                      ["ASSET.CLASS", form.property_type],
                      ["ASSET.SIZE", form.area_sqft ? `${Number(form.area_sqft).toLocaleString()} SQ.FT` : "UNKNOWN"],
                      ["ASSET.VALUE", form.asset_value_inr ? `INR ${form.asset_value_inr}` : "UNKNOWN"],
                      ["DOCUMENT.HASH", fileSelected ?? "NULL_REFERENCE"],
                      ["PRINCIPAL.UID", form.owner_wallet || "UNKNOWN_CALLER"],
                    ].map(([key, val]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:justify-between py-3 gap-1.5">
                        <span className="text-slate-500 font-bold text-[10px]">{key}</span>
                        <span className="text-slate-900 font-bold max-w-[250px] truncate text-left sm:text-right bg-white px-2 py-0.5 rounded border border-slate-100 text-[11px]">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs flex gap-3 mb-5 shadow-sm">
                  <span className="material-symbols-outlined text-amber-500 text-[20px] shrink-0">gavel</span>
                  <div>
                    <p className="font-bold text-amber-600 uppercase tracking-widest text-[10px] mb-1">Legal Disclaimer</p>
                    <p className="text-amber-800 font-medium leading-relaxed text-xs">
                      By signing this transaction, you agree to submit the hashed asset for cross-verification. Immutable on-chain records cannot be tampered with or revoked.
                    </p>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-600 flex gap-3 mb-5 font-bold shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">error</span>
                    {error}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button onClick={() => setStep(1)} className="w-full sm:flex-1 py-2.5 border-2 border-slate-200 text-slate-600 font-bold uppercase tracking-widest text-[11px] rounded-lg hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm order-2 sm:order-1">Decline</button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className={`w-full sm:flex-[2] py-2.5 text-white font-bold uppercase tracking-widest text-[11px] rounded-lg transition-all flex items-center justify-center gap-2 order-1 sm:order-2 shadow-md ${isSubmitting ? "bg-slate-400 cursor-wait shadow-none" : "bg-primary hover:bg-primary-dark hover:shadow-lg hover:-translate-y-0.5"}`}
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined text-[18px] animate-spin">autorenew</span>
                        Executing...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">fingerprint</span>
                        Authorize On-Chain
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Info box */}
          <div className="bg-white border border-slate-200 rounded-[16px] p-5 md:p-7 mt-8 shadow-sm">
            <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-5 heading-display">
              <span className="size-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-[16px] text-primary">account_tree</span>
              </span>
              Execution Workflow
            </h4>
            <ol className="space-y-4 text-slate-600 font-medium text-xs list-none ml-4 border-l-2 border-slate-100 pl-6 relative">
              <li className="relative"><span className="absolute -left-[29px] top-1 size-2.5 border-[2px] border-white rounded-full bg-slate-300 shadow-sm"></span>You submit immutable property records & title deed.</li>
              <li className="relative"><span className="absolute -left-[29px] top-1 size-2.5 border-[2px] border-white rounded-full bg-primary shadow-sm"></span>Our validators encode a <code className="text-primary bg-primary/5 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ml-0.5 border border-primary/20">SHA-256 ZK Proof</code>.</li>
              <li className="relative"><span className="absolute -left-[29px] top-1 size-2.5 border-[2px] border-white rounded-full bg-[#F59E0B] shadow-sm"></span>Initialization instruction recorded to Solana mainnet: <strong className="text-[#F59E0B] font-bold uppercase tracking-widest text-[9px] ml-0.5 bg-[#F59E0B]/10 px-1.5 py-0.5 rounded">Pending</strong>.</li>
              <li className="relative"><span className="absolute -left-[29px] top-1 size-2.5 border-[2px] border-white rounded-full bg-slate-300 shadow-sm"></span>Decentralized oracle queries official jurisdictional ledgers.</li>
              <li className="relative"><span className="absolute -left-[29px] top-1 size-2.5 border-[2px] border-white rounded-full bg-[#10B981] shadow-sm"></span>Oracles attest validity on-chain via smart contracts: <strong className="text-[#10B981] font-bold uppercase tracking-widest text-[9px] ml-0.5 bg-[#10B981]/10 px-1.5 py-0.5 rounded">Verified</strong>.</li>
              <li className="relative"><span className="absolute -left-[29px] top-1 size-2.5 border-[2px] border-white rounded-full bg-slate-300 shadow-sm"></span>Asset unlocks for SPL Token-2022 fractionalization.</li>
            </ol>
          </div>

        </div>
      </main>
    </div>
  );
}
