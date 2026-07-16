import { K } from "@/lib/kdls";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="text-center">
        <div
          style={{
            width: 32,
            height: 32,
            border: `3px solid ${K.g700}`,
            borderTopColor: K.blue,
            borderRadius: "50%",
            margin: "0 auto 16px",
            animation: "spin 1s linear infinite",
          }}
        />
        <p className="font-mono text-[11px] text-t3 tracking-[0.08em]">
          Loading Command Center...
        </p>
      </div>
    </div>
  );
}
