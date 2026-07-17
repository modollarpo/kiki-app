// ============================================================
// KIKI Agent Platform — Shared Type Definitions
// ============================================================

// ── Auth & Users ─────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  role: "advertiser" | "agency" | "admin" | "developer" | "finance" | "aiops" | "superadmin";
  tenantId: string;
  tenantName: string;
  plan: "starter" | "growth" | "enterprise";
  avatarInitials: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantName: string;
  plan: string;
  avatarInitials: string;
}

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  tenantName: string;
  plan: string;
  avatarInitials: string;
  iat: number;
  exp: number;
}

// ── Campaigns ────────────────────────────────────────────
export interface Campaign {
  id: string;
  tenantId: string;
  name: string;
  platform: string;
  status: "active" | "paused" | "draft" | "completed" | "error";
  roas: number;
  spend: number;
  budget: number;
  impressions: number;
  clicks: number;
  conversions: number;
  cpa: number;
  ltvPredicted: number;
  createdAt: string;
}

// ── Agents ───────────────────────────────────────────────
export type AgentType = "bidding" | "creative" | "pacing" | "oaas" | "signals" | "syncbrain";

// ── AI Models (Azure OpenAI) ───────────────────────────────
export type AIModelTier = "mini" | "standard";

export interface AIModel {
  id: string;
  name: string;
  provider: "Azure OpenAI";
  tier: AIModelTier;
  deploymentName: string;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export const AI_MODELS: AIModel[] = [
  {
    id: "gpt-4o-mini",
    name: "GPT-4o-mini",
    provider: "Azure OpenAI",
    tier: "mini",
    deploymentName: "gpt-4o-mini",
    maxTokens: 4096,
    costPer1kInput: 0.00015,
    costPer1kOutput: 0.0006,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "Azure OpenAI",
    tier: "standard",
    deploymentName: "gpt-4o",
    maxTokens: 16384,
    costPer1kInput: 0.0025,
    costPer1kOutput: 0.01,
  },
];

export interface Agent {
  id: string;
  tenantId: string;
  name: string;
  type: AgentType;
  status: "running" | "paused" | "error";
  task: string;
  metric: string;
  color: string;
  lastAction: string;
  actionCount: number;
}

// ── Wallet ───────────────────────────────────────────────
export interface WalletCard {
  id: string;
  last4: string;
  brand: string;
  limit: number;
  spent: number;
  campaign: string;
  status: "active" | "frozen" | "expired";
}

export interface WalletTransaction {
  id: string;
  type: "credit" | "debit" | "refund";
  amount: number;
  description: string;
  campaign: string | null;
  date: string;
  status: "pending" | "settled" | "failed";
}

export interface Wallet {
  id: string;
  tenantId: string;
  balance: number;
  currency: string;
  cards: WalletCard[];
  transactions: WalletTransaction[];
}

// ── Raw DB row shapes (for typed casts on query results) ─────
// The Postgres adapter returns `any` from `.get()/.all()`, so call sites
// cast to these shapes instead of `any` to keep type safety end-to-end.
export interface WalletCardRow {
  id: string;
  wallet_id: string;
  last4: string;
  brand: string;
  limit: number;
  spent: number;
  campaign: string;
  status: "active" | "frozen" | "expired";
  daily_limit: number;
  daily_spent: number;
  biometric_token: string | null;
  issuer: "local" | "stripe" | null;
  issuer_card_id: string | null;
}

export interface WalletRow {
  id: string;
  tenant_id: string;
  balance: number;
  currency: string;
}

export interface WalletTransactionRow {
  id: string;
  wallet_id: string;
  type: "credit" | "debit" | "refund";
  amount: number;
  description: string;
  campaign: string | null;
  status: "pending" | "settled" | "failed";
  created_at: string;
}

export interface WalletTopupRow {
  id: string;
  tenant_id: string;
  amount: number;
  method: string;
  description: string;
  payment_intent_id: string | null;
  status: "pending" | "settled";
}

export interface CampaignRow {
  id: string;
  target_cpa: number;
  spend: number;
  conversions: number;
  name: string;
}

// ── Notifications ────────────────────────────────────────
export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  severity: "critical" | "warning" | "info" | "success";
  title: string;
  body: string;
  time: string;
  read: boolean;
  link: string | null;
}

// ── Contacts ─────────────────────────────────────────────
export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  message: string;
  status: "new" | "contacted" | "qualified" | "converted" | "archived";
  createdAt: string;
}

// ── System Status ────────────────────────────────────────
export interface SystemService {
  name: string;
  status: "operational" | "degraded" | "down";
  p99: number;
  uptime: number;
}

export interface SystemStatus {
  status: "operational" | "degraded" | "outage";
  lastUpdated: string;
  services: SystemService[];
}

// ── API Responses ────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ── Dashboard ────────────────────────────────────────────
export interface DashboardKPI {
  value: number;
  delta: number;
  label: string;
}

export interface DashboardData {
  kpis: {
    roas: DashboardKPI;
    spend: DashboardKPI;
    conversions: DashboardKPI;
    ltv: DashboardKPI;
  };
  campaigns: Array<{
    id: string;
    name: string;
    platform: string;
    status: string;
    roas: number;
    spend: number;
    budget: number;
  }>;
  agents: Array<{
    id: string;
    name: string;
    status: string;
    task: string;
    metric: string;
    color: string;
  }>;
  wallet: { balance: number; cards: number };
  notifications: { unread: number; total: number };
  system: { status: string; agentsRunning: number; eventsToday: number; signalsTotal: number; fraudBlocked: number };
}
