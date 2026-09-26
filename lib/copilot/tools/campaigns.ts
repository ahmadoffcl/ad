/**
 * Campaign management tools — CRUD plus workflow helpers for ad campaigns.
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
  todayIso,
  addDaysIso,
} from "../toolutil";

const CAMPAIGN_STAGES = ["brief", "concepts", "hooks", "captions", "scheduled", "launched"] as const;

async function findCampaign(
  args: Record<string, unknown>,
  ctx: Parameters<CopilotTool["run"]>[1]
): Promise<{ id: string; brief: string; status: string; created_at: string; payload: Record<string, unknown> } | null> {
  if (!ctx.db || !ctx.userId) return null;
  const id = pick(args, ["campaignId", "campaign_id", "id"]);
  const row = id
    ? await ctx.db.prepare("SELECT * FROM campaigns WHERE id = ? AND user_id = ?").bind(id, ctx.userId).first()
    : await ctx.db
        .prepare("SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
        .bind(ctx.userId)
        .first();
  if (!row) return null;
  const r = row as { id: string; brief: string; status: string; created_at: string };
  return { ...r, payload: payloadOf<Record<string, unknown>>(row) };
}

const get_campaign: CopilotTool = {
  name: "get_campaign",
  description: "Get full details of one campaign (brief, status, assets). No id = most recent campaign.",
  parameters: {
    campaignId: { type: "string", description: "Campaign id. Omit for the most recent campaign." },
  },
  label: "Opening campaign…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const c = await findCampaign(args, ctx);
    if (!c) return { ok: false, summary: "No campaign found.", data: {} };
    return { ok: true, summary: `Campaign "${c.brief.slice(0, 80)}" — status: ${c.status}.`, data: c };
  },
};

const update_campaign: CopilotTool = {
  name: "update_campaign",
  description: "Update a campaign's brief text or status. No id = most recent campaign.",
  parameters: {
    campaignId: { type: "string", description: "Campaign id. Omit for the most recent." },
    brief: { type: "string", description: "New brief text." },
    status: { type: "string", description: "New status (brief, concepts, hooks, captions, scheduled, launched, archived)." },
  },
  label: "Updating campaign…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const c = await findCampaign(args, ctx);
    if (!c) return { ok: false, summary: "No campaign found to update.", data: {} };
    const brief = pick(args, ["brief", "summary", "text"]);
    const status = pick(args, ["status", "stage"]);
    const sets: string[] = [];
    const binds: unknown[] = [];
    if (brief) { sets.push("brief = ?"); binds.push(brief); }
    if (status) { sets.push("status = ?"); binds.push(status); }
    if (!sets.length) return { ok: false, summary: "Nothing to update — give me a new brief or status.", data: {} };
    await ctx.db!.prepare(`UPDATE campaigns SET ${sets.join(", ")} WHERE id = ?`).bind(...binds, c.id).run();
    return { ok: true, summary: `Campaign updated${brief ? " (brief rewritten)" : ""}${status ? ` — now "${status}"` : ""}.`, data: { campaignId: c.id } };
  },
};

const delete_campaign: CopilotTool = {
  name: "delete_campaign",
  description: "Permanently delete a campaign and its concepts. Asks the user to confirm first — nothing is deleted until they say yes.",
  parameters: {
    campaignId: { type: "string", description: "Campaign id to delete.", required: true },
  },
  label: "Deleting campaign…",
  async run(args, ctx) {
    const id = pick(args, ["campaignId", "campaign_id", "id"]);
    if (!id) return { ok: false, summary: "Which campaign? I need its id.", data: {} };
    if (args.confirmed !== true) {
      return {
        ok: true,
        needs_confirmation: true,
        summary: `Delete this campaign and its concepts? This can't be undone.`,
        data: { confirmCard: { title: "Delete campaign?", details: [`Campaign id: ${id}`, "Its concepts will be deleted too."] } },
      };
    }
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    await ctx.db!.prepare("DELETE FROM concepts WHERE campaign_id = ?").bind(id).run();
    const r = await ctx.db!.prepare("DELETE FROM campaigns WHERE id = ? AND user_id = ?").bind(id, ctx.userId).run();
    if (!r.meta.changes) return { ok: false, summary: "Campaign not found.", data: {} };
    return { ok: true, summary: "Campaign deleted.", data: { campaignId: id } };
  },
};

const advance_campaign: CopilotTool = {
  name: "advance_campaign",
  description: "Move a campaign to its next workflow stage (brief → concepts → hooks → captions → scheduled → launched).",
  parameters: {
    campaignId: { type: "string", description: "Campaign id. Omit for the most recent." },
  },
  label: "Advancing campaign…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const c = await findCampaign(args, ctx);
    if (!c) return { ok: false, summary: "No campaign found.", data: {} };
    const i = CAMPAIGN_STAGES.indexOf(c.status as (typeof CAMPAIGN_STAGES)[number]);
    const next = i >= 0 && i < CAMPAIGN_STAGES.length - 1 ? CAMPAIGN_STAGES[i + 1] : "launched";
    await ctx.db!.prepare("UPDATE campaigns SET status = ? WHERE id = ?").bind(next, c.id).run();
    return { ok: true, summary: `Campaign moved from "${c.status}" to "${next}".`, data: { campaignId: c.id, from: c.status, to: next } };
  },
};

const duplicate_campaign: CopilotTool = {
  name: "duplicate_campaign",
  description: "Copy a campaign as a brand-new campaign (same brief, fresh ids).",
  parameters: {
    campaignId: { type: "string", description: "Campaign id to copy. Omit for the most recent." },
  },
  label: "Duplicating campaign…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const c = await findCampaign(args, ctx);
    if (!c) return { ok: false, summary: "No campaign found to duplicate.", data: {} };
    const id = rid("cmp");
    await ctx.db!
      .prepare("INSERT INTO campaigns (id, user_id, brand_id, brief, status, payload) VALUES (?, ?, ?, ?, 'brief', ?)")
      .bind(id, ctx.userId, ctx.brand.id, c.brief, JSON.stringify(c.payload))
      .run();
    return { ok: true, summary: "Campaign duplicated as a fresh brief.", data: { campaignId: id } };
  },
};

const archive_campaign: CopilotTool = {
  name: "archive_campaign",
  description: "Archive a campaign so it leaves the active pipeline.",
  parameters: {
    campaignId: { type: "string", description: "Campaign id. Omit for the most recent." },
  },
  label: "Archiving campaign…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const c = await findCampaign(args, ctx);
    if (!c) return { ok: false, summary: "No campaign found.", data: {} };
    await ctx.db!.prepare("UPDATE campaigns SET status = 'archived' WHERE id = ?").bind(c.id).run();
    return { ok: true, summary: "Campaign archived.", data: { campaignId: c.id } };
  },
};

const search_campaigns: CopilotTool = {
  name: "search_campaigns",
  description: "Search campaigns by keyword in the brief text.",
  parameters: {
    query: { type: "string", description: "Keyword to search for.", required: true },
  },
  label: "Searching campaigns…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const q = pick(args, ["query", "q", "keyword", "term"]);
    if (!q) return { ok: false, summary: "What should I search for?", data: {} };
    const rows = await ctx.db!
      .prepare("SELECT id, brief, status, created_at FROM campaigns WHERE user_id = ? AND brief LIKE ? ORDER BY created_at DESC LIMIT 20")
      .bind(ctx.userId, `%${q}%`)
      .all();
    const list = (rows.results ?? []) as { id: string; brief: string; status: string; created_at: string }[];
    return { ok: true, summary: list.length ? `${list.length} campaign(s) matching "${q}".` : `Nothing matched "${q}".`, data: { campaigns: list } };
  },
};

const campaign_checklist: CopilotTool = {
  name: "campaign_checklist",
  description: "Get the concrete next steps for a campaign based on where it stands.",
  parameters: {
    campaignId: { type: "string", description: "Campaign id. Omit for the most recent." },
  },
  label: "Building checklist…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const c = await findCampaign(args, ctx);
    if (!c) return { ok: false, summary: "No campaign found.", data: {} };
    const steps: Record<string, string[]> = {
      brief: ["Generate concepts for this brief", "Score the hooks", "Write captions", "Propose a posting schedule"],
      concepts: ["Score the hooks", "Pick the winning concept", "Write captions", "Propose a posting schedule"],
      hooks: ["Write captions for the winning hooks", "Propose a posting schedule"],
      captions: ["Propose a posting schedule", "Confirm the schedule with the user"],
      scheduled: ["Review the queue for gaps", "Check analytics after posts go live"],
      launched: ["Review analytics", "Double down on what worked", "Plan the next campaign"],
      archived: ["Duplicate it to revive the idea"],
    };
    const next = steps[c.status] ?? ["Generate concepts", "Write captions", "Schedule posts"];
    return { ok: true, summary: `Campaign is at "${c.status}". Next: ${next[0]}.`, data: { campaignId: c.id, status: c.status, nextSteps: next } };
  },
};

const brief_from_idea: CopilotTool = {
  name: "brief_from_idea",
  description: "Turn a rough idea into a full structured brief and save it as a campaign.",
  parameters: {
    idea: { type: "string", description: "The rough idea in the user's own words.", required: true },
  },
  label: "Turning idea into brief…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const idea = pick(args, ["idea", "text", "brief", "summary"]);
    if (!idea) return { ok: false, summary: "Give me the rough idea first.", data: {} };
    const expanded = await aiText(
      ctx,
      "You are an ad strategist. Expand a rough idea into a tight creative brief: product, audience, goal, offer, key message, platforms. Keep it under 120 words, no fluff.",
      `${brandLine(ctx.brand)}\nRough idea: ${idea}`
    );
    const brief = expanded || idea;
    const id = rid("cmp");
    await ctx.db!
      .prepare("INSERT INTO campaigns (id, user_id, brand_id, brief, status, payload) VALUES (?, ?, ?, ?, 'brief', ?)")
      .bind(id, ctx.userId, ctx.brand.id, brief, JSON.stringify({ idea }))
      .run();
    return { ok: true, summary: "Brief written and saved.", data: { campaignId: id, brief } };
  },
};

const campaign_timeline: CopilotTool = {
  name: "campaign_timeline",
  description: "Suggest a realistic day-by-day timeline from brief to launch for a campaign.",
  parameters: {
    campaignId: { type: "string", description: "Campaign id. Omit for the most recent." },
    days: { type: "string", description: "How many days until launch (default 7)." },
  },
  label: "Planning timeline…",
  async run(args, ctx) {
    const c = ctx.db && ctx.userId ? await findCampaign(args, ctx) : null;
    const days = Math.max(1, Math.min(30, parseInt(pick(args, ["days", "duration"], "7"), 10) || 7));
    const brief = c?.brief ?? pick(args, ["brief", "summary", "idea", "campaign"], "a new ad campaign");
    const plan = await aiText(
      ctx,
      `You are an ad producer. Reply with a day-by-day timeline as short lines like "Day 1 (2026-10-02): ...". ${days} days total, ending at launch. Keep each line under 15 words.`,
      `${brandLine(ctx.brand)}\nCampaign: ${brief}\nStart date: ${todayIso()}\nDays: ${days}`
    );
    const fallback = Array.from({ length: days }, (_, i) => {
      const d = addDaysIso(todayIso(), i);
      const labels = ["Brief + concepts", "Hooks + scoring", "Captions", "Creative review", "Scheduling", "Final QA", "Launch"];
      return `Day ${i + 1} (${d}): ${labels[Math.min(i, labels.length - 1)]}`;
    }).join("\n");
    return { ok: true, summary: `A ${days}-day timeline is ready.`, data: { timeline: plan || fallback, campaignId: c?.id ?? null } };
  },
};

const campaign_assets: CopilotTool = {
  name: "campaign_assets",
  description: "List everything a campaign has produced so far: concepts, hooks, scheduled posts.",
  parameters: {
    campaignId: { type: "string", description: "Campaign id. Omit for the most recent." },
  },
  label: "Gathering assets…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const c = await findCampaign(args, ctx);
    if (!c) return { ok: false, summary: "No campaign found.", data: {} };
    const concepts = await ctx.db!
      .prepare("SELECT id, title, headline, hook_score, created_at FROM concepts WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 30")
      .bind(c.id)
      .all();
    const posts = await ctx.db!
      .prepare("SELECT id, network, scheduled_at, status FROM scheduled_posts WHERE user_id = ? AND payload LIKE ? ORDER BY scheduled_at LIMIT 30")
      .bind(ctx.userId, `%${c.id}%`)
      .all();
    return {
      ok: true,
      summary: `Campaign assets: ${(concepts.results ?? []).length} concepts, ${(posts.results ?? []).length} scheduled posts.`,
      data: { campaignId: c.id, concepts: concepts.results ?? [], scheduledPosts: posts.results ?? [] },
    };
  },
};

export const campaignTools: CopilotTool[] = [
  get_campaign,
  update_campaign,
  delete_campaign,
  advance_campaign,
  duplicate_campaign,
  archive_campaign,
  search_campaigns,
  campaign_checklist,
  brief_from_idea,
  campaign_timeline,
  campaign_assets,
];
