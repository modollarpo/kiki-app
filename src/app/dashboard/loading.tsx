import { K } from "@/lib/kdls";

export default function DashboardLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: K.void,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: `3px solid ${K.g700}`,
            borderTopColor: K.blue,
            borderRadius: "50%",
            margin: "0 auto 16px",
            animation: "spin 1s linear infinite",
          }}
        />
        <p
          style={{
            fontFamily: K.mono,
            fontSize: 11,
            color: K.t3,
            letterSpacing: "0.08em",
          }}
        >
          Loading Command Center...
        </p>
      </div>
    </div>
  );
}
