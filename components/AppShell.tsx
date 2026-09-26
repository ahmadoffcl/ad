"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { useForge } from "@/lib/store";
import CommandPalette from "./CommandPalette";
import Onboarding from "./Onboarding";
import { NotificationsPanel } from "./Notifications";

/** Picks a readable token text color for an arbitrary avatar background. */
function avatarTextDark(hex: string): boolean {
  const m = hex.trim().replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return false;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}

export function Avatar({
  name,
  color,
  size = 40,
}: {
  name: string;
  color: string;
  size?: number;
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-bold ${
        avatarTextDark(color) ? "text-ink" : "text-paper"
      }`}
      style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: color }}
    >
      {initials}
    </span>
  );
}

const LIBRARY_LINKS = [
  { href: "/app/board", label: "Board", hint: "Campaign pipeline" },
  { href: "/app/studio", label: "Studio", hint: "Briefs & concepts" },
  { href: "/app/calendar", label: "Calendar", hint: "Scheduled posts" },
  { href: "/app/analytics", label: "Analytics", hint: "Numbers" },
  { href: "/app/radar", label: "Radar", hint: "Trends" },
  { href: "/app/brands", label: "Brands", hint: "Brand kits" },
  { href: "/app/profile", label: "Profile", hint: "You" },
  { href: "/app/settings", label: "Settings", hint: "Preferences" },
];

function LibraryMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Library — your workspaces"
        aria-expanded={open}
        className="pressable flex h-11 w-11 items-center justify-center rounded-xl text-fog transition-colors hover:bg-ink-3 hover:text-paper"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-line bg-ink-2 shadow-2xl animate-pop-in">
          <p className="label px-4 pb-1 pt-3">Library</p>
          {LIBRARY_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="pressable flex items-center justify-between px-4 py-2.5 transition-colors hover:bg-ink-3"
            >
              <span className="text-sm font-medium text-paper">{l.label}</span>
              <span className="text-xs text-mist">{l.hint}</span>
            </Link>
          ))}
          <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
            <span className="text-xs text-mist">Theme</span>
            <ThemeToggle />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Forge shell — intentionally NOT a SaaS dashboard. One slim top bar,
 * the conversation fills the screen, everything else lives in Library.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, activeBrand, unreadCount } = useForge();

  const openPalette = () => window.dispatchEvent(new Event("adforge:open-palette"));
  const openNotifications = () =>
    window.dispatchEvent(new Event("adforge:open-notifications"));

  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* ---- slim top bar ---- */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-ink/85 backdrop-blur">
        <div className="pt-safe mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2.5">
          <Link href="/app" aria-label="Forge home" className="pressable">
            <Logo size={28} />
          </Link>
          <div className="flex items-center gap-0.5">
            <Link
              href="/app/brands"
              className="pressable mr-1 hidden max-w-[140px] truncate rounded-full border border-line bg-ink-2 px-3 py-1.5 text-xs font-semibold text-fog transition-colors hover:text-paper sm:block"
              title="Switch brand"
            >
              {activeBrand.name}
            </Link>
            <button
              type="button"
              onClick={openPalette}
              aria-label="Search and command palette"
              className="pressable flex h-11 w-11 items-center justify-center rounded-xl text-fog transition-colors hover:bg-ink-3 hover:text-paper"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={openNotifications}
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
              className="pressable relative flex h-11 w-11 items-center justify-center rounded-xl text-fog transition-colors hover:bg-ink-3 hover:text-paper"
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 01-3.4 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-molten px-1 font-display text-[10px] font-bold text-onaccent">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <LibraryMenu />
            <Link
              href="/app/profile"
              aria-label={`${profile.name}'s profile`}
              className="pressable ml-0.5 flex h-11 w-11 items-center justify-center"
            >
              <Avatar name={profile.name} color={profile.avatarColor} size={30} />
            </Link>
          </div>
        </div>
      </header>

      {/* ---- content: the conversation ---- */}
      <main
        className={`mx-auto w-full px-4 pb-10 pt-4 sm:px-6 ${
          pathname === "/app" ? "max-w-3xl" : "max-w-6xl"
        }`}
      >
        <div key={pathname} className="animate-page-enter">
          {children}
        </div>
      </main>

      {/* global overlays */}
      <CommandPalette />
      <NotificationsPanel />
      <Onboarding />
    </div>
  );
}
