"use client";
import { useState, useEffect, useMemo, memo, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  useKikiStore,
  useUnreadCount,
  useRunningAgents,
  useSystemStatus,
} from "@/store";
import type { User } from "@/types";
import { K } from "@/lib/kdls";
import { Badge } from "@/components/ui";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import Image from "next/image";

// ── Navigation Configuration ────────────────────────────────
interface NavItem {
  href: string;
  icon: string;
  label: string;
  badge?: string;
  bc?: string;
  pulse?: boolean;
  badgeSelector?: () => string | number;
}

const NAV_GROUPS: { group: string; allowedRoles?: string[]; items: NavItem[] }[] = [
  {
    group: "OVERVIEW",
    items: [
      { href: "/dashboard", icon: "⬛", label: "Command Center" },
      { href: "/dashboard/campaigns", icon: "⬡", label: "Campaigns", badgeSelector: () => "5", bc: K.mint },
      { href: "/dashboard/signals", icon: "◎", label: "Signal Stream", badge: "LIVE", bc: K.mint, pulse: true },
      { href: "/dashboard/agents", icon: "⚡", label: "AI Agents", badgeSelector: () => "6", bc: K.blue },
      { href: "/dashboard/guides", icon: "📖", label: "Guides" },
    ],
  },
  {
    group: "INTELLIGENCE",
    items: [
      { href: "/dashboard/syncbrain", icon: "⬡", label: "SyncBrain™" },
      { href: "/dashboard/analytics", icon: "◈", label: "Performance" },
      { href: "/dashboard/competitive", icon: "◉", label: "Competitive" },
      { href: "/dashboard/intelligence", icon: "⬡", label: "Intelligence" },
      { href: "/dashboard/scenarios", icon: "▸", label: "Scenario Planner" },
      { href: "/dashboard/mmm", icon: "▣", label: "Mix Modelling" },
      { href: "/dashboard/b2b", icon: "⬟", label: "B2B Attribution" },
    ],
  },
  {
    group: "FINANCE",
    allowedRoles: ["admin", "superadmin", "finance"],
    items: [
      { href: "/dashboard/wallet", icon: "◎", label: "Wallet & Cards" },
      { href: "/dashboard/billing", icon: "▣", label: "Billing" },
      { href: "/dashboard/margin", icon: "◈", label: "Profit Margin" },
      { href: "/dashboard/profit-margin", icon: "◈", label: "Profit & Margin" },
      { href: "/dashboard/finance", icon: "◉", label: "Finance Ops" },
      { href: "/dashboard/influencer", icon: "◉", label: "Influencers" },
    ],
  },
  {
    group: "OPERATIONS",
    items: [
      { href: "/dashboard/oaas", icon: "⬡", label: "OaaS Tasks" },
      { href: "/dashboard/workflow", icon: "◎", label: "Automation" },
      { href: "/dashboard/reports", icon: "▤", label: "Reports" },
      { href: "/dashboard/warehouse", icon: "▦", label: "Data Export" },
      { href: "/dashboard/fraud", icon: "⬗", label: "Fraud & IVT" },
      { href: "/dashboard/anomaly", icon: "⚠", label: "Anomaly Alerts", badgeSelector: () => "2", bc: K.warn },
      { href: "/dashboard/commerce", icon: "🛒", label: "Commerce" },
    ],
  },
  {
    group: "CRM & CONTENT",
    items: [
      { href: "/dashboard/crm", icon: "◉", label: "CRM" },
      { href: "/dashboard/creative-library", icon: "✦", label: "Creatives" },
      { href: "/dashboard/creative-attribution", icon: "✦", label: "Creative Attribution" },
    ],
  },
  {
    group: "SYSTEM",
    allowedRoles: ["admin", "superadmin"],
    items: [
      { href: "/dashboard/aiops", icon: "⬡", label: "AI Ops" },
      { href: "/dashboard/admin", icon: "⚙", label: "Admin Health" },
      { href: "/dashboard/developer", icon: "⬟", label: "Developer" },
      { href: "/dashboard/audit", icon: "⬗", label: "Audit Log" },
      { href: "/dashboard/notifications", icon: "🔔", label: "Notifications" },
      { href: "/dashboard/kyc", icon: "🛡", label: "KYC & Verification" },
      { href: "/dashboard/consent", icon: "🔒", label: "Consent & Privacy" },
      { href: "/dashboard/agency", icon: "⬡", label: "Agency View" },
      { href: "/dashboard/settings", icon: "⚙", label: "Settings" },
    ],
  },
];

