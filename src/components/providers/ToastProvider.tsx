"use client";
import { useKikiStore } from "@/store";
import { K } from "@/lib/kdls";
import { useEffect } from "react";

const COLORS: Record<string, string> = { info: K.blue, success: K.mint, warning: K.warn, error: K.danger };

export default function ToastProvider() {
  const { toasts, removeToast } = useKikiStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useKikiStore.getState().setCmdPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="animate-scale-in flex items-center gap-2.5 px-4 py-4 border-l-3 rounded-kdls cursor-pointer pointer-events-all"
          style={{ background: K.g850, borderColor: K.g700, borderLeftColor: COLORS[t.type] || K.blue, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", minWidth: 280, maxWidth: 380 }}
        >
          <div
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: COLORS[t.type] || K.blue }}
          />
          <span className="flex-1 font-mono text-[12px]" style={{ color: K.t1 }}>
            {t.message}
          </span>
          <button
            onClick={() => removeToast(t.id)}
            className="text-[16px] leading-none p-0.5"
            style={{ color: K.t3, background: "none", border: "none", cursor: "pointer" }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
