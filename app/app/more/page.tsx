"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForge } from "@/lib/store";
import { useToast } from "@/lib/toast";
import { Avatar } from "@/components/AppShell";
import AddToHome from "@/components/AddToHome";

function RowIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-3 text-molten">
      <svg
        width="19"
        height="19"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </span>
  );
}

function Chevron() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-mist"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

const ROWS = [
  {
    href: "/app/analytics",
    label: "Analytics",
    desc: "Scores, reach and saves",
    icon: <path d="M3 3v18h18M8 17v-6M13 17V7M18 17v-3" />,
  },
  {
    href: "/app/brands",
    label: "Brands",
    desc: "Kits, voice and compliance",
    icon: (
      <path d="M12 3a9 9 0 100 18c1.5 0 2-1 1.3-2.2-.7-1.3-.2-2.8 1.4-2.8H17a4 4 0 004-4c0-4.9-4-9-9-9z" />
    ),
  },
  {
    href: "/app/profile",
    label: "Profile",
    desc: "Workspace, plan and API keys",
    icon: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5" />
      </>
    ),
  },
  {
    href: "/app/settings",
    label: "Settings",
    desc: "Autopilot, connections, alerts",
    icon: <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.2a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.2a1.7 1.7 0 001 1.5h.1a1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9v.1a1.7 1.7 0 001.5 1h.2a2 2 0 110 4h-.2a1.7 1.7 0 00-1.5 1z" />,
  },
];

export default function MorePage() {
  const { profile, logout, mode } = useForge();
  const { push } = useToast();
  const router = useRouter();
  const [greeting, setGreeting] = useState("Welcome back");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const signOut = async () => {
    await logout();
    if (mode === "cloud") {
      router.push("/login");
    } else {
      push("Signed out (demo)", {
        body: "Demo workspace — your forge is exactly as you left it.",
        kind: "info",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg animate-fade-up space-y-6">
      {/* greeting header */}
      <header className="flex items-center gap-4">
        <Avatar name={profile.name} color={profile.avatarColor} size={54} />
        <div className="min-w-0">
          <p className="text-xs text-mist">{greeting},</p>
          <h1 className="h-display truncate text-2xl">{profile.name}</h1>
          <p className="mt-0.5 text-xs text-fog">
            {profile.workspace} · {profile.plan}
          </p>
        </div>
      </header>

      {/* nav rows */}
      <nav aria-label="More" className="space-y-2">
        {ROWS.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="pressable flex min-h-[60px] items-center gap-4 rounded-2xl border border-line bg-ink-2 px-4 py-3 transition-colors hover:bg-ink-3"
          >
            <RowIcon>{r.icon}</RowIcon>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-paper">{r.label}</span>
              <span className="block truncate text-xs text-mist">{r.desc}</span>
            </span>
            <Chevron />
          </Link>
        ))}
      </nav>

      <AddToHome />

      {/* appearance */}
      <Link
        href="/app/settings"
        className="pressable flex min-h-[60px] items-center gap-4 rounded-2xl border border-line bg-ink-2 px-4 py-3 transition-colors hover:bg-ink-3"
      >
        <RowIcon>
          <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
        </RowIcon>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-paper">Appearance</span>
          <span className="block truncate text-xs text-mist">
            Dark or light — set it in Settings
          </span>
        </span>
        <Chevron />
      </Link>

      {/* sign out */}
      <button
        type="button"
        onClick={signOut}
        className="pressable flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-line bg-ink-2 font-display text-sm font-semibold text-fog transition-colors hover:bg-ink-3 hover:text-paper"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
          <path d="M16 17l5-5-5-5M21 12H9" />
        </svg>
        Sign out
      </button>

      <p className="pb-2 text-center text-xs text-mist">
        AdForge 1.1.0 · {profile.plan}
      </p>
    </div>
  );
}
