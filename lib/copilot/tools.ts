/**
 * Forge Copilot tools — the actions the copilot can take in chat.
 *
 * Edge-safe: no Node imports. Reuses the REAL engines from lib/ai.ts
 * (generateConceptsAI, scoreHookAI, captionAI) — never reimplements them —
 * with deterministic fallbacks when the Workers AI binding is absent.
 *
 * RULES:
 *  - Every tool returns { ok, summary, data }. `data` is JSON for the model.
 *  - Nothing irreversible happens inside run(): schedule_post only PROPOSES.
 *    executeSchedulePost() performs the D1 writes, and is called by the
 *    chat route only after the user confirms in chat.
 *  - Tools degrade gracefully in demo mode (no DB / no AI binding).
 */
import type { D1Database, Ai } from "@cloudflare/workers-types";
import type { Brand, Brief, PlatformId } from "../types";
import { generateConceptsAI, scoreHookAI, captionAI } from "../ai";
import { generateConcepts, buildCaption, platformMeta } from "../campaign";
import { scoreHook } from "../hookScore";

export interface CopilotCtx {
  userId: string | null;
  brand: Brand;
  db: D1Database | null;
  ai: Ai | null;
  env: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  summary: string;
  data?: unknown;
  /** Set when the tool needs the user to confirm before anything happens. */
  needs_confirmation?: boolean;
  /** True when the result is demo/offline behavior, not real data. */
  demo?: boolean;
}

export interface CopilotTool {
  name: string;
  description: string;
  /** Simple JSON-schema-ish shape used by the ReAct loop. */
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  /** Friendly label shown in the UI while the tool runs. */
  label: string;
  needsConfirmation?: boolean;
  run: (args: Record<string, unknown>, ctx: CopilotCtx) => Promise<ToolResult>;
}

function rid(prefix: string): string {
  const r =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 18);
  return `${prefix}_${r}`;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

function platformList(v: unknown): PlatformId[] {
  const valid: PlatformId[] = ["ig-feed", "ig-reel", "ig-story", "tiktok", "shorts", "x"];
  if (!Array.isArray(v)) return ["ig-feed"];
  const out = v.filter((p): p is PlatformId => valid.includes(p as PlatformId));
  return out.length ? out : ["ig-feed"];
}

const get_dashboard_stats: CopilotTool = {
  name: "get_dashboard_stats",
  description:
    "Get account dashboard counts: campaigns by status (ideas/producing/review/scheduled/live) and upcoming scheduled posts.",
  parameters: {},
  label: "Checking your dashboard…",
  async run(_args, ctx) {
    if (!ctx.db || !ctx.userId) {
      return {
        ok: true,
        demo: true,
        summary: "Demo mode — no database connected, so I can't read real numbers.",
        data: { mode: "demo", note: "Connect a database to read live campaign counts." },
      };
    }
    const byStatus = await ctx.db
      .prepare(
        `SELECT status, COUNT(*) AS n FROM campaigns WHERE user_id = ? GROUP BY status`
      )
      .bind(ctx.userId)
      .all<{ status: string; n: number }>();
    const statuses: Record<string, number> = {};
    for (const r of byStatus.results ?? []) statuses[r.status] = r.n;
    const upcoming = await ctx.db
      .prepare(
        `SELECT COUNT(*) AS n FROM scheduled_posts
         WHERE user_id = ? AND status IN ('queued','scheduled') AND scheduled_at > datetime('now')`
      )
      .bind(ctx.userId)
      .first<{ n: number }>();
    const total = Object.values(statuses).reduce((a, b) => a + b, 0);
    return {
      ok: true,
      summary: `Dashboard: ${total} campaigns total (${statuses["live"] ?? 0} live), ${upcoming?.n ?? 0} posts queued up.`,
      data: { mode: "live", campaigns: statuses, total, scheduled_upcoming: upcoming?.n ?? 0 },
    };
  },
};

