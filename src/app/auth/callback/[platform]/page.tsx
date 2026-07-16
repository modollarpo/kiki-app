"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import Link from "next/link";
import { K } from "@/lib/kdls";
import { useAuth } from "@/hooks/useAuth";

const PLATFORM_LABELS: Record<string, string> = {
  meta: "Meta Ads",
  google: "Google Ads",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  snap: "Snapchat",
  pinterest: "Pinterest",
  amazon: "Amazon",
  ctv: "CTV",
};

type Status = "loading" | "error" | "success";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeParams = useParams();
  const platform = routeParams.platform as string;
  const token = useAuth((s) => s.token);

  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const platformLabel = PLATFORM_LABELS[platform] ?? platform.toUpperCase();

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !state) {
      setStatus("error");
      setError(
        !code
          ? "Missing authorization code. The platform may have denied access."
          : "Missing OAuth state parameter. This may indicate a security issue."
      );
      return;
    }

    if (!token) {
      setStatus("error");
      setError("You are not signed in. Please log in and try connecting again.");
      return;
    }

    (async () => {
      try {
        const res = await fetch("/api/integrations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            action: "oauth_callback",
            platform,
            code,
            state,
          }),
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Connection failed");
        }

        setStatus("success");
        setTimeout(() => router.push("/dashboard/intelligence"), 2000);
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
      }
    })();
  }, [code, state, platform, token, router]);

  return (
    <div
      style={{
        background: K.void,
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'JetBrains Mono',monospace",
        padding: 24,
      }}
    >
      <div
        style={{
          background: K.cardBg,
          border: `1px solid ${K.cardBorder}`,
          borderRadius: 8,
          padding: "40px 48px",
          maxWidth: 440,
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Platform label */}
        <p
          style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: 11,
            letterSpacing: "0.14em",
            color: K.t3,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Platform
        </p>
        <h1
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: K.t1,
            marginBottom: 24,
          }}
        >
          {platformLabel}
        </h1>

        {/* Loading */}
        {status === "loading" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                border: `3px solid ${K.g700}`,
                borderTopColor: K.blue,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p style={{ fontSize: 14, color: K.t2 }}>
              Connecting to {platformLabel}...
            </p>
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: K.mintD,
                border: `2px solid ${K.mint}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
              }}
            >
              ✓
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: K.mint }}>
              Connected to {platformLabel}
            </p>
            <p style={{ fontSize: 12, color: K.t3 }}>
              Redirecting to your dashboard...
            </p>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: K.dangerD,
                border: `2px solid ${K.danger}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                color: K.danger,
              }}
            >
              ✕
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: K.danger }}>
              Connection Failed
            </p>
            <p style={{ fontSize: 12, color: K.t3, lineHeight: 1.6 }}>
              {error}
            </p>
            <Link
              href="/dashboard/intelligence"
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "8px 20px",
                fontSize: 12,
                fontWeight: 600,
                color: K.t1,
                background: K.g850,
                border: `1px solid ${K.g700}`,
                borderRadius: 4,
                textDecoration: "none",
                transition: "background 0.15s",
              }}
            >
              Try Again
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
