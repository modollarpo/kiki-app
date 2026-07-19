"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

interface RevenueStream {
  name: string;
  amount: number;
  share: number;
  color: string;
  trend: number[];
}

interface CostCategory {
  name: string;
  amount: number;
  pct: number;
  color: string;
}

interface MonthlyPnL {
  month: string;
  revenue: number;
  costs: number;
  profit: number;
}

interface InsightsFinance {
  totals: { revenue: number; costs: number; profit: number; margin: number };
  revenueStreams: RevenueStream[];
  costCategories: CostCategory[];
  monthlyPnl: MonthlyPnL[];
}

interface OaaSTask {
  id: string;
  title: string;
  agent: string;
  type: string;
  status: string;
  expectedImpact: string;
  confidence: number;
  createdAt: string;
  details: string;
}

interface Partner {
  name: string;
  status: string;
  connectedAt: string;
  lastSync: string;
}

interface SavingsBreakdownItem {
  category: string;
  amount: number;
  pct: number;
}

interface InsightsSavings {
  total: number;
  fraud: number;
  optimization: number;
  breakdown: SavingsBreakdownItem[];
}

interface WorkflowEvent {
  agent: string;
  action: string;
  details: string;
  status: string;
  time: string;
}

interface InsightsAdmin {
  users: number;
  totalAgents: number;
  runningAgents: number;
  campaigns: number;
  totalSpend: number;
  walletBalance: number;
}

interface AiopsMetric {
  name: string;
  avg: number;
  max: number;
}

interface InsightsAiops {
  metrics: AiopsMetric[];
  uptime: number;
  activeServices: number;
}

interface AnomalyEvent {
  type: string;
  severity: string;
  description: string;
  time: string;
  status: string;
}

interface AuditEvent {
  source: string;
  action: string;
  details: string;
  time: string;
}

interface WarehouseFeature {
  name: string;
  value: string;
  samples: number;
  mean: number;
  stddev: number;
  updated: string;
}

interface InsightsInfluencer {
  campaigns: number;
  platforms: string[];
  totalReach: number;
  avgRoas: number;
}

interface InsightsResponse {
  finance: InsightsFinance;
  oaas: { tasks: OaaSTask[] };
  partners: Partner[];
  savings: InsightsSavings;
  workflow: WorkflowEvent[];
  admin: InsightsAdmin;
  aiops: InsightsAiops;
  anomaly: AnomalyEvent[];
  audit: AuditEvent[];
  warehouse: WarehouseFeature[];
  influencer: InsightsInfluencer;
}

export function useInsights() {
  const { token } = useAuth();
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchInsights = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/insights", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = (await res.json()) as InsightsResponse;
        setData(result);
      }
    } catch {
      // keep existing
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return { data, loading };
}