const list_campaigns: CopilotTool = {
  name: "list_campaigns",
  description: "List the account's campaigns: id, name, status/stage, created date.",
  parameters: {
    status: { type: "string", description: "Optional status filter, e.g. 'ideas' or 'live'." },
  },
  label: "Listing campaigns…",
  async run(args, ctx) {
    if (!ctx.db || !ctx.userId) {
      return {
        ok: true,
        demo: true,
        summary: "Demo mode — no campaigns stored without a database.",
        data: { mode: "demo", campaigns: [] },
      };
    }
    const status = str(args.status);
    const rows = await ctx.db
      .prepare(
        `SELECT id, brief, status, payload, created_at FROM campaigns
         WHERE user_id = ? ${status ? "AND status = ?" : ""}
         ORDER BY created_at DESC LIMIT 25`
      )
      .bind(...(status ? [ctx.userId, status] : [ctx.userId]))
      .all<{ id: string; brief: string; status: string; payload: string; created_at: string }>();
    const campaigns = (rows.results ?? []).map((r) => {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(r.payload || "{}");
      } catch {
        /* keep brief-only */
      }
      const name = str(payload.name as unknown) || str(r.brief).slice(0, 60) || r.id;
      return { id: r.id, name, status: r.status, stage: r.status, created: r.created_at };
    });
    return {
      ok: true,
      summary: `Found ${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}.`,
      data: { mode: "live", campaigns },
    };
  },
};

const create_brief: CopilotTool = {
  name: "create_brief",
  description:
    "Save a new creative brief as an 'ideas'-stage campaign in the account.",
  parameters: {
    brief: { type: "string", description: "One-line brief name/summary.", required: true },
    product: { type: "string", description: "Product being advertised." },
    objective: { type: "string", description: "Goal: launch, sales, awareness, retention." },
    audience: { type: "string", description: "Target audience." },
    placements: { type: "string[]", description: "Platform ids, e.g. ['ig-reel','tiktok']." },
  },
  label: "Saving your brief…",
  async run(args, ctx) {
    const brief = str(args.brief);
    const product = str(args.product);
    const objective = str(args.objective) || "awareness";
    const audience = str(args.audience);
    const placements = platformList(args.placements);
    const payload = { brief, product, objective, audience, placements };
    if (!brief) {
      return { ok: false, summary: "A brief needs a one-line summary — got an empty string.", data: {} };
    }
    if (!ctx.db || !ctx.userId) {
      return {
        ok: false,
        demo: true,
        summary: "Demo mode — the brief was NOT saved (no database), but here's what we discussed.",
        data: { demo: true, brief: payload },
      };
    }
    const id = rid("cmp");
    await ctx.db
      .prepare(
        `INSERT INTO campaigns (id, user_id, brand_id, brief, status, payload)
         VALUES (?, ?, ?, ?, 'ideas', ?)`
      )
      .bind(id, ctx.userId, ctx.brand.id, brief, JSON.stringify(payload))
      .run();
    return {
      ok: true,
      summary: `Brief "${brief}" saved as an Ideas-stage campaign (${id}).`,
      data: { mode: "live", id, brief: payload },
    };
  },
};

function buildBriefFromArgs(args: Record<string, unknown>, brandId: string): Brief {
  return {
    product: str(args.product) || str(args.brief) || "the product",
    audience: str(args.audience) || "the brand's audience",
    goal: str(args.objective) || str(args.goal) || "awareness",
    offer: str(args.offer),
    platforms: platformList(args.placements ?? args.platforms),
    brandId,
    trendAngle: str(args.trendAngle) || undefined,
  };
}

