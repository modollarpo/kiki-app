"use client";
import { useState } from "react";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { K } from "@/lib/kdls";
import { Button, Card, Input } from "@/components/ui";
import { contacts } from "@/lib/api";

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [msg, setMsg] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = "Required";
    if (!lastName.trim()) e.lastName = "Required";
    if (!email.trim()) e.email = "Required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email";
    if (!company.trim()) e.company = "Required";
    if (!msg.trim()) e.message = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await contacts.submit({ firstName, lastName, email, company, message: msg });
      setSent(true);
    } catch {
      setErrors({ submit: "Failed to send. Please try again." });
      setLoading(false);
    }
  };

  return (
    <MarketingLayout>
      <div style={{ background:K.void, minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"80px 48px" }}>
        <div style={{ width:"100%", maxWidth:960 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:48, alignItems:"start" }}>
            <div>
              <p style={{ fontFamily:K.mono, fontSize:9, letterSpacing:"0.18em", color:K.t4, marginBottom:14 }}>GET IN TOUCH</p>
              <h1 style={{ fontFamily:K.mono, fontWeight:700, fontSize:"clamp(28px,4vw,44px)", letterSpacing:"-0.03em", color:K.t1, marginBottom:16 }}>Let&apos;s talk.</h1>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:15, color:K.t3, lineHeight:1.7, marginBottom:40 }}>Evaluating KIKI, have a technical question, or want to partner — we respond within 4 hours.</p>
              {[{icon:"✉",label:"Email",val:"hello@kiki.ai"},{icon:"💬",label:"Live chat",val:"Available in the dashboard"},{icon:"📞",label:"Enterprise",val:"Book a 30-min call"}].map(c=>(
                <div key={c.label} style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
                  <div style={{ width:40, height:40, borderRadius:2, background:K.g850, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{c.icon}</div>
                  <div>
                    <p style={{ fontFamily:K.mono, fontSize:11, fontWeight:700, color:K.t1 }}>{c.label}</p>
                    <p style={{ fontFamily:K.mono, fontSize:11, color:K.t3 }}>{c.val}</p>
                  </div>
                </div>
              ))}
            </div>
            <div>
              {sent ? (
                <Card accent={K.mint} glow={K.mint}>
                  <div style={{ textAlign:"center", padding:"32px 0" }}>
                    <div style={{ fontSize:48, marginBottom:16 }}>✓</div>
                    <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:20, color:K.mint, marginBottom:8 }}>Message sent!</p>
                    <p style={{ fontFamily:"Inter,sans-serif", fontSize:14, color:K.t3 }}>We&apos;ll get back to you within 4 hours.</p>
                  </div>
                </Card>
              ) : (
                <Card>
                  <p style={{ fontFamily:K.mono, fontWeight:700, fontSize:18, color:K.t1, marginBottom:20 }}>Send us a message</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                    <Input label="First name" placeholder="Alex" value={firstName} onChange={v => { setFirstName(v); setErrors(e => ({...e, firstName: ""})); }} error={errors.firstName} />
                    <Input label="Last name"  placeholder="Chen" value={lastName} onChange={v => { setLastName(v); setErrors(e => ({...e, lastName: ""})); }} error={errors.lastName} />
                  </div>
                  <Input label="Work email" type="email" placeholder="alex@company.com" value={email} onChange={v => { setEmail(v); setErrors(e => ({...e, email: ""})); }} error={errors.email} style={{ marginBottom:12 }} />
                  <Input label="Company" placeholder="Acme Corp" value={company} onChange={v => { setCompany(v); setErrors(e => ({...e, company: ""})); }} error={errors.company} style={{ marginBottom:12 }} />
                  <div style={{ marginBottom:16 }}>
                    <p style={{ fontFamily:K.mono, fontSize:10, letterSpacing:"0.1em", color:K.t3, textTransform:"uppercase", marginBottom:6 }}>Message</p>
                    <textarea placeholder="Tell us about your use case..." value={msg} onChange={e => { setMsg(e.target.value); setErrors(er => ({...er, message: ""})); }}
                      style={{ width:"100%", background:K.g800, border:`1px solid ${errors.message ? K.danger : K.g700}`, borderRadius:2, padding:"10px 14px", fontFamily:"Inter,sans-serif", fontSize:13, color:K.t1, resize:"none", height:100, outline:"none", transition:"border-color 0.15s" }} />
                    {errors.message && <p style={{ fontFamily:K.mono, fontSize:10, color:K.danger, marginTop:4 }}>{errors.message}</p>}
                  </div>
                  {errors.submit && <p style={{ fontFamily:K.mono, fontSize:10, color:K.danger, marginBottom:12 }}>{errors.submit}</p>}
                  <Button full size="lg" loading={loading} onClick={handleSubmit}>Send Message →</Button>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
