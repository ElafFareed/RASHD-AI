"use client";
// app/login/page.js — Login Page

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GeoPattern,
  GoldLine,
  Badge,
} from "../../components/UI";

export default function LoginPage() {
  const router = useRouter();

  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] =
    useState(false);
  const [error, setError] = useState("");

  const handleSubmit = () => {
    setError("");

    if (!email.trim() || !password) {
      setError(
        "Please fill in all required fields."
      );
      return;
    }

    if (
      tab === "signup" &&
      !name.trim()
    ) {
      setError("Please enter your name.");
      return;
    }

    setLoading(true);

    window.setTimeout(() => {
      const cleanEmail =
        email.trim().toLowerCase();

      const displayName =
        tab === "signup"
          ? name.trim()
          : cleanEmail
              .split("@")[0]
              .replace(/[._-]+/g, " ")
              .split(" ")
              .filter(Boolean)
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() +
                  word.slice(1)
              )
              .join(" ");

      localStorage.setItem(
        "rashdUser",
        JSON.stringify({
          name: displayName || "Demo User",
          email: cleanEmail,
        })
      );

      const params = new URLSearchParams(
        window.location.search
      );

      setLoading(false);

      router.push(
        params.get("next") || "/dashboard"
      );
    }, 1200);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmit();
    }
  };

  const changeTab = (nextTab) => {
    setTab(nextTab);
    setError("");
    setPassword("");

    if (nextTab === "login") {
      setName("");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "var(--color-obsidian)",
        display: "flex",
        position: "relative",
        overflow: "hidden",
        fontFamily: "var(--font-body)",
      }}
    >
      <GeoPattern />

      {/* Left glow */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          left: "-100px",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Right glow */}
      <div
        style={{
          position: "fixed",
          bottom: "10%",
          right: "-80px",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(45,207,179,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Left panel */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "60px 80px",
          borderRight:
            "1px solid var(--color-border)",
          position: "relative",
          zIndex: 5,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 64,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background:
                "linear-gradient(135deg, #C9A84C, #8A6F32)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: "#0A0A0F",
              fontWeight: 700,
            }}
          >
            ر
          </div>

          <span
            style={{
              color: "var(--color-text)",
              fontSize: 22,
              fontFamily:
                "var(--font-display)",
              fontWeight: 600,
              letterSpacing: "0.04em",
            }}
          >
            Rashd{" "}
            <span
              style={{
                color: "var(--color-gold)",
              }}
            >
              AI
            </span>
          </span>
        </div>

        <Badge
          style={{
            marginBottom: 24,
          }}
        >
          🌙 Your AI Financial Compass
        </Badge>

        <h2
          style={{
            fontFamily:
              "var(--font-display)",
            fontSize:
              "clamp(36px, 4vw, 56px)",
            color: "var(--color-text)",
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            marginTop: 20,
            marginBottom: 24,
          }}
        >
          Smarter finances
          <br />

          <span
            style={{
              color: "var(--color-gold)",
            }}
          >
            start here
          </span>
        </h2>

        <p
          style={{
            color:
              "var(--color-text-muted)",
            fontSize: 16,
            lineHeight: 1.7,
            maxWidth: 420,
            marginBottom: 48,
          }}
        >
          Rashd AI analyzes financial
          activity, learns spending patterns,
          and becomes your personal financial
          guide — tracking spending, goals,
          and habits so you don&apos;t have
          to.
        </p>

        <GoldLine
          style={{
            maxWidth: 280,
            marginBottom: 40,
          }}
        />

        {/* Features */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {[
            {
              icon: "◈",
              text: "AI spending pattern analysis",
            },
            {
              icon: "◉",
              text: "Instant affordability checker",
            },
            {
              icon: "◆",
              text: "Smart savings goal tracking",
            },
            {
              icon: "◇",
              text: "Behavioral finance insights",
            },
          ].map((feature) => (
            <div
              key={feature.text}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <span
                style={{
                  color:
                    "var(--color-gold)",
                  fontSize: 16,
                }}
              >
                {feature.icon}
              </span>

              <span
                style={{
                  color:
                    "var(--color-text-muted)",
                  fontSize: 14,
                }}
              >
                {feature.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div
        style={{
          width: 480,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "60px 48px",
          position: "relative",
          zIndex: 5,
        }}
      >
        <div
          style={{
            width: "100%",
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: 4,
              background:
                "var(--color-surface)",
              border:
                "1px solid var(--color-border)",
              borderRadius: 12,
              padding: 4,
              marginBottom: 36,
            }}
          >
            {["login", "signup"].map(
              (tabItem) => (
                <button
                  key={tabItem}
                  type="button"
                  onClick={() =>
                    changeTab(tabItem)
                  }
                  style={{
                    flex: 1,
                    padding: 10,
                    borderRadius: 9,
                    border: "none",
                    background:
                      tab === tabItem
                        ? "linear-gradient(135deg, #C9A84C, #8A6F32)"
                        : "transparent",
                    color:
                      tab === tabItem
                        ? "#0A0A0F"
                        : "var(--color-text-muted)",
                    fontSize: 13,
                    fontWeight:
                      tab === tabItem
                        ? 700
                        : 400,
                    cursor: "pointer",
                    fontFamily:
                      "var(--font-body)",
                    textTransform:
                      "capitalize",
                    letterSpacing:
                      "0.03em",
                    transition: "all 0.2s",
                  }}
                >
                  {tabItem === "login"
                    ? "Sign In"
                    : "Create Account"}
                </button>
              )
            )}
          </div>

          <h3
            style={{
              fontFamily:
                "var(--font-display)",
              fontSize: 28,
              color: "var(--color-text)",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            {tab === "login"
              ? "Welcome back"
              : "Get started"}
          </h3>

          <p
            style={{
              color:
                "var(--color-text-muted)",
              fontSize: 13,
              marginBottom: 16,
            }}
          >
            {tab === "login"
              ? "Sign in to your Rashd AI account"
              : "Create your free Rashd AI account"}
          </p>

          <div
            style={{
              background:
                "var(--color-gold-glow)",
              border:
                "1px solid var(--color-border-strong)",
              borderRadius: 12,
              padding: "12px 14px",
              color:
                "var(--color-text-muted)",
              fontSize: 12,
              lineHeight: 1.5,
              marginBottom: 28,
            }}
          >
            <strong
              style={{
                color:
                  "var(--color-gold)",
              }}
            >
              Demo Mode:
            </strong>{" "}
            Any email and password will work
            for the hackathon prototype. Real
            authentication is mocked.
          </div>

          {/* Name field */}
          {tab === "signup" && (
            <div
              style={{
                marginBottom: 18,
              }}
            >
              <label
                style={{
                  color:
                    "var(--color-text-muted)",
                  fontSize: 11,
                  letterSpacing:
                    "0.08em",
                  textTransform:
                    "uppercase",
                  display: "block",
                  marginBottom: 8,
                }}
              >
                Full Name
              </label>

              <input
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                onKeyDown={handleKeyDown}
                placeholder="e.g. Elaf Aljohar"
                autoComplete="name"
                style={{
                  width: "100%",
                  background:
                    "var(--color-surface)",
                  border:
                    "1px solid var(--color-border)",
                  borderRadius: 12,
                  padding: "14px 18px",
                  color:
                    "var(--color-text)",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                  transition:
                    "border-color 0.2s",
                }}
                onFocus={(event) => {
                  event.target.style.borderColor =
                    "var(--color-gold)";
                }}
                onBlur={(event) => {
                  event.target.style.borderColor =
                    "var(--color-border)";
                }}
              />
            </div>
          )}

          {/* Email */}
          <div
            style={{
              marginBottom: 18,
            }}
          >
            <label
              style={{
                color:
                  "var(--color-text-muted)",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                display: "block",
                marginBottom: 8,
              }}
            >
              Email
            </label>

            <input
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              onKeyDown={handleKeyDown}
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              style={{
                width: "100%",
                background:
                  "var(--color-surface)",
                border:
                  "1px solid var(--color-border)",
                borderRadius: 12,
                padding: "14px 18px",
                color:
                  "var(--color-text)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                transition:
                  "border-color 0.2s",
              }}
              onFocus={(event) => {
                event.target.style.borderColor =
                  "var(--color-gold)";
              }}
              onBlur={(event) => {
                event.target.style.borderColor =
                  "var(--color-border)";
              }}
            />
          </div>

          {/* Password */}
          <div
            style={{
              marginBottom: 28,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                marginBottom: 8,
              }}
            >
              <label
                style={{
                  color:
                    "var(--color-text-muted)",
                  fontSize: 11,
                  letterSpacing:
                    "0.08em",
                  textTransform:
                    "uppercase",
                }}
              >
                Password
              </label>

              {tab === "login" && (
                <span
                  style={{
                    color:
                      "var(--color-gold)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Forgot password?
                </span>
              )}
            </div>

            <input
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              onKeyDown={handleKeyDown}
              type="password"
              placeholder="••••••••"
              autoComplete={
                tab === "signup"
                  ? "new-password"
                  : "current-password"
              }
              style={{
                width: "100%",
                background:
                  "var(--color-surface)",
                border:
                  "1px solid var(--color-border)",
                borderRadius: 12,
                padding: "14px 18px",
                color:
                  "var(--color-text)",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                transition:
                  "border-color 0.2s",
              }}
              onFocus={(event) => {
                event.target.style.borderColor =
                  "var(--color-gold)";
              }}
              onBlur={(event) => {
                event.target.style.borderColor =
                  "var(--color-border)";
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background:
                  "rgba(232,93,117,0.1)",
                border:
                  "1px solid rgba(232,93,117,0.3)",
                color: "#E85D75",
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            className="btn-gold"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: 15,
              fontSize: 15,
              borderRadius: 12,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Please wait..."
              : tab === "login"
              ? "Sign In →"
              : "Create Account →"}
          </button>

          <GoldLine
            style={{
              margin: "28px 0",
            }}
          />

          {/* Demo actions */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {[
              {
                icon: "🔵",
                label:
                  "Continue with Google",
              },
              {
                icon: "🏦",
                label:
                  "Connect Bank Account",
              },
            ].map((action) => (
              <button
                key={action.label}
                type="button"
                className="btn-outline"
                onClick={() =>
                  setError(
                    `${action.label} is simulated in this MVP.`
                  )
                }
                style={{
                  width: "100%",
                  padding: 13,
                  fontSize: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "center",
                  gap: 10,
                }}
              >
                <span>{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>

          <p
            style={{
              color:
                "var(--color-text-muted)",
              fontSize: 12,
              textAlign: "center",
              marginTop: 28,
              lineHeight: 1.6,
            }}
          >
            By continuing, you agree to Rashd
            AI&apos;s{" "}
            <span
              style={{
                color:
                  "var(--color-gold)",
                cursor: "pointer",
              }}
            >
              Terms of Service
            </span>{" "}
            and{" "}
            <span
              style={{
                color:
                  "var(--color-gold)",
                cursor: "pointer",
              }}
            >
              Privacy Policy
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}