"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useForge, IG_DAILY_LIMIT } from "@/lib/store";
import { STAGES, type PipelineItem, type Stage } from "@/lib/types";
import { platformMeta } from "@/lib/campaign";
import { Btn, Card, Pill, ScoreRing, SectionHead } from "@/components/ui";

const gateLabel: Record<PipelineItem["gate"], { text: string; tone: "green" | "amber" | "default" }> = {
  "auto-ok": { text: "Gate · auto-ok", tone: "green" },
  awaiting: { text: "Gate · awaiting", tone: "amber" },
  overridden: { text: "Gate · overridden", tone: "default" },
};

function KanbanCard({ item, onAdvance }: { item: PipelineItem; onAdvance: () => void }) {
  const { brands } = useForge();
  const brand = brands.find((b) => b.id === item.brandId);
  const g = gateLabel[item.gate];
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="card cursor-grab p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-mist/50 active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold leading-snug text-paper">{item.title}</p>
        <ScoreRing score={item.hookScore} size={38} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {brand && <Pill>{brand.name}</Pill>}
        <Pill tone={g.tone}>{g.text}</Pill>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {item.platforms.map((p) => (
          <span key={p} className="rounded-md bg-ink-4 px-1.5 py-0.5 text-[10px] font-medium text-fog">
            {platformMeta(p).short}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-mist">Due {item.due.slice(5)}</span>
        <button
          onClick={onAdvance}
          className="rounded-lg border border-line bg-ink-3 px-2.5 py-1 font-display text-[11px] font-bold text-molten-soft transition-colors hover:border-molten/50 hover:bg-molten-wash"
          aria-label="Advance to next stage"
        >
          Advance →
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const forge = useForge();
  const { pipeline, scheduled, activity, analytics, setPipelineStage, advancePipeline, autoSpread, pushActivity } = forge;
  const [dragOver, setDragOver] = useState<Stage | null>(null);

  const kpis = useMemo(() => {
    const active = pipeline.filter((p) => p.stage !== "live").length;
    const today = new Date();
    const weekAhead = new Date(today.getTime() + 7 * 864e5).toISOString().slice(0, 10);
    const iso = today.toISOString().slice(0, 10);
    const scheduledWeek = scheduled.filter(
      (s) => s.date >= iso && s.date <= weekAhead && s.status !== "posted"
    ).length;
    const avgHook = pipeline.length
      ? Math.round(pipeline.reduce((a, p) => a + p.hookScore, 0) / pipeline.length)
      : 0;
    const reach = analytics.reduce((a, p) => a + p.reach, 0);
    return { active, scheduledWeek, avgHook, reach };
  }, [pipeline, scheduled, analytics]);

  const overloaded = useMemo(() => {
    const counts = new Map<string, number>();
    scheduled.forEach((s) => {
      if (s.status === "posted" || s.status === "failed") return;
      counts.set(s.date, (counts.get(s.date) ?? 0) + 1);
    });
    return [...counts.entries()]
      .filter(([, n]) => n > IG_DAILY_LIMIT)
      .sort(([a], [b]) => a.localeCompare(b));
  }, [scheduled]);

  const onDrop = (stage: Stage) => (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (id) {
      setPipelineStage(id, stage);
      const item = pipeline.find((p) => p.id === id);
      if (item) pushActivity(`“${item.title}” moved to ${STAGES.find((s) => s.id === stage)?.label}`, "system");
    }
    setDragOver(null);
  };

  const kindIcon: Record<string, string> = {
    post: "bg-molten-wash text-molten-soft",
    qc: "bg-emerald-500/10 text-emerald-300",
    concept: "bg-ink-4 text-fog",
    system: "bg-ink-4 text-mist",
  };

  return (
    <div>
      <SectionHead
        kicker="Pipeline board"
        title="Where the agent's work lands."
        sub="Every campaign, every gate, every post — one board. Drag cards or hit Advance."
        action={
          <Link href="/app" className="btn-primary btn-sm !px-4">
            Ask Forge
          </Link>
        }
      />

      {/* KPI row */}
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="card-hover p-4 sm:p-5">
          <p className="label !mb-1">Active campaigns</p>
          <p className="font-display text-2xl font-bold sm:text-[28px]">{kpis.active}</p>
          <p className="mt-1 text-xs text-fog">across 5 pipeline stages</p>
        </Card>
        <Card className="card-hover p-4 sm:p-5">
          <p className="label !mb-1">Posting next 7 days</p>
          <p className="font-display text-2xl font-bold sm:text-[28px]">{kpis.scheduledWeek}</p>
          <p className="mt-1 text-xs text-fog">rate-limit guarded</p>
        </Card>
        <Card className="card-hover p-4 sm:p-5">
          <p className="label !mb-1">Avg hook score</p>
          <p className="font-display text-2xl font-bold text-molten sm:text-[28px]">{kpis.avgHook}</p>
          <p className="mt-1 text-xs text-fog">pipeline-wide</p>
        </Card>
        <Card className="card-hover p-4 sm:p-5">
          <p className="label !mb-1">Tracked reach</p>
          <p className="font-display text-2xl font-bold sm:text-[28px]">
            {(kpis.reach / 1e6).toFixed(1)}M
          </p>
          <p className="mt-1 text-xs text-fog">last 12 posts</p>
        </Card>
      </div>

      {/* rate-limit alert */}
      {overloaded.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3.5 animate-fade-in">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round">
            <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
          </svg>
          <p className="text-sm text-amber-200">
            <span className="font-bold">Rate-limit risk:</span>{" "}
            {overloaded.map(([d, n]) => `${d} has ${n} posts`).join(" · ")} (limit {IG_DAILY_LIMIT}/day).
          </p>
          <div className="ml-auto flex gap-2">
            {overloaded.map(([d]) => (
              <Btn
                key={d}
                size="sm"
                variant="ghost"
                onClick={() => {
                  const moved = autoSpread(d);
                  pushActivity(`Auto-spread moved ${moved} posts off ${d}`, "system");
                }}
              >
                Auto-spread {d.slice(5)}
              </Btn>
            ))}
            <Link href="/app/calendar" className="btn-ghost btn-sm">
              Open calendar
            </Link>
          </div>
        </div>
      )}

      {/* kanban + activity */}
      <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_320px]">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="h-display text-lg">Pipeline</h2>
            <Pill>Drag cards or hit Advance →</Pill>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {STAGES.map((stage) => {
              const items = pipeline.filter((p) => p.stage === stage.id);
              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(stage.id);
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={onDrop(stage.id)}
                  className={`w-60 shrink-0 rounded-xl border p-2.5 transition-colors ${
                    dragOver === stage.id ? "border-molten/60 bg-molten-wash/40" : "border-line/60 bg-ink/60"
                  }`}
                >
                  <div className="mb-2.5 flex items-center justify-between px-1">
                    <div>
                      <p className="font-display text-[13px] font-bold text-paper">{stage.label}</p>
                      <p className="text-[10px] text-mist">{stage.hint}</p>
                    </div>
                    <span className="rounded-full bg-ink-4 px-2 py-0.5 font-display text-[11px] font-bold text-fog">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {items.map((item) => (
                      <KanbanCard key={item.id} item={item} onAdvance={() => advancePipeline(item.id)} />
                    ))}
                    {items.length === 0 && (
                      <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-xs text-mist">
                        Drop cards here
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <h2 className="h-display mb-4 text-lg">Activity</h2>
          <ul className="space-y-3">
            {activity.slice(0, 10).map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold ${kindIcon[a.kind]}`}>
                  {a.kind === "post" ? "↗" : a.kind === "qc" ? "✓" : a.kind === "concept" ? "✦" : "●"}
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] leading-snug text-paper/90">{a.text}</p>
                  <p className="mt-0.5 text-[11px] text-mist">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
          <Link href="/app/analytics" className="btn-ghost btn-sm mt-5 w-full">
            View analytics
          </Link>
        </Card>
      </div>
    </div>
  );
}
