"use client";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useKikiStore } from "@/store";
import { K } from "@/lib/kdls";
import { Button, Card, Input } from "@/components/ui";
import Image from "next/image";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = useParams();
  const { addToast } = useKikiStore();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async () => {
    setError("");
    if (!password || password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setError(data.error || "Reset failed"); setLoading(false); return; }
      setSuccess(true);
      addToast("success", "Password reset successfully. Sign in with your new password.");
    } catch { setError("Network error"); setLoading(false); }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden" style={{ background: K.void }}>
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: `radial-gradient(circle,${K.g800} 1px,transparent 1px)`, backgroundSize: "32px 32px" }} />
      <div className="relative text-center mb-8">
        <div className="inline-block cursor-pointer" onClick={() => router.push("/")}>
          <Image src="/images/kiki.png" alt="KIKI" width={44} height={44} className="block mx-auto mb-3" style={{ margin: 3 }} />
        </div>
        <p className="font-mono font-bold text-[18px] text-t1">KIKI<span className="text-kblue">.</span>Agent</p>
      </div>
      <div className="relative w-full max-w-[380px]">
        <Card accent={K.blue}>
          {success ? (
            <div className="text-center py-4">
              <div className="text-[40px] mb-4">✓</div>
              <p className="font-sans font-bold text-[18px] text-t1 mb-2">Password reset successful</p>
              <p className="font-sans text-[13px] text-t3 leading-[1.6] mb-5">You can now sign in with your new password.</p>
              <Button full size="lg" onClick={() => router.push("/auth/login")}>Sign In →</Button>
            </div>
          ) : (
            <>
              <p className="font-sans font-bold text-[18px] text-t1 mb-1.5">Set new password</p>
              <p className="font-sans text-[13px] text-t3 mb-[22px]">Must be at least 8 characters.</p>
              {error && (
                <div className="px-3.5 py-2.5 rounded-sm mb-4" style={{ background: `${K.danger}20`, border: `1px solid ${K.danger}40` }}>
                  <p className="font-mono text-[11px]" style={{ color: K.danger }}>{error}</p>
                </div>
              )}
              <Input label="New Password" type="password" placeholder="••••••••" value={password} onChange={setPassword} style={{ marginBottom: 12 }} />
              <Input label="Confirm Password" type="password" placeholder="••••••••" value={confirmPassword} onChange={setConfirmPassword} style={{ marginBottom: 16 }} />
              <Button full size="lg" loading={loading} onClick={handleReset}>Reset Password →</Button>
              <p className="font-mono text-[10px] text-t4 text-center mt-3.5">
                <span style={{ color: K.blue4, cursor: "pointer" }} onClick={() => router.push("/auth/login")}>← Back to sign in</span>
              </p>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
