"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useKikiStore } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { K } from "@/lib/kdls";
import { Button, Card, Input } from "@/components/ui";
import Image from "next/image";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, addToast } = useKikiStore();
  const { signup, loading: authLoading, error: authError } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required";
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Enter a valid email";
    if (!company.trim()) e.company = "Company name is required";
    if (!password) e.password = "Password is required";
    else if (password.length < 8) e.password = "Password must be at least 8 characters";
    else if (!/[A-Z]/.test(password) || !/[0-9]/.test(password)) e.password = "Include uppercase and a number";
    if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    const success = await signup(name, email, password, company);
    if (success) {
      const auth = useAuth.getState();
      if (auth.user) {
        setUser({
          id: auth.user.id,
          name: auth.user.name,
          email: auth.user.email,
          password: "",
          role: auth.user.role as "advertiser",
          tenantId: auth.user.tenantId,
          tenantName: auth.user.tenantName,
          plan: auth.user.plan as "growth",
          avatarInitials: auth.user.avatarInitials,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        });
      }
      addToast("success", "Account created! Welcome to KIKI Agent.");
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-x-hidden" style={{ background: K.void }}>
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle,${K.g800} 1px,transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
      />
      <div
        className="absolute pointer-events-none max-w-full overflow-hidden"
        style={{
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle,${K.blueT} 0%,transparent 70%)`,
          filter: "blur(60px)",
        }}
      />

      <div className="relative text-center mb-8">
        <div className="inline-block cursor-pointer" onClick={() => router.push("/")}>
          <Image
            src="/images/kiki.png"
            alt="KIKI"
            width={48}
            height={44}
            className="block rounded-sm mx-auto mb-3"
            style={{
              margin: 3,
              filter: "none",
          }}
        />
        </div>
        <p className="font-mono font-bold text-[18px] text-t1">
          KIKI<span className="text-kblue">.</span>Agent
        </p>
        <p className="font-mono text-[11px] tracking-[0.14em] text-t3 mt-1">
          AUTONOMOUS LTV CAMPAIGN PLATFORM
        </p>
      </div>

      <div className="relative w-full max-w-[400px]">
        <Card accent={K.blue}>
          <p className="font-sans font-bold text-[18px] text-t1 mb-1.5">
            Create your account
          </p>
          <p className="font-sans text-[13px] text-t3 mb-[22px]">
            14-day free trial. No credit card required.
          </p>

          {authError && (
            <div className="px-3.5 py-2.5 rounded-sm mb-4" style={{ background: K.dangerT, border: `1px solid ${K.danger}40` }}>
              <p className="font-mono text-[11px] text-kdanger">{authError}</p>
            </div>
          )}

          <Input
            label="Full Name"
            placeholder="Alex Chen"
            value={name}
            onChange={(v) => { setName(v); setErrors((e) => ({ ...e, name: "" })); }}
            error={errors.name}
            style={{ marginBottom: 12 }}
          />
          <Input
            label="Work Email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(v) => { setEmail(v); setErrors((e) => ({ ...e, email: "" })); }}
            error={errors.email}
            style={{ marginBottom: 12 }}
          />
          <Input
            label="Company"
            placeholder="Acme Corp"
            value={company}
            onChange={(v) => { setCompany(v); setErrors((e) => ({ ...e, company: "" })); }}
            error={errors.company}
            style={{ marginBottom: 12 }}
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(v) => { setPassword(v); setErrors((e) => ({ ...e, password: "" })); }}
            error={errors.password}
            hint="Min 8 chars, include uppercase and a number"
            style={{ marginBottom: 12 }}
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(v) => { setConfirmPassword(v); setErrors((e) => ({ ...e, confirmPassword: "" })); }}
            error={errors.confirmPassword}
            style={{ marginBottom: 20 }}
          />

          <Button full size="lg" loading={authLoading} onClick={handleRegister}>
            Create Account →
          </Button>

          <p className="font-mono text-[10px] text-t4 text-center mt-4">
            Already have an account?{" "}
            <span style={{ color: K.blue4, cursor: "pointer" }} onClick={() => router.push("/auth/login")}>
              Sign in →
            </span>
          </p>
        </Card>
      </div>

      <p className="relative mt-8 font-mono text-[11px] tracking-widest text-t3">
        BY CREATING AN ACCOUNT YOU AGREE TO OUR{" "}
        <span style={{ color: K.t3, cursor: "pointer" }} onClick={() => router.push("/terms")}>
          TERMS OF SERVICE
        </span>
        {" & "}
        <span style={{ color: K.t3, cursor: "pointer" }} onClick={() => router.push("/privacy")}>
          PRIVACY POLICY
        </span>
      </p>
    </div>
  );
}
