"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center py-12 px-6 text-center">
      <div>
        <div className="text-[56px] mb-5">📡</div>
        <h1 className="font-mono font-bold text-[28px] text-t1 tracking-tight mb-3">No connection</h1>
        <p className="font-sans text-[15px] text-t3 leading-[1.7] max-w-[360px] mx-auto mb-7">
          You're offline. KIKI Agent is available offline — some features require a connection to sync live data.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="py-[11px] px-6 bg-kblue text-white font-mono text-xs font-bold tracking-[0.06em] rounded-sm border-none cursor-pointer">
          RETRY CONNECTION →
        </button>
        <div className="mt-8 p-4 bg-g900 border border-g800 rounded-sm inline-block">
          <p className="font-mono text-[10px] text-t3 mb-2">Available offline:</p>
          {["Dashboard overview","Cached campaigns","Recent signal data","Wallet balance"].map(f => (
            <div key={f} className="flex items-center gap-2 mb-[5px]">
              <span className="text-kmint text-[11px]">✓</span>
              <span className="font-mono text-[11px] text-t2">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
