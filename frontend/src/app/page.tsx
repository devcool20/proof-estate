"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { listProperties, type Property } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/explore?query=${encodeURIComponent(searchQuery)}`);
    }
  };

  useEffect(() => {
    listProperties()
      .then(setProperties)
      .catch(() => {/* backend offline — show zeros */})
      .finally(() => setLoading(false));
  }, []);

  const recentProps = properties.slice(0, 6);

  return (
    <div className="flex-grow flex flex-col font-sans" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      <main className="flex-grow">
        
        {/* Hero Section */}
        <section className="relative w-full h-[500px] md:h-[650px] lg:h-[750px] overflow-hidden -mt-[73px]">
          {/* Background image should be a beautiful city/landscape */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>
          </div>
          
          <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 pt-32">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-[10px] font-semibold tracking-widest uppercase mb-4 border border-white/30">
              Let us guide your home
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 heading-display text-center drop-shadow-xl tracking-tight leading-tight">
              Believe in finding it
            </h1>
            <p className="text-white/95 text-sm md:text-base font-medium mb-8 text-center drop-shadow-md max-w-xl">
              Search tokenized properties for sale and to rent across the globe with transparent on-chain verification.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="w-full max-w-2xl bg-white rounded-full p-1.5 flex items-center shadow-2xl">
              <span className="material-symbols-outlined text-slate-400 pl-3 text-[20px]">search</span>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter Name, Keywords..."
                className="flex-grow bg-transparent border-none outline-none px-3 text-sm text-slate-700 placeholder:text-slate-400 font-medium"
              />
              <button type="submit" className="bg-primary hover:bg-primary-light transition-colors text-white size-9 rounded-full flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">search</span>
              </button>
            </form>
            
            {/* Quick Filters */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
              <button className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold border border-white/30 transition-all flex items-center gap-1.5 shadow-lg">
                <span className="material-symbols-outlined text-[14px]">apartment</span>
                Modern Villa
              </button>
              <button className="px-4 py-2 rounded-full bg-white text-slate-900 text-xs font-semibold shadow-xl transition-all flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px] text-primary">business</span>
                Apartment
              </button>
              <button className="px-4 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-semibold border border-white/30 transition-all flex items-center gap-1.5 shadow-lg">
                <span className="material-symbols-outlined text-[14px]">home</span>
                Town House
              </button>
            </div>
          </div>
        </section>

        {/* Why You Should Work With Us */}
        <section className="py-12 px-6 max-w-6xl mx-auto text-center">
          <h2 className="text-xl md:text-2xl font-bold heading-display mb-2" style={{ color: 'var(--text)' }}>Why You Should Work With Us</h2>
          <p className="font-medium text-sm max-w-xl mx-auto mb-10" style={{ color: 'var(--text-secondary)' }}>
            We provide institutional grade tokenization and seamless discovery for the next generation of real estate investors.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center group">
              <div className="size-11 rounded-xl shadow-md flex items-center justify-center mb-4 group-hover:-translate-y-1 transition-transform" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <span className="material-symbols-outlined text-xl" style={{ color: 'var(--text)' }}>domain</span>
              </div>
              <h3 className="text-sm font-bold mb-1.5 heading-display" style={{ color: 'var(--text)' }}>Wide Range of Properties</h3>
              <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'var(--text-secondary)' }}>We offer expert legal help for all related property items in local and global markets.</p>
            </div>
            
            <div className="flex flex-col items-center group">
              <div className="size-11 rounded-xl shadow-md flex items-center justify-center mb-4 group-hover:-translate-y-1 transition-transform" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <span className="material-symbols-outlined text-xl" style={{ color: 'var(--text)' }}>real_estate_agent</span>
              </div>
              <h3 className="text-sm font-bold mb-1.5 heading-display" style={{ color: 'var(--text)' }}>Buy or Rent Homes</h3>
              <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'var(--text-secondary)' }}>Verify your home at the best market protocol and very quickly as well.</p>
            </div>
            
            <div className="flex flex-col items-center group">
              <div className="size-11 rounded-xl shadow-md flex items-center justify-center mb-4 group-hover:-translate-y-1 transition-transform" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <span className="material-symbols-outlined text-xl" style={{ color: 'var(--text)' }}>verified_user</span>
              </div>
              <h3 className="text-sm font-bold mb-1.5 heading-display" style={{ color: 'var(--text)' }}>Trusted Verification</h3>
              <p className="text-xs leading-relaxed max-w-xs" style={{ color: 'var(--text-secondary)' }}>On-chain validation of compliance documents giving absolute trust.</p>
            </div>
          </div>
        </section>

        {/* City Discover Cards */}
        <section className="py-6 px-6 max-w-6xl mx-auto">
           <div className="text-center mb-6">
            <h2 className="text-lg md:text-xl font-bold heading-display mb-1.5" style={{ color: 'var(--text)' }}>Find Properties in These Cities</h2>
            <p className="font-medium text-sm max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              Explore diverse global locations bringing real estate on-chain.
            </p>
           </div>
           
           <div className="flex gap-3 overflow-x-auto pb-6 snap-x scrollbar-hide">
              {[
                { name: 'Chicago', props: '2 Properties', img: '1494522855154-b72015a96f1b' },
                { name: 'Los Angeles', props: '1 Property', img: '1580659325016-16986cf1ebaa' },
                { name: 'Miami', props: '2 Properties', img: '1506929562872-bb23ee20fcb6' },
                { name: 'Florida', props: '2 Properties', img: '1582200230303-12fb1aed89c4' },
                { name: 'New York', props: '5 Properties', img: '1496442226666-8d4d0e62e6e9' }
              ].map((city, idx) => (
                <div key={idx} className="min-w-[150px] w-[150px] h-[210px] rounded-xl overflow-hidden relative group cursor-pointer snap-center shadow-sm">
                  <img src={`https://images.unsplash.com/photo-${city.img}?q=80&w=400&auto=format&fit=crop`} alt={city.name} onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=400"; }} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-3 left-3">
                    <h4 className="text-white font-bold heading-display text-sm">{city.name}</h4>
                    <p className="text-white/80 text-[10px] font-medium">{city.props}</p>
                  </div>
                </div>
              ))}
           </div>
        </section>

        {/* Featured Properties */}
        <section className="py-10 px-6 max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-xl md:text-2xl font-bold heading-display mb-2" style={{ color: 'var(--text)' }}>Featured Properties</h2>
            <p className="font-medium text-sm max-w-xl mx-auto mb-5" style={{ color: 'var(--text-secondary)' }}>
              Explore our verified, tokenized real estate assets from around the world.
            </p>
            
            <div className={`inline-flex items-center p-0.5 rounded-full border ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-slate-200 border-slate-300'
            }`}>
              <button className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                isDark ? 'bg-white/10 shadow text-white' : 'bg-white shadow text-slate-900'
              }`}>All Properties</button>
              <button className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}>For Sale</button>
              <button className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
              }`}>For Rent</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-[16px] overflow-hidden shadow-sm border border-slate-200 block animate-pulse">
                  <div className="h-[160px] w-full bg-slate-200/60" />
                  <div className="p-4">
                    <div className="h-4 w-3/4 bg-slate-200/60 rounded mb-3" />
                    <div className="h-3 w-1/2 bg-slate-200/60 rounded mb-4" />
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="h-4 w-1/3 bg-slate-200/60 rounded" />
                      <div className="h-3 w-1/4 bg-slate-200/60 rounded" />
                    </div>
                  </div>
                </div>
              ))
            ) : recentProps.length === 0 ? (
              <div className="col-span-full py-24 rounded-[32px] text-center flex flex-col items-center justify-center animate-fade-up bg-white border border-slate-200 shadow-sm">
                 <div className="size-24 rounded-full bg-blue-50/50 border border-blue-100 flex items-center justify-center mx-auto mb-6 shadow-[inset_0_2px_10px_rgba(17,107,251,0.05)] text-primary">
                   <span className="material-symbols-outlined text-[40px]">key</span>
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 heading-display mb-3">No active properties</h3>
                 <p className="text-[15px] font-medium text-slate-500 max-w-sm mx-auto mb-8 leading-relaxed">There are currently no featured properties available on the protocol. Connect your wallet and verify an asset!</p>
              </div>
            ) : (
              recentProps.map((p, i) => (
                <Link href={`/properties/${p.id}`} key={p.id} className={`rounded-[16px] overflow-hidden shadow-sm hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 group border block animate-fade-up ${
                  isDark ? 'bg-[var(--bg-card)] border-white/5 hover:border-white/15' : 'bg-white border-slate-200 hover:border-slate-300'
                }`} style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="relative h-[160px] w-full overflow-hidden">
                    <img 
                      src={p.images && p.images.length > 0 ? p.images[0] : `https://images.unsplash.com/photo-${[
                        '1600596542815-ffad4c1539a9',
                        '1512917774080-9991f1c4c750',
                        '1600607687920-4e2a868f0bbb',
                        '1512917774080-9991f1c4c750',
                        '1600607687920-4e2a868f0bbb',
                        '1600596542815-ffad4c1539a9'
                      ][i % 6]}?q=80&w=600&auto=format&fit=crop`}
                      alt={p.name}
                      onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=600"; }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 bg-slate-100"
                    />
                    <div className="absolute top-3 left-3">
                      {p.status === 'tokenized' ? (
                        <span className="bg-[#10B981] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-md">For Sale</span>
                      ) : (
                        <span className="bg-[#116BFB] text-white text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md shadow-md">{p.status.replace("_", " ")}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                  <h3 className="text-sm font-bold mb-1 truncate heading-display" style={{ color: 'var(--text)' }}>{p.name}</h3>
                    <p className="text-xs flex items-center gap-1 mb-3 truncate" style={{ color: 'var(--text-secondary)' }}>
                      <span className="material-symbols-outlined text-[14px]">location_on</span>
                      {p.address}
                    </p>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div>
                        <span className="text-sm font-bold text-primary">
                          {p.token_price_usd ? `$${p.token_price_usd.toLocaleString()}` : p.asset_value_inr ? `₹${(p.asset_value_inr / 100000).toFixed(2)} L` : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                        <span className="flex items-center gap-0.5"><span className="material-symbols-outlined text-[14px]">square_foot</span> {p.area_sqft || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          
          {user?.role === 'investor' && (
            <div className="mt-8 text-center">
              <Link href="/explore" className="inline-flex items-center justify-center gap-1.5 bg-slate-900 border border-slate-800 text-white font-bold px-5 py-2.5 rounded-lg text-xs transition-all shadow-sm hover:shadow-lg hover:-translate-y-1 active:scale-95">
                See All Listings <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          )}
        </section>
        
      </main>
    </div>
  );
}
