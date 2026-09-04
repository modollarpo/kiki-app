import { K } from "@/lib/kdls";

export default function Loading() {
  return (
    <div className="min-h-screen bg-void flex items-center justify-center">
      <div className="text-center">
        <div
          className="mx-auto mb-4 animate-kdls-spin rounded-full"
          style={{ width: 40, height: 40, border: `3px solid ${K.g700}`, borderTopColor: K.blue }}
        />
        <p className="font-mono text-[13px] text-t3 tracking-[0.08em]">
          KIKI Agent
        </p>
      </div>
    </div>
  );
}
