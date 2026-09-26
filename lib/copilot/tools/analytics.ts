/**
 * Analytics tools — honest pipeline analytics from real workspace data.
 * (Post-level reach/likes come from connected ad accounts; these tools
 * analyze what the workspace actually knows: output, consistency, quality.)
 */
import { scoreHook } from "@/lib/hookScore";
import {
  type CopilotTool,
  str,
  pick,
  brandLine,
  payloadOf,
  aiText,
  todayIso,
  addDaysIso,
} from "../toolutil";

type Ctx = Parameters<CopilotTool["run"]>[1];

async function workspaceSnapshot(ctx: Ctx) {
  const empty = { campaigns: [], posts: [], concepts: [] } as {
    campaigns: { id: string; brief: string; status: string; created_at: string }[];
    posts: { id: string; network: string; scheduled_at: string; status: string; title: string }[];
    concepts: { id: string; title: string; headline: string; hook_score: number | null; campaign_id: string; created_at: string }[];
  };
  if (!ctx.db || !ctx.userId) return { ...empty, live: false };
  const c = await ctx.db.prepare("SELECT id, brief, status, created_at FROM campaigns WHERE user_id = ? ORDER BY created_at DESC LIMIT 100").bind(ctx.userId).all();
  const p = await ctx.db.prepare("SELECT id, network, scheduled_at, status, payload FROM scheduled_posts WHERE user_id = ? ORDER BY scheduled_at DESC LIMIT 100").bind(ctx.userId).all();
  const k = await ctx.db.prepare("SELECT id, title, headline, hook_score, campaign_id, created_at FROM concepts WHERE user_id = ? ORDER BY created_at DESC LIMIT 100").bind(ctx.userId).all();
  return {
    live: true,
    campaigns: ((c.results ?? []) as typeof empty.campaigns),
    posts: (((p.results ?? []) as unknown) as { id: string; network: string; scheduled_at: string; status: string; payload: string }[]).map((r) => ({ id: r.id, network: r.network, scheduled_at: r.scheduled_at, status: r.status, title: str(payloadOf<{ title?: string }>(r).title, r.network) })),
    concepts: ((k.results ?? []) as typeof empty.concepts),
  };
}

const post_analytics: CopilotTool = {
  name: "post_analytics",
  description: "Deep dive on one scheduled post: timing, platform fit, and an AI quality read.",
  parameters: {
    postId: { type: "string", description: "Scheduled post id.", required: true },
  },
  label: "Analyzing post…",
  async run(args, ctx) {
    const id = pick(args, ["postId", "post_id", "id"]);
    if (!id) return { ok: false, summary: "Which post?", data: {} };
    const snap = await workspaceSnapshot(ctx);
    const post = snap.posts.find((p) => p.id === id);
    if (!post) return { ok: false, summary: "Post not found.", data: {} };
    const read = await aiText(
      ctx,
      "You are a social media analyst. Concrete and honest.",
      `${brandLine(ctx.brand)}\nAnalyze this scheduled post:\nTitle: ${post.title}\nPlatform: ${post.network}\nScheduled: ${post.scheduled_at}\nGive: timing verdict, hook strength read, and one concrete improvement. Under 120 words.`
    );
    return { ok: true, demo: !snap.live, summary: `Analysis for "${post.title}".`, data: { post, analysis: read || "AI unavailable — post is queued and titled clearly." } };
  },
};

