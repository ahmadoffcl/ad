"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { useForge } from "@/lib/store";

const NAV = [
  {
    href: "/app",
    label: "Dashboard",
    icon: (
      <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
    ),
  },
  {
    href: "/app/studio",
    label: "Studio",
    icon: (
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
    ),
  },
  {
    href: "/app/calendar",
    label: "Calendar",
    icon: (
      <path d="M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    ),
  },
  {
    href: "/app/analytics",
    label: "Analytics",
    icon: (
      <path d="M3 3v18h18M8 17v-6M13 17V7M18 17v-3" />
    ),
  },
  {
    href: "/app/radar",
    label: "Radar",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <path d="M12 12l6-6" />
      </>
    ),
  },
  {
    href: "/app/brands",
    label: "Brands",
    icon: (
      <path d="M12 3a9 9 0 100 18c1.5 0 2-1 1.3-2.2-.7-1.3-.2-2.8 1.4-2.8H17a4 4 0 004-4c0-4.9-4-9-9-9z" />
    ),
  },
  {
    href: "/app/settings",
    label: "Settings",
    icon: (
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.9 2.9l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.2a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.9-2.9l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.2a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.9-2.9l.1.1a1.7 1.7 0 001.9.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.2a1.7 1.7 0 001 1.5h.1a1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.9 2.9l-.1.1a1.7 1.7 0 00-.3 1.9v.1a1.7 1.7 0 001.5 1h.2a2 2 0 110 4h-.2a1.7 1.7 0 00-1.5 1z" />
    ),
  },
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
    >
      {children}
    </svg>
  );
}

function BrandSelect({ compact }: { compact?: boolean }) {
  const { brands, activeBrandId, setActiveBrand } = useForge();
  return (
    <select
      value={activeBrandId}
      onChange={(e) => setActiveBrand(e.target.value)}
      className={`rounded-xl border border-line bg-ink-3 font-display text-xs font-semibold text-paper outline-none transition-colors focus:border-molten/60 ${
        compact ? "px-2.5 py-1.5" : "w-full px-3 py-2"
      }`}
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
  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

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
          {NAV.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
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
          <div>
            <p className="label">Active brand</p>
            <BrandSelect />
          </div>
          <Link
            href="/app/studio"
            className="btn-primary w-full !px-4"
          >
            + New brief
          </Link>
        </div>
      </aside>

      {/* ---- mobile top bar ---- */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/">
            <Logo size={30} />
          </Link>
          <BrandSelect compact />
        </div>
      </header>

      {/* ---- content ---- */}
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:pl-[270px] lg:pr-10 lg:pb-16">
        {children}
      </main>

      {/* ---- mobile bottom tabs ---- */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink-2/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-7 px-1 pb-[env(safe-area-inset-bottom)]">
          {NAV.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[9px] font-semibold transition-colors ${
                  active ? "text-molten" : "text-mist"
                }`}
              >
                <NavIcon active={active}>{n.icon}</NavIcon>
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
