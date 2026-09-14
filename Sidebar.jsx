"use client";
// components/Sidebar.jsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "./UI";
import { NAV_ITEMS } from "../lib/tokens";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [theme, setTheme] = useState("dark");

  const [user, setUser] = useState({
    name: "Demo User",
    email: "",
  });

  useEffect(() => {
    const savedUser = localStorage.getItem("rashdUser");

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    const savedTheme = localStorage.getItem("rashdTheme") || "dark";

    setTheme(savedTheme);
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    localStorage.setItem("rashdTheme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem("rashdUser");
    router.replace("/login");
  };

  const initials =
    user.name
      ?.split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "DU";

  return (
    <aside
      className="sidebar"
      style={{
        width: 220,
        minHeight: "100vh",
        background: "var(--color-midnight)",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        flexShrink: 0,
        position: "sticky",
        top: 0,
        height: "100vh",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "0 20px 24px",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: 12,
        }}
      >
        <Logo />
      </div>

      {/* Nav Items */}
      <nav className="sidebar-nav" style={{ padding: "8px 12px", flex: 1 }}>
        {NAV_ITEMS.map((item, index) => {
          const active = pathname === item.href;

          return (
            <Link
              key={`${item.label}-${item.href}-${index}`}
              href={item.href}
              style={{
                display: "block",
                marginBottom: 4,
              }}
            >
              <div
                className="nav-item"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
                  borderRadius: 10,
                  background: active
                    ? "var(--color-gold-glow)"
                    : "transparent",
                  border: active
                    ? "1px solid var(--color-border)"
                    : "1px solid transparent",
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    color: active
                      ? "var(--color-gold)"
                      : "var(--color-text-dim)",
                    fontSize: 14,
                  }}
                >
                  {item.icon}
                </span>

                <span
                  className="nav-label"
                  style={{
                    color: active
                      ? "var(--color-text)"
                      : "var(--color-text-muted)",
                    fontSize: 13,
                  }}
                >
                  {item.label}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Theme Toggle */}
      <div className="sidebar-actions" style={{ padding: "0 20px 16px" }}>
        <button
          onClick={toggleTheme}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "var(--font-body)",
          }}
        >
          <span className="mode-full">{theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}</span>
          <span className="mode-short">{theme === "dark" ? "☀️" : "🌙"}</span>
        </button>
        <button
          onClick={handleLogout}
          style={{
            width: "100%",
            marginTop: 8,
            padding: "10px 12px",
            borderRadius: 10,
            background: "transparent",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "var(--font-body)",
          }}
        >
          <span className="mode-full">↩ Logout</span>
          <span className="mode-short">↩</span>
        </button>
      </div>

      {/* User profile */}
      <div
        className="sidebar-profile"
        style={{
          padding: "20px",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #2DCFB3, #4FA3E0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              color: "#0A0A0F",
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div className="profile-copy">
            <div
              style={{
                color: "var(--color-text)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {user.name}
            </div>

            <div
              style={{
                color: "var(--color-text-muted)",
                fontSize: 11,
              }}
            >
              Premium Plan
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}