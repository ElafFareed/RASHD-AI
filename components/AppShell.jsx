"use client";
// components/AppShell.jsx

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { Logo } from "./UI";

export default function AppShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const hasSession = Boolean(localStorage.getItem("rashdUser"));

    if (!hasSession) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
      return;
    }

    setChecking(false);
  }, [pathname, router]);

  if (checking) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-obsidian)" }}>
        <div style={{ textAlign: "center" }}>
          <Logo />
          <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginTop: 16 }}>
            Preparing your Rashd demo...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
