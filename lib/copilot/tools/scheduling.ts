/**
 * Scheduling tools — queue management, gaps, rescheduling, smart timing.
 * Writes go through the same confirmation gate as the core schedule_post.
 */
import {
  type CopilotTool,
  rid,
  str,
  pick,
  needDb,
  brandLine,
  payloadOf,
  aiText,
  aiJson,
  todayIso,
  addDaysIso,
} from "../toolutil";

interface SchedRow {
  id: string;
  network: string;
  scheduled_at: string;
  status: string;
  payload: string;
}

async function queuedPosts(ctx: Parameters<CopilotTool["run"]>[1]): Promise<(SchedRow & { title: string })[]> {
  if (!ctx.db || !ctx.userId) return [];
  const res = await ctx.db
    .prepare("SELECT id, network, scheduled_at, status, payload FROM scheduled_posts WHERE user_id = ? AND status = 'queued' ORDER BY scheduled_at LIMIT 60")
    .bind(ctx.userId)
    .all();
  return (((res.results ?? []) as unknown) as SchedRow[]).map((r) => ({
    ...r,
    title: str(payloadOf<{ title?: string }>(r).title, r.network),
  }));
}

const propose_week_schedule: CopilotTool = {
  name: "propose_week_schedule",
  description: "Propose a full 7-day posting schedule with AI-written post ideas. Asks the user to confirm before saving.",
  parameters: {
    postsPerWeek: { type: "string", description: "How many posts (default 5)." },
    focus: { type: "string", description: "Theme or campaign to focus on." },
  },
  label: "Planning your week…",
  async run(args, ctx) {
    const n = Math.max(1, Math.min(14, parseInt(pick(args, ["postsPerWeek", "posts", "count", "n"], "5"), 10) || 5));
    const focus = pick(args, ["focus", "theme", "campaign", "topic"]);
    const plan = await aiJson<{ posts: { day: string; platform: string; title: string; hook: string }[] }>(
      ctx,
      "You are a social media strategist. Spread posts sensibly across the week.",
      `${brandLine(ctx.brand)}\nPropose ${n} posts for the week starting ${todayIso()}${focus ? ` around: ${focus}` : ""}.\nReply with JSON: {"posts": [{"day": "2026-10-01", "platform": "ig-reel", "title": "...", "hook": "..."}]}`
    );
    const posts = (plan?.posts ?? []).slice(0, n);
    if (!posts.length) return { ok: false, summary: "Couldn't plan the week right now.", data: {} };
    return {
      ok: true,
      needs_confirmation: true,
      summary: `Proposed a ${posts.length}-post week — waiting for your confirmation.`,
      data: { posts, brandId: ctx.brand.id, kind: "week_schedule" },
    };
  },
};

const list_scheduled: CopilotTool = {
  name: "list_scheduled",
  description: "List all queued scheduled posts.",
  parameters: {},
  label: "Checking the queue…",
  async run(args, ctx) {
    const posts = await queuedPosts(ctx);
    return {
      ok: true,
      demo: !ctx.db,
      summary: posts.length ? `${posts.length} post(s) queued.` : "The queue is empty.",
      data: { posts: posts.map((p) => ({ id: p.id, title: p.title, network: p.network, scheduled_at: p.scheduled_at })) },
    };
  },
};

const schedule_gaps: CopilotTool = {
  name: "schedule_gaps",
  description: "Find gaps in the posting schedule over the next 14 days.",
  parameters: {},
  label: "Finding gaps…",
  async run(args, ctx) {
    const posts = await queuedPosts(ctx);
    const days: Record<string, number> = {};
    for (let i = 0; i < 14; i++) days[addDaysIso(todayIso(), i)] = 0;
    for (const p of posts) {
      const d = p.scheduled_at.slice(0, 10);
      if (d in days) days[d]++;
    }
    const gaps = Object.entries(days).filter(([, c]) => c === 0).map(([d]) => d);
    return {
      ok: true,
      summary: gaps.length ? `${gaps.length} empty day(s) in the next 2 weeks.` : "No gaps — every day has something queued.",
      data: { gaps, coverage: days },
    };
  },
};

