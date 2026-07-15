"use client";
import { useKikiStore } from "@/store";
import { K } from "@/lib/kdls";
import { useEffect } from "react";

const COLORS: Record<string,string> = { info:K.blue, success:K.mint, warning:K.warn, error:K.danger };

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
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999, display:"flex", flexDirection:"column", gap:8, pointerEvents:"none" }}>
      {toasts.map(t => (
        <div key={t.id} className="animate-scale-in"
          style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 16px", background:K.g850, border:`1px solid ${K.g700}`, borderLeft:`3px solid ${COLORS[t.type]||K.blue}`, borderRadius:2, boxShadow:"0 8px 32px rgba(0,0,0,0.5)", minWidth:280, maxWidth:380, pointerEvents:"all" }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:COLORS[t.type]||K.blue, flexShrink:0 }}/>
          <span style={{ fontFamily:K.mono, fontSize:12, color:K.t1, flex:1 }}>{t.message}</span>
          <button onClick={()=>removeToast(t.id)} style={{ color:K.t3, background:"none", border:"none", fontSize:16, cursor:"pointer", padding:2, lineHeight:1, pointerEvents:"all" }}>×</button>
        </div>
      ))}
    </div>
  );
}
