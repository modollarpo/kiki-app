"use client";
import { useEffect, useRef } from "react";
import { useKikiStore } from "@/store";
import { useAuth } from "@/hooks/useAuth";

export function useAuthSync() {
  const setUser = useKikiStore(s => s.setUser);
  const { token, user } = useAuth();
  const prevToken = useRef(token);

  useEffect(() => {
    if (token && user && token !== prevToken.current) {
      setUser({
        id: user.id,
        name: user.name,
        email: user.email,
        password: "",
        role: user.role as "advertiser",
        tenantId: user.tenantId,
        tenantName: user.tenantName,
        plan: user.plan as "growth",
        avatarInitials: user.avatarInitials,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    }
    if (!token && prevToken.current) {
      setUser(null);
    }
    prevToken.current = token;
  }, [token, user, setUser]);
}
