export default function GlobalLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-5 py-3">
        <span className="material-symbols-outlined animate-spin text-primary">progress_activity</span>
        <span className="text-xs uppercase tracking-widest text-slate-400">Loading workspace</span>
      </div>
    </div>
  );
}
