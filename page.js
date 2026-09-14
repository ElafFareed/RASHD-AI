"use client";
// app/page.js — Landing Page

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GeoPattern, GoldLine, Badge } from "../components/UI";

export default function LandingPage() {
  const router = useRouter();
  const [hovered, setHovered] = useState(null);

  const startDemo = () => {
    localStorage.setItem("rashdUser", JSON.stringify({ name: "Investor Demo", email: "demo@rashd.ai" }));
    router.push("/dashboard");
  };

  const features = [
    {
      icon: "◈",
      title: "Smart Spending Analysis",
      desc: "AI detects patterns and emotional triggers in your financial behavior automatically.",
    },
    {
      icon: "◉",
      title: "Affordability Engine",
      desc: "Ask before you spend. Get instant personalized purchase analysis from Rashd.",
    },
    {
      icon: "◆",
      title: "Goal Intelligence",
      desc: "Dynamic savings goals that adapt to your income and spending habits in real time.",
    },
    {
      icon: "◇",
      title: "Behavioral Insights",
      desc: "Understand the psychology behind every financial decision you make.",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-obsidian)",
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-body)",
      }}
    >
      <GeoPattern />

      {/* Gradient orbs */}
      <div
        style={{
          position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }}
      />
      <div
        style={{
          position: "fixed", bottom: 0, right: -100,
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(45,207,179,0.08) 0%, transparent 70%)",
          pointerEvents: "none", zIndex: 0,
        }}
      />

      {/* NAV */}
      <nav
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 48px",
          borderBottom: "1px solid var(--color-border)",
          backdropFilter: "blur(20px)",
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(10,10,15,0.8)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: "linear-gradient(135deg, #C9A84C, #8A6F32)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, color: "#0A0A0F",
            }}
          >
            ر
          </div>
          <span
            style={{
              color: "var(--color-text)", fontSize: 18,
              fontFamily: "var(--font-display)", fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            Rashd <span style={{ color: "var(--color-gold)" }}>AI</span>
          </span>
        </div>

        <div style={{ display: "flex", gap: 32 }}>
          {["Features", "Pricing", "About"].map((item) => (
            <span
              key={item}
              style={{ color: "var(--color-text-muted)", fontSize: 14, cursor: "pointer" }}
              onMouseEnter={(e) => (e.target.style.color = "var(--color-gold)")}
              onMouseLeave={(e) => (e.target.style.color = "var(--color-text-muted)")}
            >
              {item}
            </span>
          ))}
        </div>

        <Link href="/login">
          <button className="btn-gold" style={{ padding: "10px 24px", fontSize: 13 }}>
            Get Started
          </button>
        </Link>
      </nav>

      {/* HERO */}
      <div
        style={{
          maxWidth: 800, margin: "0 auto",
          padding: "100px 48px 80px",
          textAlign: "center",
          position: "relative", zIndex: 5,
        }}
      >
        <Badge>🌙 Your AI Financial Compass</Badge>

        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(48px, 7vw, 80px)",
            fontWeight: 700,
            color: "var(--color-text)",
            lineHeight: 1.1,
            marginTop: 28,
            marginBottom: 20,
            letterSpacing: "-0.03em",
          }}
        >
          Financial wisdom,
          <br />
          <span style={{ color: "var(--color-gold)" }}>guided by intelligence</span>
        </h1>

        <p
          style={{
            color: "var(--color-text-muted)",
            fontSize: 18, lineHeight: 1.7,
            maxWidth: 560, margin: "0 auto 48px",
          }}
        >
          Rashd AI connects to your finances, learns your behavior, and becomes your
          personal financial guide — from spending insights to smarter savings.
        </p>

        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
          <Link href="/login">
            <button className="btn-gold" style={{ padding: "14px 36px", fontSize: 15 }}>
              Connect My Bank
            </button>
          </Link>
          <button onClick={startDemo} className="btn-outline" style={{ padding: "14px 36px", fontSize: 15 }}>
            See Demo →
          </button>
        </div>

        <GoldLine style={{ maxWidth: 300, margin: "64px auto 0" }} />

        {/* Dashboard Preview */}
        <div
          style={{
            marginTop: 64,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border-strong)",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.12)",
          }}
        >
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {["#E85D75", "#C9A84C", "#2DCFB3"].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { label: "Monthly Balance", val: "SAR 12,450", color: "#2DCFB3" },
              { label: "Saved This Month", val: "SAR 3,200", color: "#C9A84C" },
              { label: "Spending Score", val: "84 / 100", color: "#4FA3E0" },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  background: "var(--color-ink)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  border: `1px solid ${s.color}20`,
                }}
              >
                <div
                  style={{
                    color: "var(--color-text-muted)",
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    color: s.color,
                    fontSize: 18,
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                  }}
                >
                  {s.val}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 12,
              background: "var(--color-ink)",
              borderRadius: 12,
              padding: "14px 16px",
              border: "1px solid var(--color-border)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "var(--color-gold-glow)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, flexShrink: 0,
              }}
            >
              🤖
            </div>
            <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>
              <span style={{ color: "var(--color-gold)" }}>Rashd:</span> You spend 34% more on
              weekends. Want to set a weekend budget limit?
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 48px 100px" }}>
        <GoldLine style={{ marginBottom: 64 }} />
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Badge>Intelligence-First Design</Badge>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 42,
              color: "var(--color-text)",
              marginTop: 20,
              fontWeight: 600,
            }}
          >
            Every feature, purposeful
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {features.map((f, i) => (
            <div
              key={i}
              className="feature-card"
              style={{
                background: hovered === i ? "var(--color-surface-hover)" : "var(--color-surface)",
                border: `1px solid ${hovered === i ? "var(--color-border-strong)" : "var(--color-border)"}`,
                borderRadius: 16,
                padding: "28px",
                cursor: "default",
              }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={{ color: "var(--color-gold)", fontSize: 24, marginBottom: 14 }}>{f.icon}</div>
              <div
                style={{
                  color: "var(--color-text)",
                  fontSize: 17,
                  fontFamily: "var(--font-display)",
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                {f.title}
              </div>
              <div style={{ color: "var(--color-text-muted)", fontSize: 13, lineHeight: 1.6 }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: 60,
            textAlign: "center",
            padding: "48px",
            background: "var(--color-surface)",
            borderRadius: 24,
            border: "1px solid var(--color-border-strong)",
            boxShadow: "0 0 60px rgba(201,168,76,0.06)",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 36,
              color: "var(--color-text)",
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            Start your financial journey
          </h3>
          <p style={{ color: "var(--color-text-muted)", fontSize: 15, marginBottom: 32 }}>
            Connect your bank account or upload your transactions to begin.
          </p>
          <button onClick={startDemo} className="btn-gold" style={{ padding: "16px 48px", fontSize: 16 }}>
            Begin Demo →
          </button>
        </div>
      </div>
    </div>
  );
}