const generate_concepts: CopilotTool = {
  name: "generate_concepts",
  description:
    "Draft ad concepts for the active brand. Every concept is Slop Shield + Hook Score QC'd. Returns headline, sub, CTA, hook score and source.",
  parameters: {
    brief: { type: "string", description: "One-line brief summary.", required: true },
    product: { type: "string", description: "Product being advertised." },
    audience: { type: "string", description: "Target audience." },
    objective: { type: "string", description: "Goal: launch, sales, awareness, retention." },
    placements: { type: "string[]", description: "Platform ids, e.g. ['ig-reel','tiktok']." },
  },
  label: "Drafting concepts…",
  async run(args, ctx) {
    const brief = buildBriefFromArgs(args, ctx.brand.id);
    const n = typeof args.n === "number" ? Math.max(1, Math.min(3, Math.round(args.n))) : 3;
    if (ctx.ai) {
      const res = await generateConceptsAI(ctx.ai, brief, ctx.brand);
      const items = res.concepts.slice(0, n).map((c, i) => ({
        headline: c.headline,
        sub: c.sub,
        cta: c.cta,
        placement: brief.platforms[i % brief.platforms.length],
        hookScore: c.hook.score,
        verdict: c.hook.grade,
        source: res.source,
      }));
      return {
        ok: true,
        summary: `Drafted ${items.length} concepts (${res.source} engine) — all cleared Slop Shield + Hook Score QC.`,
        data: { concepts: items, source: res.source, qc: "slop-shield + hook-score" },
      };
    }
    const concepts = generateConcepts(brief, ctx.brand).slice(0, n);
    const items = concepts.map((c, i) => ({
      headline: c.headline,
      sub: c.sub,
      cta: c.cta,
      placement: brief.platforms[i % brief.platforms.length],
      hookScore: c.hook.score,
      verdict: c.hook.grade,
      source: "deterministic" as const,
    }));
    return {
      ok: true,
      demo: true,
      summary: `AI engine offline in this preview — drafted ${items.length} concepts with the deterministic engine (QC'd the same way).`,
      data: { concepts: items, source: "deterministic", qc: "slop-shield + hook-score", note: "AI engine offline" },
    };
  },
};

const score_hook: CopilotTool = {
  name: "score_hook",
  description: "Score an ad headline 0-100 with a verdict. Honest, not flattering.",
  parameters: {
    headline: { type: "string", description: "The headline to score.", required: true },
    sub: { type: "string", description: "Supporting line / caption context." },
  },
  label: "Scoring your hook…",
  async run(args, ctx) {
    const headline = str(args.headline);
    const sub = str(args.sub);
    if (!headline) return { ok: false, summary: "No headline provided to score.", data: {} };
    if (ctx.ai) {
      const r = await scoreHookAI(ctx.ai, headline, sub);
      return {
        ok: true,
        summary: `Hook scored ${r.blended}/100 (${r.source}).`,
        data: {
          headline,
          score: r.blended,
          verdict: r.ai?.reason || `Deterministic score ${r.deterministic}/100.`,
          source: r.source,
        },
      };
    }
    const r = scoreHook(headline, sub);
    return {
      ok: true,
      demo: true,
      summary: `Hook scored ${r.score}/100 (deterministic engine — AI second opinion offline).`,
      data: { headline, score: r.score, verdict: r.grade, source: "deterministic" },
    };
  },
};

const write_caption: CopilotTool = {
  name: "write_caption",
  description: "Write a platform-native caption + hashtags for a concept, QC-checked.",
  parameters: {
    platform: { type: "string", description: "Platform id, e.g. 'ig-reel'.", required: true },
    headline: { type: "string", description: "Concept headline.", required: true },
    sub: { type: "string", description: "Concept supporting line." },
    cta: { type: "string", description: "Call to action." },
  },
  label: "Writing the caption…",
  async run(args, ctx) {
    const platform = platformList([args.platform])[0];
    const headline = str(args.headline);
    const sub = str(args.sub);
    const cta = str(args.cta) || "Shop now";
    if (!headline) return { ok: false, summary: "Need a headline to write a caption from.", data: {} };
    const meta = platformMeta(platform);
    let caption: string;
    let hashtags: string[];
    let source: string;
    if (ctx.ai) {
      const r = await captionAI(ctx.ai, platform, headline, sub, cta, ctx.brand);
      caption = r.caption;
      hashtags = r.hashtags;
      source = r.source;
    } else {
      caption = buildCaption(platform, headline, sub, cta, ctx.brand, sub);
      hashtags = [];
      source = "deterministic";
    }
    const combined = (caption + " " + hashtags.join(" ")).trim();
    const valid = combined.length <= meta.captionLimit;
    return {
      ok: true,
      summary: `Caption drafted for ${meta.label} (${source})${valid ? "" : " — over the character limit, needs a trim"}.`,
      data: { platform, caption, hashtags, source, charLimit: meta.captionLimit, withinLimit: valid },
    };
  },
};

