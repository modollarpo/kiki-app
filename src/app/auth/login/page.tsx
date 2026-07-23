"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useKikiStore } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { K } from "@/lib/kdls";
import { Button, Card, Input } from "@/components/ui";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const { setUser, addToast } = useKikiStore();
  const { login, loading: authLoading, error: authError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [screen, setScreen] = useState<"login"|"forgot"|"sso">("login");
  const [emailSent, setEmailSent] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateEmail = (v: string) => {
    if (!v) return "Email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address";
    return undefined;
  };

  const validatePassword = (v: string) => {
    if (!v) return "Password is required";
    if (v.length < 8) return "Password must be at least 8 characters";
    return undefined;
  };

  const handleLogin = async () => {
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    setErrors({ email: emailErr, password: passErr });
    if (emailErr || passErr) return;

    const success = await login(email, password);
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
      addToast("success", "Signed in successfully. Welcome back.");
      router.push("/dashboard");
    }
  };

  const handleForgotPassword = () => {
    if (!email) {
      setErrors({ email: "Enter your email to reset password" });
      return;
    }
    const emailErr = validateEmail(email);
    if (emailErr) { setErrors({ email: emailErr }); return; }
    setEmailSent(true);
  };

  const handleSsoLogin = () => {
    addToast("info", "SSO authentication coming soon. Contact your IT admin.");
  };

  const handleProviderLogin = (provider: string) => {
    addToast("info", `${provider} sign-in coming soon.`);
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

      <div className="relative flex gap-1 mb-6 p-1 rounded-sm bg-g850">
        {(["login","forgot","sso"] as const).map(s => (
          <button key={s} onClick={() => { setScreen(s); setErrors({}); }}
            className="px-3.5 py-[5px] font-mono text-[10px] font-semibold tracking-[0.06em] rounded-sm border-none uppercase cursor-pointer"
            style={{ background:screen===s?K.g700:"transparent", color:screen===s?K.t1:K.t3 }}>
            {s === "sso" ? "SSO" : s}
          </button>
        ))}
      </div>

      {screen === "login" && (
        <div className="relative w-full max-w-[380px]">
          <Card accent={K.blue}>
            <p className="font-sans font-bold text-[18px] text-t1 mb-1.5">Sign in to your account</p>
            <p className="font-sans text-[13px] text-t3 mb-[22px]">Enterprise-grade ad platform. SOC2 certified.</p>

            {authError && (
              <div className="px-3.5 py-2.5 rounded-sm mb-4" style={{ background:K.dangerT, border:`1px solid ${K.danger}40` }}>
                <p className="font-mono text-[11px] text-kdanger">{authError}</p>
              </div>
            )}

            <Input label="Work Email" type="email" placeholder="you@company.com" value={email} onChange={v => { setEmail(v); setErrors(e => ({...e, email: undefined})); }} error={errors.email} style={{ marginBottom:12 }} />
            <div className="mb-1.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-mono text-[10px] tracking-widest text-t3 uppercase">Password</p>
                <button onClick={() => setScreen("forgot")} className="font-mono text-[10px] bg-transparent border-none cursor-pointer" style={{ color:K.blue4 }}>Forgot?</button>
              </div>
              <Input type="password" placeholder="••••••••" value={password} onChange={v => { setPassword(v); setErrors(e => ({...e, password: undefined})); }} error={errors.password} suffix="👁" />
            </div>
            <div className="flex items-center gap-2 mb-5 mt-2 cursor-pointer" onClick={() => setKeepSignedIn(!keepSignedIn)}>
              <div className="flex-shrink-0 flex items-center justify-center w-[14px] h-[14px] rounded-sm transition-all duration-150" style={{ border:`2px solid ${keepSignedIn ? K.blue : K.g700}`, background: keepSignedIn ? K.blue : "transparent" }}>
                {keepSignedIn && <span className="text-white text-[9px] font-bold">✓</span>}
              </div>
              <span className="font-sans text-[12px] text-t3">Keep me signed in for 30 days</span>
            </div>
            <Button full size="lg" loading={authLoading} onClick={handleLogin}>Sign In →</Button>
            <div className="my-4 h-px" style={{ background:`linear-gradient(90deg,transparent,${K.g700},transparent)` }} />
            <Button full variant="secondary" size="md" onClick={() => setScreen("sso")} icon={<span>⬡</span>}>Sign in with SSO</Button>
            <p className="font-mono text-[10px] text-t4 text-center mt-4">
              No account?{" "}
              <span style={{ color:K.blue4, cursor:"pointer" }} onClick={() => router.push("/auth/signup")}>Create account →</span>
            </p>
            <p className="font-mono text-[11px] text-t3 text-center mt-2.5">
              Demo: alex@acmecorp.com / password123
            </p>
          </Card>
        </div>
      )}

      {screen === "forgot" && (
        <div className="relative w-full max-w-[380px]">
          <Card>
            {emailSent ? (
              <div className="text-center py-4">
                <div className="text-[40px] mb-4">✉</div>
                <p className="font-sans font-bold text-[18px] text-t1 mb-2">Check your inbox</p>
                <p className="font-sans text-[13px] text-t3 leading-[1.6]">We sent a reset link to <span className="text-t1">{email}</span>. Expires in 15 min.</p>
                <Button variant="ghost" size="md" className="mt-5" onClick={() => { setEmailSent(false); setScreen("login"); }}>← Back to sign in</Button>
              </div>
            ) : (
              <>
                <p className="font-sans font-bold text-[18px] text-t1 mb-1.5">Reset your password</p>
                <p className="font-sans text-[13px] text-t3 mb-[22px] leading-[1.5]">Enter your work email and we&apos;ll send a secure reset link.</p>
                <Input label="Work Email" type="email" placeholder="you@company.com" value={email} onChange={v => { setEmail(v); setErrors({}); }} error={errors.email} style={{ marginBottom:16 }} />
                <Button full size="lg" onClick={handleForgotPassword}>Send Reset Link →</Button>
                <p className="font-mono text-[10px] text-t4 text-center mt-3.5">
                  <span style={{ color:K.blue4, cursor:"pointer" }} onClick={() => setScreen("login")}>← Back to sign in</span>
                </p>
              </>
            )}
          </Card>
        </div>
      )}

      {screen === "sso" && (
        <div className="relative w-full max-w-[380px]">
          <Card accent={K.oaas}>
            <p className="font-sans font-bold text-[18px] text-t1 mb-1.5">Single Sign-On</p>
            <p className="font-sans text-[13px] text-t3 mb-[22px]">Enter your organization&apos;s SSO domain</p>
            <Input placeholder="acmecorp" suffix=".kiki.ai/sso" mono hint="Your IT admin can provide the SSO subdomain" className="mb-4" />
            <Button full variant="violet" size="lg" onClick={handleSsoLogin}>Continue with SSO →</Button>
            <div className="my-4 h-px" style={{ background:`linear-gradient(90deg,transparent,${K.g700},transparent)` }} />
            <div className="flex gap-2.5">
              {[{l:"Google Workspace",c:"#4285F4"},{l:"Microsoft Entra",c:"#0078D4"},{l:"Okta",c:"#007DC1"}].map(p => (
                <button key={p.l} onClick={() => handleProviderLogin(p.l)}
                  className="flex-1 px-2 py-2 rounded-sm font-mono text-[9px] text-t2 cursor-pointer text-center transition-all duration-150"
                  style={{ background:K.g850, border:`1px solid ${K.g700}` }}
                  onMouseEnter={e => { e.currentTarget.style.background = K.g800; e.currentTarget.style.borderColor = K.g600; }}
                  onMouseLeave={e => { e.currentTarget.style.background = K.g850; e.currentTarget.style.borderColor = K.g700; }}>
                  <div className="w-6 h-6 rounded-full mx-auto mb-[5px] flex items-center justify-center font-mono font-bold text-[12px]" style={{ background:`${p.c}18`, color:p.c }}>{p.l[0]}</div>
                  {p.l}
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] text-t4 text-center mt-3.5">
              <span style={{ color:K.blue4, cursor:"pointer" }} onClick={() => setScreen("login")}>← Use email instead</span>
            </p>
          </Card>
        </div>
      )}

      <p className="relative mt-8 font-mono text-[11px] tracking-widest text-t3">
        BY SIGNING IN YOU AGREE TO OUR{" "}
        <span style={{ color:K.t3, cursor:"pointer" }} onClick={() => router.push("/terms")}>TERMS OF SERVICE</span>
        {" & "}
        <span style={{ color:K.t3, cursor:"pointer" }} onClick={() => router.push("/privacy")}>PRIVACY POLICY</span>
      </p>
    </div>
  );
}