const reschedule_post: CopilotTool = {
  name: "reschedule_post",
  description: "Move a scheduled post to a new date/time.",
  parameters: {
    postId: { type: "string", description: "The scheduled post id.", required: true },
    date: { type: "string", description: "New date yyyy-mm-dd.", required: true },
    time: { type: "string", description: "New time HH:MM (default 18:00)." },
  },
  label: "Rescheduling…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const id = pick(args, ["postId", "post_id", "id"]);
    const date = pick(args, ["date", "day", "newDate"]);
    const time = pick(args, ["time", "at"]) || "18:00";
    if (!id || !date) return { ok: false, summary: "I need the post and the new date.", data: {} };
    const r = await ctx.db!.prepare("UPDATE scheduled_posts SET scheduled_at = ? WHERE id = ? AND user_id = ?").bind(`${date}T${time}:00`, id, ctx.userId).run();
    if (!r.meta.changes) return { ok: false, summary: "Post not found.", data: {} };
    return { ok: true, summary: `Moved to ${date} at ${time}.`, data: { postId: id, scheduled_at: `${date}T${time}:00` } };
  },
};

const cancel_scheduled: CopilotTool = {
  name: "cancel_scheduled",
  description: "Cancel a queued post (marks it cancelled, keeps the record).",
  parameters: {
    postId: { type: "string", description: "The scheduled post id.", required: true },
  },
  label: "Cancelling post…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const id = pick(args, ["postId", "post_id", "id"]);
    if (!id) return { ok: false, summary: "Which post should I cancel?", data: {} };
    const r = await ctx.db!.prepare("UPDATE scheduled_posts SET status = 'cancelled' WHERE id = ? AND user_id = ?").bind(id, ctx.userId).run();
    if (!r.meta.changes) return { ok: false, summary: "Post not found.", data: {} };
    return { ok: true, summary: "Post cancelled.", data: { postId: id } };
  },
};

const auto_spread: CopilotTool = {
  name: "auto_spread",
  description: "Evenly spread all queued posts across the next N days so nothing bunches up.",
  parameters: {
    days: { type: "string", description: "Spread across how many days (default 7)." },
    time: { type: "string", description: "Posting time HH:MM (default 18:00)." },
  },
  label: "Spreading posts…",
  needsConfirmation: true,
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const posts = await queuedPosts(ctx);
    if (!posts.length) return { ok: false, summary: "Nothing queued to spread.", data: {} };
    const days = Math.max(1, Math.min(30, parseInt(pick(args, ["days", "n"], "7"), 10) || 7));
    const time = pick(args, ["time", "at"]) || "18:00";
    const stmts = posts.map((p, i) => {
      const date = addDaysIso(todayIso(), Math.floor((i * days) / posts.length));
      return ctx.db!.prepare("UPDATE scheduled_posts SET scheduled_at = ? WHERE id = ?").bind(`${date}T${time}:00`, p.id);
    });
    await ctx.db!.batch(stmts);
    return { ok: true, summary: `Spread ${posts.length} post(s) across ${days} days at ${time}.`, data: { moved: posts.length } };
  },
};

const best_posting_times: CopilotTool = {
  name: "best_posting_times",
  description: "Recommend the best posting times for the brand's audience and platforms.",
  parameters: {
    platform: { type: "string", description: "Platform to focus on." },
  },
  label: "Checking timing…",
  async run(args, ctx) {
    const platform = pick(args, ["platform", "network"]) || "instagram + tiktok";
    const text = await aiText(
      ctx,
      "You are a social media analyst. Give practical, specific timing advice.",
      `${brandLine(ctx.brand)}\nBest posting times for ${platform} for this brand's audience.\nReply: 3-4 specific time slots with one-line reasons each. Keep it short.`
    );
    const fallback = "18:00–20:00 local (evening scroll) · 12:00–13:00 (lunch break) · 08:00–09:00 (morning commute)";
    return { ok: true, summary: "Timing recommendations ready.", data: { times: text.trim() || fallback, platform } };
  },
};

const upcoming_posts: CopilotTool = {
  name: "upcoming_posts",
  description: "What's going out in the next 7 days, in plain language.",
  parameters: {},
  label: "Looking ahead…",
  async run(args, ctx) {
    const posts = await queuedPosts(ctx);
    const cutoff = addDaysIso(todayIso(), 7) + "T23:59:59";
    const soon = posts.filter((p) => p.scheduled_at <= cutoff);
    return {
      ok: true,
      demo: !ctx.db,
      summary: soon.length ? `${soon.length} post(s) going out this week.` : "Nothing scheduled this week.",
      data: { posts: soon.map((p) => ({ title: p.title, network: p.network, scheduled_at: p.scheduled_at })) },
    };
  },
};

