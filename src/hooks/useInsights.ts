"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";

interface InsightsResponse {
  finance?: any;
  oaas?: { tasks: any[] };
  workflow?: any[];
  savings?: { total?: number; [key: string]: any };
  admin?: any;
  aiops?: any;
  anomaly?: any[];
  audit?: any[];
  warehouse?: any[];
  influencer?: any;
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
        const result = await res.json();
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
