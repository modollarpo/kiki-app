import Link from "next/link";
import { K } from "@/lib/kdls";

export default function DashboardNotFound() {
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
            fontFamily: K.mono,
            fontWeight: 700,
            fontSize: 80,
            color: K.g700,
            lineHeight: 1,
            marginBottom: 12,
          }}
        >
          404
        </div>
        <h1
          style={{
            fontFamily: K.mono,
            fontWeight: 700,
            fontSize: 20,
            color: K.t1,
            marginBottom: 8,
          }}
        >
          Page not found
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
          The dashboard page you&apos;re looking for doesn&apos;t exist or you
          don&apos;t have access.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link
            href="/dashboard"
            style={{
              padding: "10px 22px",
              background: K.blue,
              color: "white",
              fontFamily: K.mono,
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 2,
              textDecoration: "none",
            }}
          >
            ← Dashboard
          </Link>
          <Link
            href="/"
            style={{
              padding: "10px 22px",
              background: K.g800,
              color: K.t2,
              fontFamily: K.mono,
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 2,
              border: `1px solid ${K.g700}`,
              textDecoration: "none",
            }}
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