const schedule_recurring: CopilotTool = {
  name: "schedule_recurring",
  description: "Schedule the same post idea on a recurring cadence (e.g. every Monday for 4 weeks).",
  parameters: {
    title: { type: "string", description: "Post title/idea.", required: true },
    platform: { type: "string", description: "Platform." },
    weekday: { type: "string", description: "e.g. monday.", required: true },
    weeks: { type: "string", description: "How many weeks (default 4)." },
    time: { type: "string", description: "Time HH:MM (default 18:00)." },
  },
  label: "Setting up recurring…",
  needsConfirmation: true,
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const title = pick(args, ["title", "idea", "topic", "post"]);
    const weekday = pick(args, ["weekday", "day"]).toLowerCase();
    if (!title || !weekday) return { ok: false, summary: "I need the post idea and the weekday.", data: {} };
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const target = dayNames.indexOf(weekday);
    if (target < 0) return { ok: false, summary: `Couldn't parse weekday "${weekday}".`, data: {} };
    const weeks = Math.max(1, Math.min(12, parseInt(pick(args, ["weeks", "n"], "4"), 10) || 4));
    const time = pick(args, ["time", "at"]) || "18:00";
    const platform = pick(args, ["platform", "network"]) || "ig-feed";
    const today = new Date(todayIso() + "T12:00:00Z");
    const dates: string[] = [];
    const d = new Date(today);
    while (d.getUTCDay() !== target) d.setUTCDate(d.getUTCDate() + 1);
    for (let w = 0; w < weeks; w++) {
      dates.push(d.toISOString().slice(0, 10));
      d.setUTCDate(d.getUTCDate() + 7);
    }
    const stmts = dates.map((date) =>
      ctx.db!.prepare("INSERT INTO scheduled_posts (id, user_id, network, scheduled_at, status, payload) VALUES (?, ?, ?, ?, 'queued', ?)")
        .bind(rid("sched"), ctx.userId, platform, `${date}T${time}:00`, JSON.stringify({ title, platform, brandId: ctx.brand.id, recurring: true }))
    );
    await ctx.db!.batch(stmts);
    return { ok: true, summary: `Scheduled "${title}" every ${weekday} for ${weeks} weeks.`, data: { dates } };
  },
};

const queue_status: CopilotTool = {
  name: "queue_status",
  description: "Health check of the content queue: counts by status and platform.",
  parameters: {},
  label: "Checking queue health…",
  async run(args, ctx) {
    if (!ctx.db || !ctx.userId) {
      return { ok: true, demo: true, summary: "Queue health needs a real account.", data: {} };
    }
    const res = await ctx.db
      .prepare("SELECT status, network, COUNT(*) as n FROM scheduled_posts WHERE user_id = ? GROUP BY status, network")
      .bind(ctx.userId)
      .all();
    const rows = (res.results ?? []) as { status: string; network: string; n: number }[];
    const queued = rows.filter((r) => r.status === "queued").reduce((a, r) => a + r.n, 0);
    const verdict = queued === 0 ? "Queue is empty — time to plan content." : queued < 3 ? "Queue is thin — plan more posts." : "Queue is healthy.";
    return { ok: true, summary: verdict, data: { breakdown: rows, queued } };
  },
};

const move_to_best_slot: CopilotTool = {
  name: "move_to_best_slot",
  description: "Move a post to the next recommended high-engagement slot.",
  parameters: {
    postId: { type: "string", description: "The scheduled post id.", required: true },
  },
  label: "Finding best slot…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const id = pick(args, ["postId", "post_id", "id"]);
    if (!id) return { ok: false, summary: "Which post?", data: {} };
    const posts = await queuedPosts(ctx);
    const busy = new Set(posts.map((p) => p.scheduled_at.slice(0, 10)));
    let date = addDaysIso(todayIso(), 1);
    for (let i = 0; i < 14 && busy.has(date); i++) date = addDaysIso(date, 1);
    const slot = `${date}T19:00:00`;
    const r = await ctx.db!.prepare("UPDATE scheduled_posts SET scheduled_at = ? WHERE id = ? AND user_id = ?").bind(slot, id, ctx.userId).run();
    if (!r.meta.changes) return { ok: false, summary: "Post not found.", data: {} };
    return { ok: true, summary: `Moved to ${date} at 19:00 — prime evening slot.`, data: { postId: id, scheduled_at: slot } };
  },
};

export const schedulingTools: CopilotTool[] = [
  propose_week_schedule,
  list_scheduled,
  schedule_gaps,
  reschedule_post,
  cancel_scheduled,
  auto_spread,
  best_posting_times,
  upcoming_posts,
  schedule_recurring,
  queue_status,
  move_to_best_slot,
];
