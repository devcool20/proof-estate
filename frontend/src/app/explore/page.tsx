import Link from 'next/link';
export default function ExplorePage() {
 return (
 <div className="relative flex h-full w-full flex-col group/design-root overflow-x-hidden bg-background-light ">
{/* Main Content Area */}
 <main className="flex-1 px-4 sm:px-8 lg:px-40 py-8 bg-background-light ">
 <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
 {/* Page Title */}
 <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
 <div>
 <h1 className="text-primary text-[32px] font-bold leading-tight tracking-tight">Commercial Exchange</h1>
 <p className="text-text-secondary-light mt-2">Institutional-grade real estate assets verified on-chain.</p>
 </div>
 <div className="flex gap-2">
 <button className="flex items-center gap-2 px-4 py-2 bg-white border border-border-light rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
 <span className="material-symbols-outlined text-[18px]">filter_list</span>
 Filter
 </button>
 <button className="flex items-center gap-2 px-4 py-2 bg-white border border-border-light rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm">
 <span className="material-symbols-outlined text-[18px]">sort</span>
 Sort
 </button>
 </div>
 </div>

 {/* Metrics Grid */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <MetricCard title="Active Listings" icon="domain" value="1,248" trend="12%" />
 <MetricCard title="Avg Yield" icon="percent" value="5.4%" trend="0.2%" />
 <MetricCard title="Total Volume" icon="monitoring" value="€842M" trend="5%" />
 <MetricCard title="Verified Properties" icon="verified" value="94%" trend="1.5%" iconColor="text-emerald-500" />
 </div>

 {/* Asset Type Filter Tabs */}
 <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
 <FilterTab active label="All Regions" />
 <FilterTab label="Office" />
 <FilterTab label="Retail" />
 <FilterTab label="Industrial" />
 <FilterTab label="Multi-family" />
 </div>

 {/* Listings Grid */}
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
 <ListingCard image="https://lh3.googleusercontent.com/aida-public/AB6AXuAbl5Q94jA_HWQSK4J8-CaxWj50yBkpJGEwajREcVcyFg5uxeukhTfMkCAn7OOpULr8K5eD1a3kHuZIUfgphfNmcp7OFCYMrKgTPNCNYeNb_R6elN-l5uBI7pyuAnlCI4EBWT46AuHuhemUtqKfTf6XUKz7sBwtu0bNHZjA1XLyh2rp-8joPE8WrMvIDU0ViHu_jkCpnGbR1Fb5tWjqZod_qNiqGwNzvflbGpgHmtYtDPvPy1dQbOHkVSpc62c41GTlOwoWJqJYzSYT"
 type="OFFICE"
 name="Metropolis Tower"
 trust="98/100 Trust"
 location="New York, NY"
 yieldRate="5.2%"
 price="$45.0M"
 />
 <ListingCard image="https://lh3.googleusercontent.com/aida-public/AB6AXuBuLONfqfveZ_7-3678cw5qvxuPHfly4cdrNQr0DXjnpIWsP8ocU4C0aK-5ApoZF0j4VnOENFs_epfZkNWo8rTVKaDZg4MQiuNN8Qic0r7jRRQ0TqPq9EJmqC04DsXjBAm7a2nTQTzwcEnfyPf4TmtYyqq53rPcE3qTvEEWdj1I5GgDEbrdHUPZ2VbBkicV9IMn6m3CVyqJ329dCyhjxWBFTlw2mOF0EhwdXDiTOs2v31fsWLoavI7CFvy_dcp5rfGqRXjbvqed8SkS"
 type="INDUSTRIAL"
 name="Harbor Logistics Hub"
 trust="95/100 Trust"
 location="Hamburg, DE"
 yieldRate="6.1%"
 price="€22.5M"
 />
 <ListingCard image="https://lh3.googleusercontent.com/aida-public/AB6AXuCLULX4EfVZo5JjHUHk9mwBMzOs4SLgUWVAAzEyelxkNw0jcfU1jGYUud3g4xhsO_Y5UK7t-6XyLSHNYqvmPsrgG5S9k5G4DCBeEl4eh6663S6UzXjn9FJNHEeCXJlzBZ8VTS6XNY_Flf2LjZgzztk2gfyXPMBRaDJ15nBKhCbGeiG-EVnG-JJQRK0BNPmXVk1TCypDt8dT7-ptn8zxO11UF_-35r1SO3HUiWdfUK1hWhMYPdblr-PwszjaETg7aHUY6E-TaNcwWAUD"
 type="RETAIL"
 name="Greenfield Retail Park"
 trust="92/100 Trust"
 location="London, UK"
 yieldRate="5.8%"
 price="£18.2M"
 />
 <ListingCard image="https://lh3.googleusercontent.com/aida-public/AB6AXuCsbib5zXGVqCy9C2qkzGrQCs65tE2ap60Uwbat2f6w3g7U3AOySRQLko6tKRQl1LlxTT-WEJW9f9QbjrjESQB1-peo_AjWvcefjjLeun2N2vAY0NzXgNzDSTI5jWKcIjYAopPqKeO6XXPG0VCePCaNqcge4EFvxlT8jmg5SP7Ymng-sW9_ZRZPwtR9-Kw2-nqsrDOvTewe7JWnbmmig_liiLHHmANH3H-Mxw4j_rY46TCqgQ7sEFTXC3mWTzWmYmsdslgFlA2z7-fz"
 type="OFFICE"
 name="Apex Office Complex"
 trust="99/100 Trust"
 location="San Francisco, CA"
 yieldRate="4.9%"
 price="$62.0M"
 />
 <ListingCard image="https://lh3.googleusercontent.com/aida-public/AB6AXuC2tPfKxi5ITGpTj8nqsP0uj3YM4HF_hSp_mgcc8M3TgXW_PET1-ViaEyvrtcROXaJjNkdU2lOyz6MdLYHn6UspZ568MShMeF2PEYWI3mqMvoQ7ECB-6knslpLqWvFlTL3FEi1vCf7KC2mE5Vrp0wGrug-xzKDm0m6OVAh0lCi5kz418nj_LIOGyTfKSMaRyqZ18N_ui6gscN9UTbWp9W4Um4Dh1eQvVZcReRW9G-abi7qM2uzg_JkQXVkO9ynARCaWPDvxPAmguQkk"
 type="MULTI-FAMILY"
 name="Riverfront Apartments"
 trust="94/100 Trust"
 location="Austin, TX"
 yieldRate="5.5%"
 price="$34.5M"
 />
 <ListingCard image="https://lh3.googleusercontent.com/aida-public/AB6AXuC0kybLAwEg5fYMYGxcm1bdqOdm8BdpJSk5kunwX0nR3sp-Y5lEQ4eYHP4DDzPDlmOP-YD_h1OVNEC0RPc-xpXMzyBxVsusIImHu5RDetJN0APUaaHbMcX_tvWDUFLbJuP8u6JH2oHCR6i3khoioIhhxBdPfUQ-lWA3_j_n7eajmXT9lDBqXVzsbaEx5Vm9VN9oFmlfy_qzZpomy59Ql85fI6ShwvTSJ52URBUqDg3k-F-dxAP7VLiLBkALCzqoIb-_iAagNfuDaN7a"
 type="OFFICE"
 name="Tech Innovation Center"
 trust="96/100 Trust"
 location="Berlin, DE"
 yieldRate="5.3%"
 price="€28.9M"
 />
 </div>

 {/* Pagination */}
 <div className="flex items-center justify-center pt-8 pb-4">
 <nav aria-label="Pagination" className="flex items-center gap-2">
 <button disabled className="size-10 flex items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary-light hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
 <span className="material-symbols-outlined">chevron_left</span>
 </button>
 <button className="size-10 flex items-center justify-center rounded-lg bg-primary text-white font-medium">1</button>
 <button className="size-10 flex items-center justify-center rounded-lg border border-border-light bg-white text-text-primary-light hover:border-primary hover:text-primary transition-colors">2</button>
 <button className="size-10 flex items-center justify-center rounded-lg border border-border-light bg-white text-text-primary-light hover:border-primary hover:text-primary transition-colors">3</button>
 <span className="text-text-secondary-light px-2">...</span>
 <button className="size-10 flex items-center justify-center rounded-lg border border-border-light bg-white text-text-primary-light hover:border-primary hover:text-primary transition-colors">8</button>
 <button className="size-10 flex items-center justify-center rounded-lg border border-border-light bg-white text-text-secondary-light hover:border-primary hover:text-primary transition-colors">
 <span className="material-symbols-outlined">chevron_right</span>
 </button>
 </nav>
 </div>
 </div>
 </main>
 </div>
 );
}

function MetricCard({ title, icon, value, trend, iconColor = "text-primary " }: { title: string, icon: string, value: string, trend: string, iconColor?: string }) {
 return (
 <div className="bg-white p-6 rounded-xl border border-border-light shadow-sm">
 <div className="flex justify-between items-start mb-2">
 <p className="text-text-secondary-light text-sm font-medium">{title}</p>
 <span className={`material-symbols-outlined ${iconColor} text-[20px]`}>{icon}</span>
 </div>
 <div className="flex items-end gap-2">
 <p className="text-primary text-3xl font-bold tracking-tight">{value}</p>
 <span className="text-emerald-600 text-xs font-bold bg-emerald-50 px-1.5 py-0.5 rounded flex items-center mb-1">
 <span className="material-symbols-outlined text-[12px] mr-0.5">trending_up</span> {trend}
 </span>
 </div>
 </div>
 );
}

function FilterTab({ active, label }: { active?: boolean, label: string }) {
 if (active) {
 return (
 <button className="flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-white text-sm font-medium whitespace-nowrap shadow-sm">
 {label}
 <span className="material-symbols-outlined text-[16px]">expand_more</span>
 </button>
 );
 }
 return (
 <button className="flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-border-light text-text-primary-light text-sm font-medium whitespace-nowrap hover:bg-gray-50 transition-colors">
 {label}
 <span className="material-symbols-outlined text-[16px]">expand_more</span>
 </button>
 );
}

function ListingCard({ image, type, name, trust, location, yieldRate, price }: { image: string, type: string, name: string, trust: string, location: string, yieldRate: string, price: string }) {
 return (
 <Link href="/verify" className="group bg-white rounded-xl overflow-hidden border border-border-light hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col h-full cursor-pointer block">
 <div className="relative h-56 w-full overflow-hidden">
 <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: `url('${image}')` }}></div>
 <div className="absolute top-3 left-3 flex gap-2">
 <span className="px-2 py-1 bg-white/90 backdrop-blur-sm text-primary text-xs font-bold rounded shadow-sm">{type}</span>
 <span className="px-2 py-1 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-bold rounded flex items-center gap-1 shadow-sm">
 <span className="material-symbols-outlined text-[14px]">verified_user</span> VERIFIED
 </span>
 </div>
 </div>
 <div className="p-5 flex flex-col flex-1">
 <div className="flex justify-between items-start mb-2">
 <h3 className="text-primary text-lg font-bold leading-tight">{name}</h3>
 <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold border border-emerald-100 ">
 {trust}
 </span>
 </div>
 <p className="text-text-secondary-light text-sm flex items-center gap-1 mb-4">
 <span className="material-symbols-outlined text-[16px]">location_on</span>
 {location}
 </p>
 <div className="grid grid-cols-2 gap-4 mb-6 py-4 border-t border-b border-border-light bg-background-light/50 -mx-5 px-5">
 <div>
 <p className="text-text-secondary-light text-xs font-medium uppercase tracking-wider">Yield</p>
 <p className="text-primary font-bold text-lg">{yieldRate}</p>
 </div>
 <div>
 <p className="text-text-secondary-light text-xs font-medium uppercase tracking-wider">Price</p>
 <p className="text-primary font-bold text-lg">{price}</p>
 </div>
 </div>
 <div className="mt-auto pt-2">
 <button className="w-full h-10 bg-white border border-border-light hover:border-primary text-primary text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-white group-hover:border-transparent">
 View Details
 <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
 </button>
 </div>
 </div>
 </Link>
 );
}