const CMD_ITEMS = [
  ...NAV_GROUPS.flatMap((g) =>
    g.items.map((i) => ({ id: i.href, label: i.label, icon: i.icon, group: g.group }))
  ),
  { id: "/dashboard/campaigns", label: "Create Campaign", icon: "+", group: "ACTIONS" },
  { id: "/dashboard/wallet", label: "Top Up Wallet", icon: "↑", group: "ACTIONS" },
  { id: "/mobile", label: "Open Mobile App", icon: "📱", group: "ACTIONS" },
  { id: "/docs", label: "API Documentation", icon: "📚", group: "LINKS" },
  { id: "/status", label: "System Status", icon: "●", group: "LINKS" },
];

// ── Command Palette ─────────────────────────────────────────
function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const inputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) setTimeout(() => node.focus(), 50);
  }, []);

  const filtered = q
    ? CMD_ITEMS.filter(
        (i) =>
          i.label.toLowerCase().includes(q.toLowerCase()) ||
          i.group.toLowerCase().includes(q.toLowerCase())
      )
    : CMD_ITEMS.slice(0, 14);
  const groups = [...new Set(filtered.map((i) => i.group))];

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "14vh",
        paddingLeft: 16,
        paddingRight: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(6,6,8,0.87)",
          backdropFilter: "blur(4px)",
        }}
      />
      <div
        className="animate-scale-in"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 560,
          background: K.g900,
          border: `1px solid ${K.g700}`,
          borderRadius: 2,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 16px",
            borderBottom: `1px solid ${K.g800}`,
          }}
        >
          <span style={{ color: K.t3, fontFamily: K.mono, fontSize: 14, flexShrink: 0 }}>⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages, commands..."
            aria-label="Search"
            style={{
              flex: 1,
              background: "none",
              border: "none",
              fontFamily: K.mono,
              fontSize: 13,
              color: K.t1,
              outline: "none",
            }}
          />
          <kbd
            onClick={onClose}
            style={{
              fontFamily: K.mono,
              fontSize: 10,
              color: K.t4,
              background: K.g850,
              border: `1px solid ${K.g700}`,
              borderRadius: 2,
              padding: "2px 6px",
              cursor: "pointer",
            }}
          >
            ESC
          </kbd>
        </div>
        <div style={{ maxHeight: 320, overflowY: "auto", padding: "6px 0" }}>
          {groups.map((group) => (
            <div key={group}>
              <p
                style={{
                  padding: "6px 16px",
                  fontFamily: K.mono,
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: K.t3,
                }}
              >
                {group}
              </p>
              {filtered
                .filter((i) => i.group === group)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id.startsWith("/")) router.push(item.id);
                      onClose();
                    }}
                    role="option"
                    aria-selected={false}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 16px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = K.g850)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    <span
                      style={{
                        fontFamily: K.mono,
                        fontSize: 14,
                        color: K.t3,
                        width: 20,
                        textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      {item.icon}
                    </span>
                    <span
                      style={{
                        fontFamily: K.mono,
                        fontSize: 12,
                        fontWeight: 600,
                        color: K.t1,
                        flex: 1,
                      }}
                    >
                      {item.label}
                    </span>
                    <span style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>
                      {group}
                    </span>
                  </button>
                ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p
              style={{
                padding: "20px 16px",
                textAlign: "center",
                fontFamily: K.mono,
                fontSize: 12,
                color: K.t4,
              }}
            >
              No results for &quot;{q}&quot;
            </p>
          )}
        </div>
        <div
          style={{
            borderTop: `1px solid ${K.g800}`,
            padding: "8px 16px",
            display: "flex",
            gap: 20,
          }}
        >
          {["↑↓ navigate", "↵ select", "esc close"].map((h) => (
            <span key={h} style={{ fontFamily: K.mono, fontSize: 10, color: K.t3 }}>
              {h}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sidebar Content ─────────────────────────────────────────
const SidebarContent = memo(function SidebarContent({
  sidebarCollapsed,
  isMobile,
  running,
  user,
  pathname,
  router,
  toggleSidebar,
  setMobileSidebarOpen,
}: {
  sidebarCollapsed: boolean;
  isMobile: boolean;
  running: number;
  user: User | null;
  pathname: string | null;
  router: ReturnType<typeof useRouter>;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (v: boolean) => void;
}) {
  return (
    <>
      {/* Logo */}
      <div
        onClick={() => router.push("/")}
        role="link"
        aria-label="Go to homepage"
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "0 16px",
          borderBottom: `1px solid ${K.g800}`,
          flexShrink: 0,
          cursor: "pointer",
        }}
      >
        <Image
          src="/images/kiki.png"
          alt="KIKI"
          width={24}
          height={24}
          style={{
            borderRadius: 2,
            flexShrink: 0,
            margin: 2,
          }}
        />
        {(!sidebarCollapsed || isMobile) && (
          <div>
            <p
              style={{
                fontFamily: K.mono,
                fontWeight: 700,
                fontSize: 13,
                color: K.t1,
                lineHeight: 1,
              }}
            >
              KIKI<span style={{ color: K.blue }}>.</span>Agent
            </p>
            <p
              style={{
                fontFamily: K.mono,
                fontSize: 10,
                letterSpacing: "0.12em",
                color: K.t3,
                marginTop: 2,
              }}
            >
              ™ ENTERPRISE
            </p>
          </div>
        )}
      </div>

      {/* Agent ticker */}
      {(!sidebarCollapsed || isMobile) && running > 0 && (
        <div
          style={{
            padding: "6px 16px",
            background: K.g950,
            borderBottom: `1px solid ${K.g800}`,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            className="animate-kdls-pulse"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: K.mint,
              display: "inline-block",
            }}
          />
          <span style={{ fontFamily: K.mono, fontSize: 10, color: K.mint }}>
            {running} agents running
          </span>
        </div>
      )}

      <nav
        aria-label="Dashboard navigation"
        style={{ flex: 1, overflowY: "auto", padding: "10px 8px" }}
      >
        {NAV_GROUPS.filter(
          (group) => !group.allowedRoles || (user && group.allowedRoles.includes(user.role))
        ).map((group) => (
          <div key={group.group} style={{ marginBottom: 14 }}>
            {(!sidebarCollapsed || isMobile) && (
              <p
                style={{
                  fontFamily: K.mono,
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  color: K.t3,
                  padding: "0 8px",
                  marginBottom: 4,
                }}
              >
                {group.group}
              </p>
            )}
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              const badgeText = item.badgeSelector
                ? item.badgeSelector()
                : item.badge;
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    router.push(item.href);
                    if (isMobile) setMobileSidebarOpen(false);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  title={sidebarCollapsed && !isMobile ? item.label : undefined}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "9px 10px",
                    borderRadius: 2,
                    border: "none",
                    borderLeft: `2px solid ${isActive ? K.blue : "transparent"}`,
                    textAlign: "left",
                    background: isActive ? `${K.blue}10` : "transparent",
                    color: isActive ? K.blue4 : K.t3,
                    transition: "all 0.1s",
                    marginBottom: 1,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = K.g850;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span style={{ fontSize: 12, flexShrink: 0 }}>{item.icon}</span>
                  {(!sidebarCollapsed || isMobile) && (
                    <>
                      <span
                        style={{
                          fontFamily: K.mono,
                          fontSize: 11,
                          fontWeight: 600,
                          flex: 1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {item.label}
                      </span>
                      {badgeText !== undefined && (
                        <Badge color={item.bc || K.t3} dot={item.pulse} pulse={item.pulse}>
                          {badgeText}
                        </Badge>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      {(!sidebarCollapsed || isMobile) && (
        <div style={{ borderTop: `1px solid ${K.g800}`, padding: 8, flexShrink: 0 }}>
          <button
            onClick={() => router.push("/dashboard/settings")}
            aria-label="User settings"
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              borderRadius: 2,
              border: "none",
              cursor: "pointer",
              background: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = K.g850)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 2,
                background: K.blueD,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: K.mono,
                fontWeight: 700,
                fontSize: 10,
                color: K.blue4,
                flexShrink: 0,
              }}
            >
              {user?.avatarInitials || "U"}
            </div>
            <div style={{ flex: 1, overflow: "hidden", textAlign: "left" }}>
              <p
                style={{
                  fontFamily: K.mono,
                  fontSize: 11,
                  fontWeight: 600,
                  color: K.t1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {user?.name || "User"}
              </p>
              <p style={{ fontFamily: K.mono, fontSize: 11, color: K.t3 }}>
                {user?.plan || "free"} plan
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Desktop collapse button */}
      {!isMobile && (
        <button
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            position: "absolute",
            right: -10,
            top: 72,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: K.g700,
            border: `1px solid ${K.g600}`,
            color: K.t3,
            fontSize: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            cursor: "pointer",
          }}
        >
          {sidebarCollapsed ? "›" : "‹"}
        </button>
      )}
    </>
  );
});

// ── Main Layout ─────────────────────────────────────────────
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const {
    user,
    sidebarCollapsed,
    toggleSidebar,
    cmdPaletteOpen,
    setCmdPaletteOpen,
  } = useKikiStore();
  const unread = useUnreadCount();
  const running = useRunningAgents();
  const systemStatus = useSystemStatus();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setCmdPaletteOpen]);

  const sidebarWidth = isMobile ? 160 : sidebarCollapsed ? 60 : 230;
  const statusColor =
    systemStatus === "nominal"
      ? K.mint
      : systemStatus === "degraded"
        ? K.warn
        : K.danger;
  const statusLabel =
    systemStatus === "nominal"
      ? "NOMINAL"
      : systemStatus === "degraded"
        ? "DEGRADED"
        : "OUTAGE";

  const breadcrumb = pathname
    ?.replace("/dashboard/", "")
    .replace("/dashboard", "OVERVIEW")
    .toUpperCase()
    .replace(/-/g, " ");

  return (
    <div style={{ display: "flex", height: "100dvh", overflow: "hidden", background: K.void }}>
      {/* Mobile overlay */}
      {isMobile && mobileSidebarOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 199,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label="Sidebar"
        style={{
          width: sidebarWidth,
          minWidth: isMobile ? sidebarWidth : sidebarCollapsed ? 60 : 230,
          background: K.void,
          borderRight: `1px solid ${K.g800}`,
          display: "flex",
          flexDirection: "column",
          transition: "all 0.25s",
          flexShrink: 0,
          overflow: "hidden",
          position: isMobile ? "fixed" : "relative",
          left: isMobile ? (mobileSidebarOpen ? 0 : -sidebarWidth) : 0,
          top: 0,
          bottom: 0,
          zIndex: isMobile ? 200 : 1,
        }}
      >
        <SidebarContent
          sidebarCollapsed={sidebarCollapsed}
          isMobile={isMobile}
          running={running}
          user={user}
          pathname={pathname}
          router={router}
          toggleSidebar={toggleSidebar}
          setMobileSidebarOpen={setMobileSidebarOpen}
        />
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        {/* Header */}
        <header
          style={{
            height: 56,
            background: K.void,
            borderBottom: `1px solid ${K.g800}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 clamp(12px,2vw,24px)",
            flexShrink: 0,
          }}
        >
          {isMobile && (
            <button
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              aria-label="Toggle sidebar"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                background: "none",
                border: "none",
                padding: 6,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 18, height: 2, background: K.t2, borderRadius: 1 }} />
              ))}
            </button>
          )}

          <div style={{ flex: 1, overflow: "hidden" }}>
            <span
              style={{
                fontFamily: K.mono,
                fontSize: 10,
                letterSpacing: "0.1em",
                color: K.t4,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "block",
              }}
            >
              KIKI.AGENT / {breadcrumb}
            </span>
          </div>

          <button
            onClick={() => setCmdPaletteOpen(true)}
            aria-label="Open command palette"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 32,
              padding: "0 12px",
              background: K.g850,
              border: `1px solid ${K.g700}`,
              borderRadius: 2,
              color: K.t3,
              fontFamily: K.mono,
              fontSize: 11,
              cursor: "pointer",
              minWidth: isMobile ? 120 : 200,
              maxWidth: 260,
              flexShrink: 1,
            }}
          >
            <span style={{ flexShrink: 0 }}>⌕</span>
            <span
              style={{
                flex: 1,
                textAlign: "left",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {isMobile ? "Search" : "Search (⌘K)..."}
            </span>
            {!isMobile && (
              <kbd
                style={{
                  fontFamily: K.mono,
                  fontSize: 10,
                  color: K.t3,
                  background: K.g900,
                  border: `1px solid ${K.g700}`,
                  borderRadius: 2,
                  padding: "1px 5px",
                  flexShrink: 0,
                }}
              >
                ⌘K
              </kbd>
            )}
          </button>

          {!isMobile && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: statusColor,
                  display: "inline-block",
                }}
              />
              <span
                style={{
                  fontFamily: K.mono,
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  color: statusColor,
                  whiteSpace: "nowrap",
                }}
              >
                {statusLabel}
              </span>
            </div>
          )}

          <ThemeToggle size={36} />

          <button
            onClick={() => router.push("/dashboard/notifications")}
            aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
            style={{
              width: 36,
              height: 36,
              borderRadius: 2,
              background: K.g850,
              border: `1px solid ${K.g700}`,
              color: K.t3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 14,
              position: "relative",
              flexShrink: 0,
            }}
          >
            🔔
            {unread > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  width: 16,
                  height: 16,
                  background: K.danger,
                  borderRadius: "50%",
                  fontFamily: K.mono,
                  fontSize: 10,
                  fontWeight: 700,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {unread}
              </span>
            )}
          </button>
        </header>

        {/* Page content */}
        <main
          role="main"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            background: K.void,
            WebkitOverflowScrolling: "touch",
          }}
        >
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      {/* Command palette */}
      <CommandPalette open={cmdPaletteOpen} onClose={() => setCmdPaletteOpen(false)} />
    </div>
  );
}