const get_analytics: CopilotTool = {
  name: "get_analytics",
  description:
    "Account analytics: campaigns by status, upcoming scheduled posts, recent activity count.",
  parameters: {},
  label: "Pulling your numbers…",
  async run(_args, ctx) {
    const note =
      "Deep post-level analytics (reach, likes, conversions) come from connected ad accounts later — this is pipeline + scheduling health only.";
    if (!ctx.db || !ctx.userId) {
      return {
        ok: true,
        demo: true,
        summary: "Demo mode — no live analytics without a database. " + note,
        data: { mode: "demo", note },
      };
    }
    const byStatus = await ctx.db
      .prepare(`SELECT status, COUNT(*) AS n FROM campaigns WHERE user_id = ? GROUP BY status`)
      .bind(ctx.userId)
      .all<{ status: string; n: number }>();
    const campaigns: Record<string, number> = {};
    for (const r of byStatus.results ?? []) campaigns[r.status] = r.n;
    const upcoming = await ctx.db
      .prepare(
        `SELECT COUNT(*) AS n FROM scheduled_posts
         WHERE user_id = ? AND status IN ('queued','scheduled') AND scheduled_at > datetime('now')`
      )
      .bind(ctx.userId)
      .first<{ n: number }>();
    const activity = await ctx.db
      .prepare(`SELECT COUNT(*) AS n FROM notifications WHERE user_id = ?`)
      .bind(ctx.userId)
      .first<{ n: number }>();
    return {
      ok: true,
      summary: `Pipeline: ${Object.values(campaigns).reduce((a, b) => a + b, 0)} campaigns, ${upcoming?.n ?? 0} upcoming posts, ${activity?.n ?? 0} notifications. ${note}`,
      data: {
        mode: "live",
        campaigns,
        upcoming_scheduled: upcoming?.n ?? 0,
        notification_count: activity?.n ?? 0,
        note,
      },
    };
  },
};

/**
 * Curated social-ad trends. These are editorial picks, NOT live-scraped
 * data — the copilot must say so if asked about their source.
 */
export const CURATED_TRENDS = [
  {
    id: "ugly-edit",
    title: "Deliberately 'ugly' lo-fi edits",
    platform: "TikTok / Reels",
    why: "Over-polished ads get swiped; raw phone-shot edits read as creator content and hold attention longer.",
  },
  {
    id: "hook-first-9x16",
    title: "Burned-in hooks on the first frame",
    platform: "Reels / Shorts",
    why: "Muted autoplay means the hook is visual now — big type on frame one or the swipe happens.",
  },
  {
    id: "founder-face",
    title: "Founder-face formats",
    platform: "TikTok / X",
    why: "Talking-head explainers from the founder outperform brand VO — people trust a face over a logo.",
  },
  {
    id: "comment-bait-ugc",
    title: "Comment-bait UGC stitches",
    platform: "TikTok",
    why: "Stitching a real customer comment turns social proof into the ad itself. Cheap to make, strong hook.",
  },
  {
    id: "before-after-split",
    title: "Split-frame before/afters",
    platform: "Reels / Shorts",
    why: "The oldest format that still works — transformation is a curiosity gap you can see in one second.",
  },
  {
    id: "carousels-comeback",
    title: "Swipe carousels as mini landing pages",
    platform: "IG Feed",
    why: "Multi-slide carousels are getting reach boosts; each slide is a new chance to stop the thumb.",
  },
  {
    id: "silent-story",
    title: "Silent-first story ads",
    platform: "IG Stories",
    why: "Most story views are muted — kinetic type and visual beats carry the whole message.",
  },
];

