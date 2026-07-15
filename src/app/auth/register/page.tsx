"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useKikiStore } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { K } from "@/lib/kdls";
import { Button, Card, Input } from "@/components/ui";

export default function RegisterPage() {
  const router = useRouter();
  const { setUser, addToast } = useKikiStore();
  const { login, loading: authLoading, error: authError } = useAuth();
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
    // For demo, just log in with existing account
    const success = await login("alex@acmecorp.com", "password123");
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
    <div
      style={{
        minHeight: "100vh",
        background: K.void,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(circle,${K.g800} 1px,transparent 1px)`,
          backgroundSize: "32px 32px",
          opacity: 0.4,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 600,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle,${K.blueT} 0%,transparent 70%)`,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", textAlign: "center", marginBottom: 32 }}>
        <img
          src="/images/kiki.png"
          alt="KIKI"
          width={48}
          height={48}
          style={{
            borderRadius: 2,
            margin: "0 auto 12px",
            boxShadow: `0 0 32px ${K.blue}50`,
            display: "block",
          }}
        />
        <p style={{ fontFamily: K.mono, fontWeight: 700, fontSize: 18, color: K.t1 }}>
          KIKI<span style={{ color: K.blue }}>.</span>Agent
        </p>
        <p style={{ fontFamily: K.mono, fontSize: 9, letterSpacing: "0.14em", color: K.t4, marginTop: 4 }}>
          AUTONOMOUS LTV CAMPAIGN PLATFORM
        </p>
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
        <Card accent={K.blue}>
          <p style={{ fontFamily: K.sans, fontWeight: 700, fontSize: 18, color: K.t1, marginBottom: 6 }}>
            Create your account
          </p>
          <p style={{ fontFamily: K.sans, fontSize: 13, color: K.t3, marginBottom: 22 }}>
            14-day free trial. No credit card required.
          </p>

          {authError && (
            <div style={{ padding: "10px 14px", background: K.dangerT, border: `1px solid ${K.danger}40`, borderRadius: 2, marginBottom: 16 }}>
              <p style={{ fontFamily: K.mono, fontSize: 11, color: K.danger }}>{authError}</p>
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

          <p style={{ fontFamily: K.mono, fontSize: 10, color: K.t4, textAlign: "center", marginTop: 16 }}>
            Already have an account?{" "}
            <span style={{ color: K.blue4, cursor: "pointer" }} onClick={() => router.push("/auth/login")}>
              Sign in →
            </span>
          </p>
        </Card>
      </div>

      <p
        style={{
          position: "relative",
          marginTop: 32,
          fontFamily: K.mono,
          fontSize: 9,
          letterSpacing: "0.1em",
          color: K.t4,
        }}
      >
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
