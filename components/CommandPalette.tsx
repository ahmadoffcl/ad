"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useForge } from "@/lib/store";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/lib/toast";

export const PALETTE_EVENT = "adforge:open-palette";

function fuzzy(hay: string, needle: string): boolean {
  if (!needle.trim()) return true;
  hay = hay.toLowerCase();
  const q = needle.toLowerCase().trim();
  let i = 0;
  for (const ch of hay) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
}

interface Entry {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { activity, resetDemo, pushActivity } = useForge();
  const { toggleTheme } = useTheme();
  const { push } = useToast();

  // close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // open triggers: Cmd/Ctrl+K + window event
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onEvent = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener(PALETTE_EVENT, onEvent);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(PALETTE_EVENT, onEvent);
    };
  }, []);

  // reset local state whenever opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setConfirmReset(false);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open ]);

  const routes: Entry[] = useMemo(
    () => [
      { id: "r-app", label: "Dashboard", hint: "/app", run: () => router.push("/app") },
      { id: "r-studio", label: "Studio", hint: "/app/studio", run: () => router.push("/app/studio") },
      { id: "r-calendar", label: "Calendar", hint: "/app/calendar", run: () => router.push("/app/calendar") },
      { id: "r-analytics", label: "Analytics", hint: "/app/analytics", run: () => router.push("/app/analytics") },
      { id: "r-radar", label: "Radar", hint: "/app/radar", run: () => router.push("/app/radar") },
      { id: "r-brands", label: "Brands", hint: "/app/brands", run: () => router.push("/app/brands") },
      { id: "r-profile", label: "Profile", hint: "/app/profile", run: () => router.push("/app/profile") },
      { id: "r-settings", label: "Settings", hint: "/app/settings", run: () => router.push("/app/settings") },
      { id: "r-more", label: "More", hint: "/app/more", run: () => router.push("/app/more") },
    ],
    [router]
  );

  const actions: Entry[] = useMemo(
    () => [
      {
        id: "a-brief",
        label: "New brief",
        hint: "Studio",
        run: () => router.push("/app/studio"),
      },
      {
        id: "a-theme",
        label: "Toggle theme",
        hint: "Dark / light",
        run: () => {
          toggleTheme();
          push("Theme toggled", { kind: "info" });
        },
      },
      {
        id: "a-scheduled",
        label: "View scheduled",
        hint: "Calendar",
        run: () => router.push("/app/calendar"),
      },
      {
        id: "a-reset",
        label: confirmReset ? "Click again to confirm reset" : "Reset demo data",
        hint: "Danger",
        run: () => {
          if (!confirmReset) {
            setConfirmReset(true);
            return;
          }
          resetDemo();
          pushActivity("Demo data reset", "system");
          push("Demo data reset", { body: "Fresh seed data restored.", kind: "info" });
          setOpen(false);
        },
      },
    ],
    [router, toggleTheme, push, resetDemo, pushActivity, confirmReset]
  );

  const filtered = useMemo(() => {
    const q = query.trim();
    return [...routes, ...actions].filter((e) => fuzzy(`${e.label} ${e.hint ?? ""}`, q));
  }, [query, routes, actions]);

  const recent = activity.slice(0, 4);

  // keep selection in bounds
  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // scroll active item into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [index]);

  const run = (e: Entry) => {
    setOpen(false);
    e.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const e2 = filtered[index];
      if (e2) run(e2);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-start sm:pt-[16vh]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setOpen(false)} />
      <div
        className="relative w-full max-w-lg card animate-fade-up overflow-hidden rounded-b-none sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF5A1F" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search…"
            className="w-full bg-transparent text-sm text-paper placeholder:text-mist focus:outline-none"
            aria-label="Search commands"
          />
          <kbd className="hidden rounded-md border border-line bg-ink-3 px-1.5 py-0.5 text-[10px] text-mist sm:block">
            esc
          </kbd>
        </div>

        <div className="max-h-[46vh] overflow-y-auto p-2 sm:max-h-[54vh]">
          {filtered.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-mist">No matches. Try “studio”, “theme”, or “reset”.</p>
          )}
          {filtered.map((e, i) => (
            <button
              key={e.id}
              ref={i === index ? activeRef : undefined}
              onMouseEnter={() => setIndex(i)}
              onClick={() => run(e)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm transition-colors ${
                i === index ? "bg-molten-wash" : ""
              }`}
            >
              <span className={`font-medium ${i === index ? "text-molten-soft" : "text-paper"}`}>{e.label}</span>
              {e.hint && (
                <span className={`shrink-0 text-xs ${i === index ? "text-molten-soft/70" : "text-mist"}`}>{e.hint}</span>
              )}
            </button>
          ))}

          {recent.length > 0 && (
            <div className="mt-2 border-t border-line pt-2">
              <p className="px-3.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-widest text-mist">Recent activity</p>
              {recent.map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-mist" />
                  <span className="min-w-0 flex-1 truncate text-fog">{a.text}</span>
                  <span className="shrink-0 text-[11px] text-mist">{a.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-line px-4 py-2.5">
          <p className="text-center text-[11px] text-mist">↑↓ navigate · ↵ open · esc close</p>
        </div>
      </div>
    </div>
  );
}
