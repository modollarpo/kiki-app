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
      <div className="min-h-[80vh] flex items-center justify-center px-6 md:px-12 py-[clamp(40px,6vw,80px)]" style={{ background:K.void }}>
        <div className="w-full max-w-[960px]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start">
            <div>
              <p className="font-mono text-[9px] tracking-[0.18em] text-t4 mb-3.5">GET IN TOUCH</p>
              <h1 className="font-mono font-bold text-[clamp(28px,4vw,44px)] tracking-[-0.03em] text-t1 mb-4">Let&apos;s talk.</h1>
              <p className="font-sans text-[15px] text-t3 leading-[1.7] mb-10">Evaluating KIKI, have a technical question, or want to partner — we respond within 4 hours.</p>
              {[{icon:"✉",label:"Email",val:"hello@kiki.ai"},{icon:"💬",label:"Live chat",val:"Available in the dashboard"},{icon:"📞",label:"Enterprise",val:"Book a 30-min call"}].map(c=>(
                <div key={c.label} className="flex items-center gap-3.5 mb-5">
                  <div className="w-10 h-10 rounded-sm bg-g850 flex items-center justify-center text-[18px] shrink-0">{c.icon}</div>
                  <div>
                    <p className="font-mono font-bold text-[11px] text-t1">{c.label}</p>
                    <p className="font-mono text-[11px] text-t3">{c.val}</p>
                  </div>
                </div>
              ))}
            </div>
            <div>
              {sent ? (
                <Card accent={K.mint} glow={K.mint}>
                  <div className="text-center py-8">
                    <div className="text-[48px] mb-4">✓</div>
                    <p className="font-mono font-bold text-[20px] text-kmint mb-2">Message sent!</p>
                    <p className="font-sans text-[14px] text-t3">We&apos;ll get back to you within 4 hours.</p>
                  </div>
                </Card>
              ) : (
                <Card>
                  <p className="font-mono font-bold text-[18px] text-t1 mb-5">Send us a message</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <Input label="First name" placeholder="Alex" value={firstName} onChange={v => { setFirstName(v); setErrors(e => ({...e, firstName: ""})); }} error={errors.firstName} />
                    <Input label="Last name"  placeholder="Chen" value={lastName} onChange={v => { setLastName(v); setErrors(e => ({...e, lastName: ""})); }} error={errors.lastName} />
                  </div>
                  <Input label="Work email" type="email" placeholder="alex@company.com" value={email} onChange={v => { setEmail(v); setErrors(e => ({...e, email: ""})); }} error={errors.email} style={{ marginBottom:12 }} />
                  <Input label="Company" placeholder="Acme Corp" value={company} onChange={v => { setCompany(v); setErrors(e => ({...e, company: ""})); }} error={errors.company} style={{ marginBottom:12 }} />
                  <div className="mb-4">
                    <p className="font-mono text-[10px] tracking-widest text-t3 uppercase mb-1.5">Message</p>
                    <textarea placeholder="Tell us about your use case..." value={msg} onChange={e => { setMsg(e.target.value); setErrors(er => ({...er, message: ""})); }}
                      className="w-full bg-g800 rounded-sm px-3.5 py-2.5 font-sans text-[13px] text-t1 resize-none h-[100px] outline-none transition-colors duration-150"
                      style={{ border:`1px solid ${errors.message ? K.danger : K.g700}` }} />
                    {errors.message && <p className="font-mono text-[10px] text-kdanger mt-1">{errors.message}</p>}
                  </div>
                  {errors.submit && <p className="font-mono text-[10px] text-kdanger mb-3">{errors.submit}</p>}
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