const get_trends: CopilotTool = {
  name: "get_trends",
  description: "Get curated current social-ad trends (2026) with a one-line why for each.",
  parameters: {},
  label: "Checking what's working…",
  async run() {
    return {
      ok: true,
      summary: `${CURATED_TRENDS.length} curated trends (editorial picks, not live-scraped).`,
      data: { trends: CURATED_TRENDS, source: "curated, not live-scraped" },
    };
  },
};

export interface SchedulePostInput {
  title: string;
  platform: string;
  date: string; // yyyy-mm-dd
  time: string; // HH:MM
}

function validPost(p: unknown): p is SchedulePostInput {
  if (!p || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.title === "string" && o.title.trim().length > 0 &&
    typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) &&
    typeof o.time === "string" && /^\d{2}:\d{2}$/.test(o.time)
  );
}

const schedule_post: CopilotTool = {
  name: "schedule_post",
  description:
    "PROPOSE scheduling posts (title, platform, date yyyy-mm-dd, time HH:MM). Never writes anything — the user confirms in chat first.",
  parameters: {
    posts: { type: "array", description: "Posts to schedule.", required: true },
    brandId: { type: "string", description: "Brand id for the posts." },
  },
  label: "Preparing your schedule…",
  needsConfirmation: true,
  async run(args, ctx) {
    const raw = Array.isArray(args.posts) ? args.posts : [];
    const posts = raw.filter(validPost);
    if (!posts.length) {
      return {
        ok: false,
        summary: "Couldn't build a schedule — I need title, date (yyyy-mm-dd) and time (HH:MM) for each post.",
        data: {},
      };
    }
    if (!ctx.db || !ctx.userId) {
      return {
        ok: false,
        demo: true,
        summary: "Demo mode — scheduling needs a real account, but here's the plan I would queue.",
        data: { demo: true, posts },
      };
    }
    return {
      ok: true,
      needs_confirmation: true,
      summary: `Proposed schedule: ${posts.length} post${posts.length === 1 ? "" : "s"} — waiting for your confirmation.`,
      data: { posts, brandId: str(args.brandId) || ctx.brand.id },
    };
  },
};

/** Performs the D1 writes for a confirmed schedule. Call ONLY after user confirmation. */
export async function executeSchedulePost(
  posts: SchedulePostInput[],
  ctx: Pick<CopilotCtx, "userId" | "db" | "brand">
): Promise<{ inserted: number; ids: string[] }> {
  if (!ctx.db || !ctx.userId) throw new Error("executeSchedulePost requires db + user");
  const ids: string[] = [];
  const stmts = posts.filter(validPost).map((p) => {
    const id = rid("sched");
    ids.push(id);
    return ctx.db!
      .prepare(
        `INSERT INTO scheduled_posts (id, user_id, network, scheduled_at, status, payload)
         VALUES (?, ?, ?, ?, 'queued', ?)`
      )
      .bind(
        id,
        ctx.userId,
        str(p.platform) || "ig-feed",
        `${p.date}T${p.time}:00`,
        JSON.stringify({ title: p.title, platform: p.platform, brandId: ctx.brand.id })
      );
  });
  if (stmts.length) await ctx.db.batch(stmts);
  return { inserted: ids.length, ids };
}

export const COPILOT_TOOLS: CopilotTool[] = [
  get_dashboard_stats,
  list_campaigns,
  create_brief,
  generate_concepts,
  score_hook,
  write_caption,
  get_analytics,
  get_trends,
  schedule_post,
];

/** Dispatch helper: unknown tool names → clean error. */
export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: CopilotCtx
): Promise<{ tool: CopilotTool; result: ToolResult }> {
  const tool = COPILOT_TOOLS.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Unknown tool "${name}". Available: ${COPILOT_TOOLS.map((t) => t.name).join(", ")}`);
  }
  const result = await tool.run(args ?? {}, ctx);
  return { tool, result };
}