const top_posts: CopilotTool = {
  name: "top_posts",
  description: "Rank queued posts by predicted strength (hook score + timing).",
  parameters: {},
  label: "Ranking posts…",
  async run(args, ctx) {
    const snap = await workspaceSnapshot(ctx);
    const queued = snap.posts.filter((p) => p.status === "queued");
    const ranked = queued
      .map((p) => ({ ...p, score: scoreHook(p.title, "").score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    return {
      ok: true, demo: !snap.live,
      summary: ranked.length ? `Strongest queued post: "${ranked[0].title}" (${ranked[0].score}/100).` : "Nothing queued to rank.",
      data: { posts: ranked },
    };
  },
};

const compare_periods: CopilotTool = {
  name: "compare_periods",
  description: "Compare content output: last 7 days vs the 7 days before.",
  parameters: {},
  label: "Comparing periods…",
  async run(args, ctx) {
    const snap = await workspaceSnapshot(ctx);
    const inRange = (d: string, from: string, to: string) => d >= from && d <= to;
    const now = todayIso();
    const w1from = addDaysIso(now, -7); const w2from = addDaysIso(now, -14);
    const count = (from: string, to: string) => ({
      campaigns: snap.campaigns.filter((c) => inRange(c.created_at.slice(0, 10), from, to)).length,
      posts: snap.posts.filter((p) => inRange(p.scheduled_at.slice(0, 10), from, to)).length,
      concepts: snap.concepts.filter((c) => inRange(c.created_at.slice(0, 10), from, to)).length,
    });
    const last7 = count(w1from, now);
    const prev7 = count(w2from, w1from);
    const trend = (a: number, b: number) => (a > b ? "up" : a < b ? "down" : "flat");
    return {
      ok: true, demo: !snap.live,
      summary: `Output is ${trend(last7.posts, prev7.posts)} vs last week.`,
      data: { last7Days: last7, previous7Days: prev7 },
    };
  },
};

const engagement_breakdown: CopilotTool = {
  name: "engagement_breakdown",
  description: "Break down the content pipeline by platform and status.",
  parameters: {},
  label: "Breaking down…",
  async run(args, ctx) {
    const snap = await workspaceSnapshot(ctx);
    const byPlatform: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    for (const p of snap.posts) {
      byPlatform[p.network] = (byPlatform[p.network] ?? 0) + 1;
      byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;
    }
    return { ok: true, demo: !snap.live, summary: "Pipeline breakdown ready.", data: { byPlatform, byStatus, total: snap.posts.length } };
  },
};

const hook_score_report: CopilotTool = {
  name: "hook_score_report",
  description: "Report on hook quality across all saved concepts: average, distribution, weakest.",
  parameters: {},
  label: "Grading hooks…",
  async run(args, ctx) {
    const snap = await workspaceSnapshot(ctx);
    const scored = snap.concepts.filter((c) => typeof c.hook_score === "number");
    if (!scored.length) return { ok: true, demo: !snap.live, summary: "No scored concepts yet — generate some first.", data: {} };
    const scores = scored.map((c) => c.hook_score as number);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const weakest = [...scored].sort((a, b) => (a.hook_score as number) - (b.hook_score as number)).slice(0, 3);
    return {
      ok: true, demo: !snap.live,
      summary: `Average hook score: ${avg}/100 across ${scored.length} concepts.`,
      data: { average: avg, count: scored.length, weakest: weakest.map((w) => ({ title: w.title, score: w.hook_score })) },
    };
  },
};

const weekly_digest: CopilotTool = {
  name: "weekly_digest",
  description: "Write a plain-language weekly digest: what shipped, what's queued, what needs attention.",
  parameters: {},
  label: "Writing digest…",
  async run(args, ctx) {
    const snap = await workspaceSnapshot(ctx);
    const queued = snap.posts.filter((p) => p.status === "queued").length;
    const active = snap.campaigns.filter((c) => !["archived", "launched"].includes(c.status)).length;
    const digest = await aiText(
      ctx,
      "You write a founder's weekly digest. Warm, direct, no fluff. Three sections: Shipped / In the queue / Needs attention.",
      `${brandLine(ctx.brand)}\nThis week: ${snap.campaigns.length} campaigns total (${active} active), ${queued} posts queued, ${snap.concepts.length} concepts saved.\nWrite the digest. Under 150 words.`
    );
    return {
      ok: true, demo: !snap.live,
      summary: "Weekly digest ready.",
      data: { digest: digest || `Active campaigns: ${active}. Queued posts: ${queued}. Concepts: ${snap.concepts.length}.` },
    };
  },
};

const content_pillars_report: CopilotTool = {
  name: "content_pillars_report",
  description: "Analyze which themes the brand keeps creating around, and suggest the missing pillar.",
  parameters: {},
  label: "Finding themes…",
  async run(args, ctx) {
    const snap = await workspaceSnapshot(ctx);
    const corpus = [...snap.campaigns.map((c) => c.brief), ...snap.concepts.map((c) => c.title)].join("\n").slice(0, 3000);
    if (!corpus.trim()) return { ok: false, summary: "No content yet to analyze — create a campaign first.", data: {} };
    const report = await aiText(
      ctx,
      "You are a content strategist. Find the real themes, name them sharply.",
      `${brandLine(ctx.brand)}\nAll recent briefs and concepts:\n${corpus}\nReply: the 3-4 content pillars this brand actually uses, plus ONE missing pillar they should add. Under 120 words.`
    );
    return { ok: true, summary: "Content pillars analyzed.", data: { report: report || "AI unavailable." } };
  },
};

const posting_consistency: CopilotTool = {
  name: "posting_consistency",
  description: "Score posting consistency over the last 30 days and show the streak.",
  parameters: {},
  label: "Checking consistency…",
  async run(args, ctx) {
    const snap = await workspaceSnapshot(ctx);
    const days: Record<string, number> = {};
    for (let i = 0; i < 30; i++) days[addDaysIso(todayIso(), -i)] = 0;
    for (const p of snap.posts) {
      const d = p.scheduled_at.slice(0, 10);
      if (d in days) days[d]++;
    }
    const activeDays = Object.values(days).filter((n) => n > 0).length;
    const score = Math.round((activeDays / 30) * 100);
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      if (days[addDaysIso(todayIso(), -i)] > 0) streak++;
      else break;
    }
    return {
      ok: true, demo: !snap.live,
      summary: `Posted on ${activeDays}/30 days. Current streak: ${streak} day(s).`,
      data: { score, activeDays, streak, calendar: days },
    };
  },
};

const growth_trend: CopilotTool = {
  name: "growth_trend",
  description: "Is the brand's content output growing? Month-over-month trend from real data.",
  parameters: {},
  label: "Reading the trend…",
  async run(args, ctx) {
    const snap = await workspaceSnapshot(ctx);
    const month = (d: string) => d.slice(0, 7);
    const counts: Record<string, number> = {};
    for (const p of snap.posts) counts[month(p.scheduled_at)] = (counts[month(p.scheduled_at)] ?? 0) + 1;
    for (const c of snap.campaigns) counts[month(c.created_at)] = (counts[month(c.created_at)] ?? 0) + 1;
    const months = Object.keys(counts).sort().slice(-4);
    const trend = months.map((m) => ({ month: m, items: counts[m] }));
    const verdict = trend.length >= 2 && trend[trend.length - 1].items >= trend[trend.length - 2].items ? "growing" : "cooling";
    return { ok: true, demo: !snap.live, summary: `Output trend: ${verdict}.`, data: { trend, verdict } };
  },
};

const saves_leaderboard: CopilotTool = {
  name: "saves_leaderboard",
  description: "Rank saved concepts by hook score — the ideas most worth producing.",
  parameters: {},
  label: "Ranking ideas…",
  async run(args, ctx) {
    const snap = await workspaceSnapshot(ctx);
    const ranked = snap.concepts
      .map((c) => ({ id: c.id, title: c.title, headline: c.headline, score: typeof c.hook_score === "number" ? c.hook_score : scoreHook(c.headline || c.title, "").score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    return {
      ok: true, demo: !snap.live,
      summary: ranked.length ? `Top idea: "${ranked[0].title}" (${ranked[0].score}/100).` : "No concepts saved yet.",
      data: { concepts: ranked },
    };
  },
};

const reach_by_platform: CopilotTool = {
  name: "reach_by_platform",
  description: "Planned reach footprint: how the queued content is distributed across platforms.",
  parameters: {},
  label: "Mapping platforms…",
  async run(args, ctx) {
    const snap = await workspaceSnapshot(ctx);
    const queued = snap.posts.filter((p) => p.status === "queued");
    const dist: Record<string, { count: number; share: number }> = {};
    for (const p of queued) dist[p.network] = { count: (dist[p.network]?.count ?? 0) + 1, share: 0 };
    for (const k of Object.keys(dist)) dist[k].share = queued.length ? Math.round((dist[k].count / queued.length) * 100) : 0;
    const advice = await aiText(
      ctx,
      "You are a channel strategist. One sharp paragraph.",
      `${brandLine(ctx.brand)}\nQueued distribution: ${JSON.stringify(dist)}\nIs this mix right? One paragraph of advice, under 60 words.`
    );
    return { ok: true, demo: !snap.live, summary: "Platform mix mapped.", data: { distribution: dist, advice: advice || "" } };
  },
};

const export_csv: CopilotTool = {
  name: "export_csv",
  description: "Export the scheduled queue as CSV text the user can copy into a spreadsheet.",
  parameters: {},
  label: "Exporting…",
  async run(args, ctx) {
    const snap = await workspaceSnapshot(ctx);
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const rows = ["id,title,platform,scheduled_at,status", ...snap.posts.map((p) => [p.id, esc(p.title), p.network, p.scheduled_at, p.status].join(","))];
    return { ok: true, demo: !snap.live, summary: `Exported ${snap.posts.length} post(s) as CSV.`, data: { csv: rows.join("\n"), count: snap.posts.length } };
  },
};

export const analyticsTools: CopilotTool[] = [
  post_analytics,
  top_posts,
  compare_periods,
  engagement_breakdown,
  hook_score_report,
  weekly_digest,
  content_pillars_report,
  posting_consistency,
  growth_trend,
  saves_leaderboard,
  reach_by_platform,
  export_csv,
];
