"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForge, IG_DAILY_LIMIT } from "@/lib/store";
import { platformMeta } from "@/lib/campaign";
import { Btn, Card, Pill, SectionHead, EmptyState } from "@/components/ui";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthCells(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= days; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const statusTone: Record<string, "default" | "accent" | "green" | "red"> = {
  queued: "default",
  scheduled: "accent",
  posted: "green",
  failed: "red",
};

export default function CalendarPage() {
  const { scheduled, brands, autoSpread, removePost, pushActivity } = useForge();
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(8); // September
  const [selected, setSelected] = useState<string>("2026-10-03");

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    scheduled.forEach((s) => {
      if (s.status === "posted" || s.status === "failed") return;
      m.set(s.date, (m.get(s.date) ?? 0) + 1);
    });
    return m;
  }, [scheduled]);

  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const dayPosts = useMemo(
    () => scheduled.filter((s) => s.date === selected).sort((a, b) => a.time.localeCompare(b.time)),
    [scheduled, selected]
  );
  const overloaded = (counts.get(selected) ?? 0) > IG_DAILY_LIMIT;

  const upcoming = useMemo(() => {
    const today = "2026-09-26";
    return scheduled
      .filter((s) => s.date >= today && s.status !== "posted")
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 8);
  }, [scheduled]);

  const shiftMonth = (dir: 1 | -1) => {
    let m = month + dir;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
  };

  const brandOf = (id: string) => brands.find((b) => b.id === id)?.name ?? id;

  return (
    <div>
      <SectionHead
        kicker="Scheduler"
        title="Every post has a slot."
        sub={`Rate-limit guarded at ${IG_DAILY_LIMIT} posts/day. Overloaded days get flagged — and fixed with one tap.`}
        action={<Link href="/app/studio" className="btn-primary btn-sm">+ New brief</Link>}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card className="p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="h-display text-lg">
              {MONTHS[month]} <span className="text-mist">{year}</span>
            </h2>
            <div className="flex gap-2">
              <Btn variant="ghost" size="sm" onClick={() => shiftMonth(-1)}>←</Btn>
              <Btn variant="ghost" size="sm" onClick={() => { setMonth(8); setYear(2026); }}>Today</Btn>
              <Btn variant="ghost" size="sm" onClick={() => shiftMonth(1)}>→</Btn>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => (
              <p key={d} className="pb-1 text-center font-display text-[10px] font-bold uppercase tracking-[0.14em] text-mist">
                {d}
              </p>
            ))}
            {cells.map((iso, i) => {
              if (!iso) return <div key={i} />;
              const n = counts.get(iso) ?? 0;
              const hot = n > IG_DAILY_LIMIT;
              const isSel = iso === selected;
              return (
                <button
                  key={iso}
                  onClick={() => setSelected(iso)}
                  className={`relative flex min-h-[64px] flex-col items-start justify-between rounded-xl border p-2 text-left transition-all duration-150 sm:min-h-[84px] ${
                    isSel
                      ? "border-molten/70 bg-molten-wash"
                      : hot
                        ? "border-red-500/50 bg-red-500/5 hover:border-red-400/70"
                        : n > 0
                          ? "border-line bg-ink-3 hover:border-mist/60"
                          : "border-line/50 bg-ink/40 hover:border-line"
                  }`}
                >
                  <span className={`font-display text-xs font-bold ${isSel ? "text-molten-soft" : hot ? "text-red-300" : "text-paper"}`}>
                    {Number(iso.slice(8))}
                  </span>
                  {n > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 font-display text-[10px] font-bold ${
                        hot ? "bg-red-500/20 text-red-300" : "bg-ink-4 text-fog"
                      }`}
                    >
                      {n}
                    </span>
                  )}
                  {hot && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulsebar rounded-full bg-red-400" />
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-[11px] text-mist">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-ink-4" /> Has posts</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-400" /> Over {IG_DAILY_LIMIT}/day</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-molten" /> Selected</span>
          </div>
        </Card>

        {/* day detail */}
        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="h-display text-base">{selected}</h3>
              <Pill tone={overloaded ? "red" : "default"}>
                {dayPosts.length} post{dayPosts.length === 1 ? "" : "s"}
              </Pill>
            </div>
            {overloaded && (
              <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3">
                <p className="text-xs font-semibold text-red-200">
                  {counts.get(selected)} posts — {IG_DAILY_LIMIT} over the daily limit. Instagram will throttle the rest.
                </p>
                <Btn
                  size="sm"
                  className="mt-2"
                  onClick={() => {
                    const moved = autoSpread(selected);
                    pushActivity(`Auto-spread moved ${moved} posts off ${selected}`, "system");
                  }}
                >
                  Auto-spread the overflow →
                </Btn>
              </div>
            )}
            {dayPosts.length === 0 ? (
              <EmptyState
                title="Nothing scheduled"
                body="A quiet day. The studio can fix that."
                action={<Link href="/app/studio" className="btn-primary btn-sm">Create a brief</Link>}
              />
            ) : (
              <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {dayPosts.map((p) => (
                  <li key={p.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-ink-3 px-3 py-2.5">
                    <span className="font-display text-xs font-bold text-molten-soft">{p.time}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-paper">{p.title}</p>
                      <p className="text-[11px] text-mist">
                        {brandOf(p.brandId)} · {platformMeta(p.platform).short}
                      </p>
                    </div>
                    <Pill tone={statusTone[p.status]}>{p.status}</Pill>
                    <button
                      onClick={() => removePost(p.id)}
                      className="rounded-lg px-1.5 py-1 text-mist transition-colors hover:bg-red-500/10 hover:text-red-300"
                      aria-label="Remove post"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4 sm:p-5">
            <h3 className="h-display mb-3 text-base">Up next</h3>
            <ul className="space-y-2">
              {upcoming.map((p) => (
                <li key={p.id} className="flex items-center gap-2.5 text-[13px]">
                  <span className="w-16 shrink-0 font-display text-[11px] font-bold text-mist">{p.date.slice(5)}</span>
                  <span className="min-w-0 flex-1 truncate text-paper/90">{p.title}</span>
                  <Pill>{platformMeta(p.platform).short}</Pill>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
