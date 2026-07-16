import Link from "next/link";
import { K } from "@/lib/kdls";

export default function DashboardNotFound() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6">
      <div className="text-center max-w-[480px]">
        <div className="font-mono font-bold text-[80px] text-g700 leading-none mb-3">
          404
        </div>
        <h1 className="font-mono font-bold text-[20px] text-t1 mb-2">
          Page not found
        </h1>
        <p className="font-sans text-[14px] text-t3 leading-[1.6] mb-6">
          The dashboard page you&apos;re looking for doesn&apos;t exist or you
          don&apos;t have access.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/dashboard"
            className="px-[22px] py-[10px] bg-kblue text-white font-mono text-[12px] font-semibold rounded-kdls no-underline"
          >
            ← Dashboard
          </Link>
          <Link
            href="/"
            className="px-[22px] py-[10px] bg-g800 text-t2 font-mono text-[12px] font-semibold rounded-kdls no-underline"
            style={{ border: `1px solid ${K.g700}` }}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
