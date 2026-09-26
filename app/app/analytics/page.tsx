"use client";

import { useMemo } from "react";
import { useForge } from "@/lib/store";
import { deriveLearnings, engagementOf } from "@/lib/learnings";
import { platformMeta } from "@/lib/campaign";
import { Card, Pill, SectionHead, Stat } from "@/components/ui";

const PLATFORM_COLORS: Record<string, string> = {
  "ig-feed": "#FF5A1F",
  "ig-reel": "#FF8A5C",
  "ig-story": "#D9480F",
  tiktok: "#A6A6AD",
  shorts: "#6E6E76",
  x: "#FAFAF7",
};

function ReachChart({ data }: { data: { date: string; reach: number }[] }) {
  const W = 720;
  const H = 220;
  const P = 28;
  const max = Math.max(...data.map((d) => d.reach), 1);
  const xs = (i: number) => P + (i * (W - P * 2)) / Math.max(1, data.length - 1);
  const ys = (v: number) => H - P - (v / max) * (H - P * 2);
  const pts = data.map((d, i) => `${xs(i)},${ys(d.reach)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="reachFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF5A1F" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FF5A1F" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={P} x2={W - P} y1={H * f} y2={H * f} stroke="var(--c-track)" strokeWidth="1" />
      ))}
      <polygon points={`${P},${H - P} ${pts} ${W - P},${H - P}`} fill="url(#reachFill)" />
      <polyline points={pts} fill="none" stroke="#FF5A1F" strokeWidth="2.5" strokeLinejoin="round" />
      {data.map((d, i) => (
        <g key={d.date}>
          <circle cx={xs(i)} cy={ys(d.reach)} r="4" fill="rgb(var(--c-ink-2))" stroke="#FF5A1F" strokeWidth="2.5" />
          {i % 2 === 0 && (
            <text x={xs(i)} y={H - 8} textAnchor="middle" fill="rgb(var(--c-mist))" fontSize="10">
              {d.date.slice(5)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export default function AnalyticsPage() {
  const { analytics, brands } = useForge();

  const learnings = useMemo(() => deriveLearnings(analytics), [analytics]);

  const stats = useMemo(() => {
    const reach = analytics.reduce((a, p) => a + p.reach, 0);
    const eng = analytics.reduce((a, p) => a + engagementOf(p), 0) / Math.max(1, analytics.length);
    const hook = Math.round(analytics.reduce((a, p) => a + p.hookScore, 0) / Math.max(1, analytics.length));
    return { reach, eng, hook, n: analytics.length };
  }, [analytics]);

  const byDate = useMemo(
    () => [...analytics].sort((a, b) => a.date.localeCompare(b.date)).map((p) => ({ date: p.date, reach: p.reach })),
    [analytics]
  );

  const top = useMemo(
    () => [...analytics].sort((a, b) => engagementOf(b) - engagementOf(a)).slice(0, 6),
    [analytics]
  );
  const maxEng = Math.max(...top.map(engagementOf), 1e-9);

  const brandOf = (id: string) => brands.find((b) => b.id === id)?.name ?? id;

  return (
    <div>
      <SectionHead
        kicker="Analytics"
        title="What the numbers are saying."
        sub="Hand-rolled, honest charts. Every learning below cites its sample."
      />

      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total reach" value={(stats.reach / 1e6).toFixed(2) + "M"} delta="12 posts · 30 days" tone="up" />
        <Stat label="Avg engagement" value={(stats.eng * 100).toFixed(1) + "%"} delta="per reach" tone="up" />
        <Stat label="Avg hook score" value={String(stats.hook)} delta="shipped creative" tone="neutral" />
        <Stat label="Posts analyzed" value={String(stats.n)} delta="6 placements" tone="neutral" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="p-4 sm:p-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="h-display text-base">Reach over time</h3>
              <Pill tone="accent">Live from post data</Pill>
            </div>
            <ReachChart data={byDate} />
          </Card>

          <Card className="overflow-hidden">
            <h3 className="h-display px-4 pt-4 text-base sm:px-6">Top posts</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-[11px] uppercase tracking-[0.1em] text-mist">
                    <th className="px-4 py-3 font-semibold sm:px-6">Post</th>
                    <th className="px-3 py-3 font-semibold">Placement</th>
                    <th className="px-3 py-3 font-semibold">Hook</th>
                    <th className="px-3 py-3 text-right font-semibold">Reach</th>
                    <th className="px-4 py-3 text-right font-semibold sm:px-6">Eng. rate</th>
                  </tr>
                </thead>
                <tbody>
                  {[...analytics]
                    .sort((a, b) => b.reach - a.reach)
                    .map((p) => (
                      <tr key={p.id} className="border-b border-line/50 transition-colors last:border-0 hover:bg-ink-3/50">
                        <td className="px-4 py-3 sm:px-6">
                          <p className="font-semibold text-paper">{p.title}</p>
                          <p className="text-[11px] text-mist">{brandOf(p.brandId)} · {p.date}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ background: PLATFORM_COLORS[p.platform] ?? "#888" }}
                          />{" "}
                          <span className="text-fog">{platformMeta(p.platform).short}</span>
                        </td>
                        <td className="px-3 py-3 font-display font-bold text-molten-soft">{p.hookScore}</td>
                        <td className="px-3 py-3 text-right text-fog">{(p.reach / 1000).toFixed(1)}k</td>
                        <td className="px-4 py-3 text-right font-semibold text-paper sm:px-6">
                          {(engagementOf(p) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4 sm:p-5">
            <h3 className="h-display mb-4 text-base">Top by engagement</h3>
            <div className="space-y-3">
              {top.map((p) => (
                <div key={p.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-2">
                    <p className="truncate text-xs font-semibold text-paper">{p.title}</p>
                    <span className="shrink-0 font-display text-xs font-bold text-molten-soft">
                      {(engagementOf(p) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink-4">
                    <div
                      className="h-full rounded-full bg-molten transition-all duration-500"
                      style={{ width: `${(engagementOf(p) / maxEng) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="h-display text-base">Learnings</h3>
              <Pill tone="green">Memory · live</Pill>
            </div>
            <p className="mb-4 text-xs text-mist">Derived from your post data — this is what the studio remembers.</p>
            <ul className="space-y-3">
              {learnings.map((l) => (
                <li key={l.title} className="rounded-xl border border-line bg-ink-3 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-bold text-paper">{l.title}</p>
                    <span className={`shrink-0 font-display text-xs font-bold ${l.tone === "up" ? "text-emerald-300" : "text-fog"}`}>
                      {l.delta}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-fog">{l.detail}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
