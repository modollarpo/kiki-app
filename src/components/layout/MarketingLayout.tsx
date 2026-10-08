"use client";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { K } from "@/lib/kdls";
import { Button, Badge } from "@/components/ui";
import Image from "next/image";

const NAV_LINKS = [
  { href:"/features",   label:"Product"    },
  { href:"/pricing",    label:"Pricing"    },
  { href:"/enterprise", label:"Enterprise" },
  { href:"/docs",       label:"Docs"       },
  { href:"/blog",       label:"Blog"       },
];

const FOOTER_COLS = [
  { title:"Platform", links:[
    { label:"Features",        href:"/features"          },
    { label:"Pricing",         href:"/pricing"           },
    { label:"Enterprise",      href:"/enterprise"        },
    { label:"Security",        href:"/security"          },
    { label:"Changelog",       href:"/changelog"         },
    { label:"System Status",   href:"/status"            },
  ]},
  { title:"Resources", links:[
    { label:"Documentation",   href:"/docs"              },
    { label:"API Reference",   href:"/docs"              },
    { label:"Download App",    href:"/app-download"      },
    { label:"Blog",            href:"/blog"              },
    { label:"Case Studies",    href:"/blog"              },
    { label:"About",           href:"/about"             },
  ]},
  { title:"Company", links:[
    { label:"About Us",        href:"/about"             },
    { label:"Careers",         href:"/contact"           },
    { label:"Contact",         href:"/contact"           },
    { label:"Partners",        href:"/contact"},
    { label:"Digital Handshake", href:"/digital-handshake"},
    { label:"Contracts & Downloads", href:"/contracts"  },
  ]},
  { title:"Legal", links:[
    { label:"Privacy Policy",  href:"/privacy"           },
    { label:"Cookie Settings", href:"/privacy/consent"   },
    { label:"Terms of Service",href:"/terms"             },
    { label:"Security",        href:"/security"          },
    { label:"GDPR / DPA",      href:"/digital-handshake" },
    { label:"NDA",             href:"/nda"               },
    { label:"Sub-Processors",  href:"/contracts"         },
  ]},
];

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileMenuOpen(false); }, [pathname]);

  return (
    <div style={{ background:K.void, minHeight:"100dvh", color:K.t1, fontFamily:"'Inter',system-ui,sans-serif" }}>
      {/* ── NAV ──────────────────────────────────────── */}
      <nav style={{
        position:"sticky", top:0, zIndex:100, height:56,
        background: scrolled ? "rgba(10,10,11,0.97)" : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : undefined,
        borderBottom: scrolled ? `1px solid ${K.g800}` : "1px solid transparent",
        display:"flex", alignItems:"center", padding:"0 clamp(16px,4vw,48px)",
        justifyContent:"space-between", transition:"all 0.3s",
      }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", flexShrink:0 }} onClick={() => router.push("/")}>
          <Image src="/images/kiki.png" alt="KIKI" width={28} height={28} style={{ borderRadius:3 }} />
          <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:15, color:K.t1 }}>KIKI<span style={{ color:K.blue }}>.</span>Agent</span>
        </div>

        {/* Desktop links */}
        <div className="nav-links" style={{ display:"flex", gap:28 }}>
          {NAV_LINKS.map(l => (
            <a key={l.href} href={l.href}
              style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, letterSpacing:"0.08em", color:pathname===l.href?K.t1:K.t3, textDecoration:"none", transition:"color 0.15s" }}
              onMouseEnter={e => (e.currentTarget.style.color=K.t2)}
              onMouseLeave={e => (e.currentTarget.style.color=pathname===l.href?K.t1:K.t3)}>
              {l.label.toUpperCase()}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="nav-links" style={{ display:"flex", gap:10, alignItems:"center" }}>
          <a href="/auth/login" style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, letterSpacing:"0.06em", color:K.t3, textDecoration:"none" }}>SIGN IN</a>
          <Button size="sm" onClick={() => router.push("/auth/login")}>START FREE →</Button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ display:"none", flexDirection:"column", gap:4, background:"none", border:"none", padding:8, cursor:"pointer" }}
          className="md-show-flex">
          {[0,1,2].map(i => (
            <div key={i} style={{ width:20, height:2, background:K.t2, borderRadius:1,
              transition:"all 0.25s",
              transform: mobileMenuOpen ? (i===0?"rotate(45deg) translate(4px,4px)":i===2?"rotate(-45deg) translate(4px,-4px)":"none") : "none",
              opacity: mobileMenuOpen && i===1 ? 0 : 1,
            }}/>
          ))}
        </button>
      </nav>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div style={{ position:"fixed", top:56, left:0, right:0, bottom:0, zIndex:99, background:"rgba(10,10,11,0.98)", display:"flex", flexDirection:"column", padding:"24px 20px", overflowY:"auto" }}>
          <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:24 }}>
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href}
                style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:16, fontWeight:600, color:K.t1, textDecoration:"none", padding:"14px 0", borderBottom:`1px solid ${K.g800}` }}>
                {l.label}
              </a>
            ))}
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:32 }}>
            <Button full size="lg" onClick={() => router.push("/auth/login")}>START FREE TRIAL →</Button>
            <Button variant="secondary" full size="lg" onClick={() => router.push("/auth/login")}>SIGN IN</Button>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {["Privacy","Terms","Security","Status","Docs","Contracts"].map(l => (
              <a key={l} href={`/${l.toLowerCase()}`} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:K.t3, textDecoration:"none" }}>{l}</a>
            ))}
          </div>
        </div>
      )}

      {/* Page content */}
      <main>{children}</main>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer style={{ borderTop:`1px solid ${K.g800}`, padding:"clamp(32px,5vw,56px) clamp(16px,4vw,48px) clamp(20px,3vw,32px)", background:K.void }}>
        <div style={{ maxWidth:1100, margin:"0 auto" }}>
          {/* Grid: brand + 4 link cols */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:"clamp(24px,4vw,40px)", marginBottom:"clamp(28px,4vw,44px)" }}>
            {/* Brand */}
            <div style={{ minWidth:180 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, cursor:"pointer" }} onClick={() => router.push("/")}>
                <Image src="/images/kiki.png" alt="KIKI" width={28} height={28} style={{ borderRadius:3 }} />
                <span style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:15, color:K.t1 }}>KIKI<span style={{color:K.blue}}>.</span>Agent</span>
              </div>
              <p style={{ fontFamily:"Inter,sans-serif", fontSize:13, color:K.t3, lineHeight:1.7, marginBottom:14 }}>Autonomous LTV campaign execution. Your ad platforms learn from real customer value.</p>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {["SOC 2 in progress","GDPR","CCPA"].map(b => (
                  <span key={b} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, letterSpacing:"0.1em", color:K.t3, background:K.g850, border:`1px solid ${K.g700}`, borderRadius:2, padding:"2px 6px" }}>{b}</span>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {FOOTER_COLS.map(col => (
              <div key={col.title}>
                <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, letterSpacing:"0.14em", color:K.t3, marginBottom:14, textTransform:"uppercase" }}>{col.title}</p>
                {col.links.map(l => (
                  <a key={l.label} href={l.href}
                    style={{ display:"block", fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:K.t3, textDecoration:"none", marginBottom:9, transition:"color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.color=K.t2)}
                    onMouseLeave={e => (e.currentTarget.style.color=K.t3)}>
                    {l.label}
                  </a>
                ))}
              </div>
            ))}
          </div>

          {/* Download CTAs */}
          <div style={{ borderTop:`1px solid ${K.g800}`, paddingTop:20, marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:K.t3 }}>DOWNLOAD THE APP</span>
              {[{ l:"📱 iOS", h:"/app-download" }, { l:"▶ Android", h:"/app-download" }, { l:"⬡ Install PWA", h:"/app-download" }].map(a => (
                <a key={a.l} href={a.h}
                  style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:K.blue4, textDecoration:"none", background:K.blueD, border:`1px solid ${K.blue}25`, padding:"4px 10px", borderRadius:2 }}>
                  {a.l}
                </a>
              ))}
            </div>
            <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
              {[{l:"System Status", h:"/status", c:K.mint},{l:"Developer Docs", h:"/docs", c:K.blue4},{l:"Contact Sales", h:"/contact", c:K.t3}].map(l => (
                <a key={l.l} href={l.h} style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:10, color:l.c, textDecoration:"none" }}>{l.l}</a>
              ))}
            </div>
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop:`1px solid ${K.g800}`, paddingTop:20, display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10 }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, letterSpacing:"0.1em", color:K.t3, lineHeight:1.8 }}>KIKI AGENT™ a STOREGRILL INC LTD Company<br/>Registered in England & Wales · © 2026 All Rights Reserved</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:11, color:K.t3 }}>Built with precision · v2.4.0</span>
          </div>
        </div>
      </footer>

      {/* Mobile hamburger show helper */}
      <style>{`
        @media(max-width:768px){
          .nav-links{display:none!important}
          .md-show-flex{display:flex!important}
        }
        @media(min-width:769px){.md-show-flex{display:none!important}}
      `}</style>
    </div>
  );
}
