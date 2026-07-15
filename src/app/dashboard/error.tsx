"use client";

import { K } from "@/lib/kdls";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: K.void,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 2,
            background: K.dangerT,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            color: K.danger,
            margin: "0 auto 16px",
          }}
        >
          ⚠
        </div>
        <h1
          style={{
            fontFamily: K.mono,
            fontWeight: 700,
            fontSize: 18,
            color: K.t1,
            marginBottom: 8,
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            fontFamily: K.sans,
            fontSize: 14,
            color: K.t3,
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          An unexpected error occurred while loading this page. Our team has been
          notified.
        </p>
        {error.digest && (
          <p
            style={{
              fontFamily: K.mono,
              fontSize: 10,
              color: K.t4,
              marginBottom: 16,
            }}
          >
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            padding: "10px 22px",
            background: K.blue,
            color: "white",
            fontFamily: K.mono,
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 2,
            border: "none",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
