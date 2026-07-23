"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useKikiStore } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { K } from "@/lib/kdls";
import { Button, Card, Input } from "@/components/ui";
import Image from "next/image";

export default function SignupPage() {
  const router = useRouter();
  const { addToast } = useKikiStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name) errs.name = "Name is required";
    if (!email) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    else if (password.length < 6) errs.password = "At least 6 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const ok = await useAuth.getState().signup(name, email, password);
      if (ok) {
        addToast("success", "Account created. Welcome to KIKI!");
        router.push("/dashboard");
      } else {
        setErrors({ form: useAuth.getState().error || "Signup failed" });
      }
    } catch {
      setErrors({ form: "Network error. Try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden" style={{ background: K.void }}>
      <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage:`radial-gradient(circle,${K.g800} 1px,transparent 1px)`, backgroundSize:"32px 32px" }} />
      <div className="absolute pointer-events-none max-w-full overflow-hidden" style={{ top:"30%", left:"50%", transform:"translateX(-50%)", width:600, height:400, borderRadius:"50%", background:`radial-gradient(circle,${K.blueT} 0%,transparent 70%)`, filter:"blur(60px)" }} />

      <div className="relative text-center mb-8">
        <div className="inline-block cursor-pointer" onClick={() => router.push("/")}>
          <Image src="/images/kiki.png" alt="KIKI" width={44} height={44} className="block rounded-sm mx-auto mb-3" style={{ margin:3 }} />
        </div>
        <p className="font-mono font-bold text-[18px] text-t1">KIKI<span className="text-kblue">.</span>Agent</p>
        <p className="font-mono text-[9px] tracking-[0.14em] text-t3 mt-1">AUTONOMOUS LTV CAMPAIGN PLATFORM</p>
      </div>

      <div className="relative w-full max-w-[380px]">
        <Card accent={K.blue}>
          <p className="font-sans font-bold text-[18px] text-t1 mb-1.5">Create your account</p>
          <p className="font-sans text-[13px] text-t3 mb-[22px]">Enterprise-grade ad platform. Start free.</p>

          {errors.form && (
                <div className="px-3.5 py-2.5 rounded-sm mb-4" style={{ background:K.dangerT, border:`1px solid ${K.danger}40` }}>
                  <p className="font-mono text-[11px] text-kdanger">{errors.form}</p>
                </div>
              )}

              <Input label="Full Name" type="text" placeholder="Jane Doe" value={name} onChange={v => { setName(v); setErrors(e => ({...e, name: ""})); }} error={errors.name} style={{ marginBottom:12 }} />
              <Input label="Work Email" type="email" placeholder="you@company.com" value={email} onChange={v => { setEmail(v); setErrors(e => ({...e, email: ""})); }} error={errors.email} style={{ marginBottom:12 }} />
              <Input label="Password" type="password" placeholder="••••••••" value={password} onChange={v => { setPassword(v); setErrors(e => ({...e, password: ""})); }} error={errors.password} style={{ marginBottom:12 }} />
              <Button full size="lg" loading={loading} onClick={handleSignup}>Create Account →</Button>
              <p className="font-mono text-[10px] text-t4 text-center mt-4">
                Already have an account?{" "}
                <span style={{ color:K.blue4, cursor:"pointer" }} onClick={() => router.push("/auth/login")}>Sign in →</span>
              </p>
            </Card>
      </div>

      <p className="relative mt-8 font-mono text-[11px] tracking-widest text-t3">
        BY SIGNING UP YOU AGREE TO OUR{" "}
        <span style={{ color:K.t3, cursor:"pointer" }} onClick={() => router.push("/terms")}>TERMS OF SERVICE</span>
        {" & "}
        <span style={{ color:K.t3, cursor:"pointer" }} onClick={() => router.push("/privacy")}>PRIVACY POLICY</span>
      </p>
    </div>
  );
}
