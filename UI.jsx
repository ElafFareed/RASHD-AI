"use client";
// components/UI.jsx — Shared primitive components

export function GeoPattern() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="geo" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
          <polygon
            points="40,2 78,22 78,58 40,78 2,58 2,22"
            fill="none" stroke="#C9A84C" strokeWidth="0.5"
          />
          <polygon
            points="40,14 66,28 66,52 40,66 14,52 14,28"
            fill="none" stroke="#C9A84C" strokeWidth="0.3"
          />
          <circle cx="40" cy="40" r="4" fill="none" stroke="#C9A84C" strokeWidth="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#geo)" />
    </svg>
  );
}

export function GoldLine({ style }) {
  return (
    <div
      style={{
        height: "1px",
        background: "linear-gradient(90deg, transparent, #C9A84C, transparent)",
        ...style,
      }}
    />
  );
}

export function Badge({ children, color = "#C9A84C" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 20,
        border: `1px solid ${color}40`,
        background: `${color}10`,
        color,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        fontFamily: "var(--font-body)",
      }}
    >
      {children}
    </span>
  );
}

export function StatCard({ label, value, sub, color = "#C9A84C", icon }) {
  return (
    <div
      className="stat-card"
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 16,
        padding: "20px 24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute", top: 0, right: 0,
          width: 80, height: 80,
          background: `radial-gradient(circle at top right, ${color}18, transparent 70%)`,
        }}
      />
      <div style={{ fontSize: 22, marginBottom: 8 }}>{icon}</div>
      <div
        style={{
          color: "var(--color-text-muted)",
          fontSize: 11,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: "var(--font-body)",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "var(--color-text)",
          fontSize: 26,
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ color, fontSize: 12, marginTop: 4, fontFamily: "var(--font-body)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function Logo({ size = "md" }) {
  const s = size === "sm" ? 28 : 36;
  const fs = size === "sm" ? 14 : 18;
  const textSize = size === "sm" ? 14 : 18;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: size === "sm" ? 8 : 12 }}>
      <div
        style={{
          width: s, height: s, borderRadius: size === "sm" ? 7 : 10,
          background: "linear-gradient(135deg, #C9A84C, #8A6F32)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: fs, fontWeight: 700, color: "#0A0A0F",
          flexShrink: 0,
        }}
      >
        ر
      </div>
      <span
        className="logo-text"
        style={{
          color: "var(--color-text)",
          fontSize: textSize,
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          letterSpacing: "0.04em",
        }}
      >
        Rashd <span style={{ color: "var(--color-gold)" }}>AI</span>
      </span>
    </div>
  );
}
