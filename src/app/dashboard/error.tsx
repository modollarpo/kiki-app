"use client";

import { K } from "@/lib/kdls";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6">
      <div className="text-center max-w-[480px]">
        <div
          className="w-14 h-14 rounded-kdls flex items-center justify-center text-2xl text-kdanger mx-auto mb-4"
          style={{ background: K.dangerT }}
        >
          ⚠
        </div>
        <h1 className="font-mono font-bold text-[18px] text-t1 mb-2">
          Something went wrong
        </h1>
        <p className="font-sans text-[14px] text-t3 leading-[1.6] mb-6">
          An unexpected error occurred while loading this page. Our team has been
          notified.
        </p>
        {error.digest && (
          <p className="font-mono text-[10px] text-t4 mb-4">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="px-[22px] py-[10px] bg-kblue text-white font-mono text-[12px] font-semibold rounded-kdls border-none cursor-pointer"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
