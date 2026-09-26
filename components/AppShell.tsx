"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { useForge } from "@/lib/store";
import CommandPalette from "./CommandPalette";
import Onboarding from "./Onboarding";
import { NotificationsPanel } from "./Notifications";

const ICONS = {
  dashboard: (
    <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
  ),
  home: <path d="M3 10.5L12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5" />,
  studio: (
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
  ),
  calendar: (
    <path d="M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
  ),
  analytics: <path d="M3 3v18h18M8 17v-6M13 17V7M18 17v-3" />,
  radar: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <path d="M12 12l6-6" />
    </>
  ),
  brands: (
    <path d="M12 3a9 9 0 100 18c1.5 0 2-1 1.3-2.2-.7-1.3-.2-2.8 1.4-2.8H17a4 4 0 004-4c0-4.9-4-9-9-9z" />
  ),
  settings: (
    <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.2a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.2a1.7 1.7 0 001 1.5h.1a1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9v.1a1.7 1.7 0 001.5 1h.2a2 2 0 110 4h-.2a1.7 1.7 0 00-1.5 1z" />
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
};

const DESKTOP_NAV = [
  { href: "/app", label: "Dashboard", icon: ICONS.dashboard },
  { href: "/app/studio", label: "Studio", icon: ICONS.studio },
  { href: "/app/calendar", label: "Calendar", icon: ICONS.calendar },
  { href: "/app/analytics", label: "Analytics", icon: ICONS.analytics },
  { href: "/app/radar", label: "Radar", icon: ICONS.radar },
  { href: "/app/brands", label: "Brands", icon: ICONS.brands },
  { href: "/app/settings", label: "Settings", icon: ICONS.settings },
];

const MOBILE_NAV = [
  { href: "/app", label: "Home", icon: ICONS.home },
  { href: "/app/studio", label: "Studio", icon: ICONS.studio },
  { href: "/app/calendar", label: "Calendar", icon: ICONS.calendar },
  { href: "/app/radar", label: "Radar", icon: ICONS.radar },
  { href: "/app/more", label: "More", icon: ICONS.more },
];

function NavIcon({ children, active }: { children: React.ReactNode; active: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "text-molten" : "text-fog"}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

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

function BrandSelect() {
  const { brands, activeBrandId, setActiveBrand } = useForge();
  return (
    <select
      value={activeBrandId}
      onChange={(e) => setActiveBrand(e.target.value)}
      className="w-full rounded-xl border border-line bg-ink-3 px-3 py-2 font-display text-xs font-semibold text-paper outline-none transition-colors focus:border-molten/60"
      aria-label="Active brand"
    >
      {brands.map((b) => (
        <option key={b.id} value={b.id} className="bg-ink-2">
          {b.name}
        </option>
      ))}
    </select>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { profile, unreadCount } = useForge();

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  const openPalette = () => window.dispatchEvent(new Event("adforge:open-palette"));
  const openNotifications = () =>
    window.dispatchEvent(new Event("adforge:open-notifications"));

  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* ---- desktop sidebar ---- */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-ink-2/80 backdrop-blur lg:flex">
        <div className="p-5">
          <Link href="/">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {DESKTOP_NAV.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`pressable flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-ink-3 text-paper shadow-lift"
                    : "text-fog hover:bg-ink-3/60 hover:text-paper"
                }`}
              >
                <NavIcon active={active}>{n.icon}</NavIcon>
                {n.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-molten" />}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            <Link
              href="/app/profile"
              className="pressable flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-ink-3/60"
            >
              <Avatar name={profile.name} color={profile.avatarColor} size={36} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-paper">
                  {profile.name}
                </span>
                <span className="block truncate text-xs text-mist">{profile.handle}</span>
              </span>
            </Link>
            <ThemeToggle />
          </div>
          <div>
            <p className="label">Active brand</p>
            <BrandSelect />
          </div>
          <Link href="/app/studio" className="btn-primary w-full !px-4">
            + New brief
          </Link>
        </div>
      </aside>

      {/* ---- mobile header ---- */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur lg:hidden">
        <div className="pt-safe flex items-center justify-between gap-2 px-4 py-3">
          <Link href="/" aria-label="AdForge home">
            <Logo size={30} />
          </Link>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={openPalette}
              aria-label="Search and command palette"
              className="pressable flex h-11 w-11 items-center justify-center rounded-xl text-fog transition-colors hover:bg-ink-3 hover:text-paper"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={openNotifications}
              aria-label={
                unreadCount > 0
                  ? `Notifications, ${unreadCount} unread`
                  : "Notifications"
              }
              className="pressable relative flex h-11 w-11 items-center justify-center rounded-xl text-fog transition-colors hover:bg-ink-3 hover:text-paper"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 01-3.4 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-molten px-1 font-display text-[10px] font-bold text-onaccent">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <Link
              href="/app/profile"
              aria-label={`${profile.name}'s profile`}
              className="pressable ml-1 flex h-11 w-11 items-center justify-center"
            >
              <Avatar name={profile.name} color={profile.avatarColor} size={32} />
            </Link>
          </div>
        </div>
      </header>

      {/* ---- content ---- */}
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pl-[270px] lg:pr-10 lg:pb-16">
        <div key={pathname} className="animate-page-enter">
          {children}
        </div>
      </main>

      {/* ---- mobile tab bar ---- */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink-2/95 backdrop-blur lg:hidden"
      >
        <div className="pb-safe grid grid-cols-5">
          {MOBILE_NAV.map((t) => {
            const active = isActive(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`pressable relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors ${
                  active ? "text-molten" : "text-mist"
                }`}
              >
                <span className={active ? "animate-tab-pop" : ""}>
                  <NavIcon active={active}>{t.icon}</NavIcon>
                </span>
                {t.label}
                <span
                  className={`h-1 rounded-full transition-all duration-300 ${
                    active ? "w-5 bg-molten" : "w-1 bg-transparent"
                  }`}
                  aria-hidden="true"
                />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* global overlays */}
      <CommandPalette />
      <NotificationsPanel />
      <Onboarding />
    </div>
  );
}
