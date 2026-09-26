"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SEED_TRENDS } from "@/lib/seed";
import { Bar, Card, EmptyState, Pill, SectionHead } from "@/components/ui";
import { useToast } from "@/lib/toast";

function heatTone(heat: number): "green" | "amber" | "red" {
  if (heat >= 85) return "green";
  if (heat >= 75) return "amber";
  return "red";
}

const KEY = "adforge-watchlist";

function Bookmark({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
      aria-pressed={saved}
      className={`pressable flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
        saved
          ? "border-molten/40 bg-molten-wash text-molten"
          : "border-line text-mist hover:border-ink-4 hover:text-fog"
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M6 3h12a1 1 0 011 1v17l-7-4-7 4V4a1 1 0 011-1z" />
      </svg>
    </button>
  );
}

export default function RadarPage() {
  const { push } = useToast();
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [filter, setFilter] = useState<"all" | "watching">("all");

  useEffect(() => {
    try {
      setWatchlist(JSON.parse(localStorage.getItem(KEY) ?? "[]"));
    } catch {
      /* noop */
    }
  }, []);

  const toggle = (id: string, title: string) => {
    setWatchlist((w) => {
      const next = w.includes(id) ? w.filter((x) => x !== id) : [...w, id];
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      push(
        next.includes(id) ? "Watching this trend" : "Removed from watchlist",
        { body: title, kind: "info" }
      );
      return next;
    });
  };

  const sorted = [...SEED_TRENDS].sort((a, b) => b.heat - a.heat);
  const [top, ...rest] = sorted;
  const visible = filter === "watching" ? rest.filter((t) => watchlist.includes(t.id)) : rest;
  const avgHeat = Math.round(sorted.reduce((s, t) => s + t.heat, 0) / sorted.length);

  return (
    <div>
      <SectionHead
        kicker="Trend Radar"
        title="Ride the wave before it breaks."
        sub="Formats, sounds and hooks gaining steam in your niche — each one jumps straight into the studio, prefilled."
      />

      {/* featured */}
      <Card className="relative mb-4 overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-20 blur-[100px]"
          style={{ background: "#FF5A1F" }}
        />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="accent">#1 trending</Pill>
              <Pill>{top.platform}</Pill>
              <Pill>{top.format}</Pill>
            </div>
            <h2 className="h-display mt-4 text-3xl sm:text-4xl">{top.title}</h2>
            <p className="mt-3 font-display text-lg font-semibold text-molten-soft">“{top.hook}”</p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-fog">{top.why}</p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link href={`/app/studio?trend=${top.id}`} className="btn-primary">
                Use this trend →
              </Link>
              <Bookmark saved={watchlist.includes(top.id)} onClick={() => toggle(top.id, top.title)} />
              <span className="font-display text-sm font-bold text-emerald-300">{top.growth}</span>
            </div>
          </div>
          <div className="flex flex-col justify-center rounded-2xl border border-line bg-ink-3 p-5">
            <p className="label">Heat index</p>
            <p className="font-display text-5xl font-bold text-paper">{top.heat}</p>
            <Bar value={top.heat} max={100} tone={heatTone(top.heat)} className="mt-3" />
            <p className="mt-2 text-xs text-mist">Composite of uses, velocity and saves across the niche.</p>
          </div>
        </div>
      </Card>

      {/* filter + stats */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-xl border border-line bg-ink-2 p-1">
          {(["all", "watching"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`pressable rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                filter === f ? "bg-molten text-onaccent" : "text-mist hover:text-fog"
              }`}
            >
              {f === "all" ? "All trends" : `Watching (${watchlist.length})`}
            </button>
          ))}
        </div>
        <p className="text-xs text-mist">
          {sorted.length} formats tracked · avg heat{" "}
          <span className="font-bold text-paper">{avgHeat}</span> · scanned 20m ago
        </p>
      </div>

      {/* grid */}
      {visible.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t, i) => (
            <Card key={t.id} className="card-hover animate-fade-up flex flex-col p-5">
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-bold text-mist">#{i + 2}</span>
                <div className="flex items-center gap-2">
                  <Pill tone="green">{t.growth}</Pill>
                  <Bookmark saved={watchlist.includes(t.id)} onClick={() => toggle(t.id, t.title)} />
                </div>
              </div>
              <h3 className="h-display mt-2.5 text-xl">{t.title}</h3>
              <p className="mt-1.5 font-display text-sm font-semibold text-molten-soft">“{t.hook}”</p>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-fog">{t.why}</p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-[11px] text-mist">
                  <span>Heat</span>
                  <span className="font-bold text-paper">{t.heat}</span>
                </div>
                <Bar value={t.heat} max={100} tone={heatTone(t.heat)} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                <div className="flex gap-1.5">
                  <Pill>{t.platform}</Pill>
                </div>
                <Link
                  href={`/app/studio?trend=${t.id}`}
                  className="font-display text-xs font-bold text-molten-soft transition-colors hover:text-molten"
                >
                  Use this trend →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Your watchlist is empty"
          body="Bookmark formats you're tracking and they'll live here — ready to jump into the studio."
          action={
            <button onClick={() => setFilter("all")} className="btn-secondary">
              Browse all trends
            </button>
          }
        />
      )}
    </div>
  );
}
