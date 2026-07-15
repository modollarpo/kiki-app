"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useKikiStore } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { K } from "@/lib/kdls";
import { Button, Card, Input } from "@/components/ui";

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
    if (v.length < 6) return "Password must be at least 6 characters";
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
    <div style={{
      minHeight: "100vh", background: K.void,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative", overflow: "hidden",
    }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:`radial-gradient(circle,${K.g800} 1px,transparent 1px)`, backgroundSize:"32px 32px", opacity:0.4, pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:"30%", left:"50%", transform:"translateX(-50%)", width:600, height:400, borderRadius:"50%", background:`radial-gradient(circle,${K.blueT} 0%,transparent 70%)`, filter:"blur(60px)", pointerEvents:"none" }} />

      <div style={{ position:"relative", textAlign:"center", marginBottom:32 }}>
        <img src="/images/kiki.png" alt="KIKI" width={48} height={48} style={{ borderRadius:2, margin:"0 auto 12px", boxShadow:`0 0 32px ${K.blue}50`, display:"block" }} />
        <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:18, color:K.t1 }}>KIKI<span style={{ color:K.blue }}>.</span>Agent</p>
        <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.14em", color:K.t4, marginTop:4 }}>AUTONOMOUS LTV CAMPAIGN PLATFORM</p>
      </div>

      <div style={{ position:"relative", display:"flex", gap:4, marginBottom:24, background:K.g850, borderRadius:2, padding:4 }}>
        {(["login","forgot","sso"] as const).map(s => (
          <button key={s} onClick={() => { setScreen(s); setErrors({}); }}
            style={{ padding:"5px 14px", fontFamily:K.mono, fontSize:10, fontWeight:600, letterSpacing:"0.06em", borderRadius:2, border:"none", textTransform:"uppercase", background:screen===s?K.g700:"transparent", color:screen===s?K.t1:K.t3, cursor:"pointer" }}>
            {s === "sso" ? "SSO" : s}
          </button>
        ))}
      </div>

      {screen === "login" && (
        <div style={{ position:"relative", width:"100%", maxWidth:380 }}>
          <Card accent={K.blue}>
            <p style={{ fontFamily:K.sans, fontWeight:700, fontSize:18, color:K.t1, marginBottom:6 }}>Sign in to your account</p>
            <p style={{ fontFamily:K.sans, fontSize:13, color:K.t3, marginBottom:22 }}>Enterprise-grade ad platform. SOC2 certified.</p>

            {authError && (
              <div style={{ padding:"10px 14px", background:K.dangerT, border:`1px solid ${K.danger}40`, borderRadius:2, marginBottom:16 }}>
                <p style={{ fontFamily:K.mono, fontSize:11, color:K.danger }}>{authError}</p>
              </div>
            )}

            <Input label="Work Email" type="email" placeholder="you@company.com" value={email} onChange={v => { setEmail(v); setErrors(e => ({...e, email: undefined})); }} error={errors.email} style={{ marginBottom:12 }} />
            <div style={{ marginBottom:6 }}>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                <p style={{ fontFamily:K.mono, fontSize:10, letterSpacing:"0.1em", color:K.t3, textTransform:"uppercase" as const }}>Password</p>
                <button onClick={() => setScreen("forgot")} style={{ fontFamily:K.mono, fontSize:10, color:K.blue4, background:"none", border:"none", cursor:"pointer" }}>Forgot?</button>
              </div>
              <Input type="password" placeholder="••••••••" value={password} onChange={v => { setPassword(v); setErrors(e => ({...e, password: undefined})); }} error={errors.password} suffix="👁" />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:20, marginTop:8, cursor:"pointer" }} onClick={() => setKeepSignedIn(!keepSignedIn)}>
              <div style={{ width:14, height:14, borderRadius:2, border:`2px solid ${keepSignedIn ? K.blue : K.g700}`, background: keepSignedIn ? K.blue : "transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center", transition: "all 0.15s" }}>
                {keepSignedIn && <span style={{ color:"white", fontSize:9, fontWeight:700 }}>✓</span>}
              </div>
              <span style={{ fontFamily:K.sans, fontSize:12, color:K.t3 }}>Keep me signed in for 30 days</span>
            </div>
            <Button full size="lg" loading={authLoading} onClick={handleLogin}>Sign In →</Button>
            <div style={{ margin:"16px 0", height:1, background:`linear-gradient(90deg,transparent,${K.g700},transparent)` }} />
            <Button full variant="secondary" size="md" onClick={() => setScreen("sso")} icon={<span>⬡</span>}>Sign in with SSO</Button>
            <p style={{ fontFamily:K.mono, fontSize:10, color:K.t4, textAlign:"center", marginTop:16 }}>
              No account?{" "}
              <span style={{ color:K.blue4, cursor:"pointer" }} onClick={() => router.push("/contact")}>Request access →</span>
            </p>
            <p style={{ fontFamily:K.mono, fontSize:9, color:K.t4, textAlign:"center", marginTop:10 }}>
              Demo: alex@acmecorp.com / password123
            </p>
          </Card>
        </div>
      )}

      {screen === "forgot" && (
        <div style={{ position:"relative", width:"100%", maxWidth:380 }}>
          <Card>
            {emailSent ? (
              <div style={{ textAlign:"center", padding:"16px 0" }}>
                <div style={{ fontSize:40, marginBottom:16 }}>✉</div>
                <p style={{ fontFamily:K.sans, fontWeight:700, fontSize:18, color:K.t1, marginBottom:8 }}>Check your inbox</p>
                <p style={{ fontFamily:K.sans, fontSize:13, color:K.t3, lineHeight:1.6 }}>We sent a reset link to <span style={{ color:K.t1 }}>{email}</span>. Expires in 15 min.</p>
                <Button variant="ghost" size="md" style={{ marginTop:20 }} onClick={() => { setEmailSent(false); setScreen("login"); }}>← Back to sign in</Button>
              </div>
            ) : (
              <>
                <p style={{ fontFamily:K.sans, fontWeight:700, fontSize:18, color:K.t1, marginBottom:6 }}>Reset your password</p>
                <p style={{ fontFamily:K.sans, fontSize:13, color:K.t3, marginBottom:22, lineHeight:1.5 }}>Enter your work email and we&apos;ll send a secure reset link.</p>
                <Input label="Work Email" type="email" placeholder="you@company.com" value={email} onChange={v => { setEmail(v); setErrors({}); }} error={errors.email} style={{ marginBottom:16 }} />
                <Button full size="lg" onClick={handleForgotPassword}>Send Reset Link →</Button>
                <p style={{ fontFamily:K.mono, fontSize:10, color:K.t4, textAlign:"center", marginTop:14 }}>
                  <span style={{ color:K.blue4, cursor:"pointer" }} onClick={() => setScreen("login")}>← Back to sign in</span>
                </p>
              </>
            )}
          </Card>
        </div>
      )}

      {screen === "sso" && (
        <div style={{ position:"relative", width:"100%", maxWidth:380 }}>
          <Card accent={K.oaas}>
            <p style={{ fontFamily:K.sans, fontWeight:700, fontSize:18, color:K.t1, marginBottom:6 }}>Single Sign-On</p>
            <p style={{ fontFamily:K.sans, fontSize:13, color:K.t3, marginBottom:22 }}>Enter your organization&apos;s SSO domain</p>
            <Input placeholder="acmecorp" suffix=".kiki.ai/sso" mono hint="Your IT admin can provide the SSO subdomain" style={{ marginBottom:16 }} />
            <Button full variant="violet" size="lg" onClick={handleSsoLogin}>Continue with SSO →</Button>
            <div style={{ margin:"16px 0", height:1, background:`linear-gradient(90deg,transparent,${K.g700},transparent)` }} />
            <div style={{ display:"flex", gap:10 }}>
              {[{l:"Google Workspace",c:"#4285F4"},{l:"Microsoft Entra",c:"#0078D4"},{l:"Okta",c:"#007DC1"}].map(p => (
                <button key={p.l} onClick={() => handleProviderLogin(p.l)}
                  style={{ flex:1, padding:"10px 8px", background:K.g850, border:`1px solid ${K.g700}`, borderRadius:2, fontFamily:K.mono, fontSize:9, color:K.t2, cursor:"pointer", textAlign:"center", transition:"all 0.15s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = K.g800; e.currentTarget.style.borderColor = K.g600; }}
                  onMouseLeave={e => { e.currentTarget.style.background = K.g850; e.currentTarget.style.borderColor = K.g700; }}>
                  <div style={{ width:24, height:24, borderRadius:"50%", background:`${p.c}18`, margin:"0 auto 5px", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:K.mono, fontWeight:700, fontSize:12, color:p.c }}>{p.l[0]}</div>
                  {p.l}
                </button>
              ))}
            </div>
            <p style={{ fontFamily:K.mono, fontSize:10, color:K.t4, textAlign:"center", marginTop:14 }}>
              <span style={{ color:K.blue4, cursor:"pointer" }} onClick={() => setScreen("login")}>← Use email instead</span>
            </p>
          </Card>
        </div>
      )}

      <p style={{ position:"relative", marginTop:32, fontFamily:K.mono, fontSize:9, letterSpacing:"0.1em", color:K.t4 }}>
        BY SIGNING IN YOU AGREE TO OUR{" "}
        <span style={{ color:K.t3, cursor:"pointer" }} onClick={() => router.push("/terms")}>TERMS OF SERVICE</span>
        {" & "}
        <span style={{ color:K.t3, cursor:"pointer" }} onClick={() => router.push("/privacy")}>PRIVACY POLICY</span>
      </p>
    </div>
  );
}
