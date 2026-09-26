/**
 * Account tools — profile, plan, usage, API keys, preferences.
 */
import {
  type CopilotTool,
  rid,
  str,
  pick,
  needDb,
} from "../toolutil";

type Ctx = Parameters<CopilotTool["run"]>[1];

async function getProfile(ctx: Ctx): Promise<{ handle: string; workspace: string; role: string; plan: string; timezone: string } | null> {
  if (!ctx.db || !ctx.userId) return null;
  const row = await ctx.db.prepare("SELECT handle, workspace, role, plan, timezone FROM profiles WHERE user_id = ?").bind(ctx.userId).first();
  return (row as { handle: string; workspace: string; role: string; plan: string; timezone: string } | null) ?? null;
}

const get_profile: CopilotTool = {
  name: "get_profile",
  description: "Get the user's profile: handle, workspace, role, plan, timezone.",
  parameters: {},
  label: "Reading profile…",
  async run(args, ctx) {
    const p = await getProfile(ctx);
    if (!p) return { ok: true, demo: true, summary: "No profile saved yet.", data: {} };
    return { ok: true, summary: `${p.handle || "Unnamed"} — ${p.plan}.`, data: p };
  },
};

const update_profile: CopilotTool = {
  name: "update_profile",
  description: "Update the user's profile (name/handle, workspace, role, timezone).",
  parameters: {
    handle: { type: "string", description: "Display name or handle." },
    workspace: { type: "string", description: "Workspace name." },
    role: { type: "string", description: "Role." },
    timezone: { type: "string", description: "IANA timezone, e.g. Asia/Karachi." },
  },
  label: "Updating profile…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const sets: string[] = [];
    const binds: unknown[] = [];
    for (const [key, aliases] of [["handle", ["handle", "name"]], ["workspace", ["workspace"]], ["role", ["role"]], ["timezone", ["timezone", "tz"]]] as const) {
      const v = pick(args, aliases as unknown as string[]);
      if (v) { sets.push(`${key} = ?`); binds.push(v); }
    }
    if (!sets.length) return { ok: false, summary: "What should I update?", data: {} };
    await ctx.db!
      .prepare(`INSERT INTO profiles (user_id, ${sets.map((s) => s.split(" ")[0]).join(", ")}) VALUES (?, ${binds.map(() => "?").join(", ")}) ON CONFLICT(user_id) DO UPDATE SET ${sets.join(", ")}`)
      .bind(ctx.userId, ...binds)
      .run();
    return { ok: true, summary: "Profile updated.", data: {} };
  },
};

const get_plan: CopilotTool = {
  name: "get_plan",
  description: "Show the current plan and what it includes.",
  parameters: {},
  label: "Checking plan…",
  async run(args, ctx) {
    const p = await getProfile(ctx);
    const plan = p?.plan ?? "Forge Free";
    const perks: Record<string, string[]> = {
      "Forge Free": ["3 active campaigns", "AI concept generation", "Hook scoring", "Community support"],
      "Forge Pro": ["Unlimited campaigns", "Priority AI", "Advanced analytics", "API access"],
    };
    return { ok: true, demo: !p, summary: `You're on ${plan}.`, data: { plan, includes: perks[plan] ?? perks["Forge Free"] } };
  },
};

const get_usage: CopilotTool = {
  name: "get_usage",
  description: "Show usage this month: campaigns, concepts, scheduled posts, API keys.",
  parameters: {},
  label: "Tallying usage…",
  async run(args, ctx) {
    if (!ctx.db || !ctx.userId) return { ok: true, demo: true, summary: "Usage needs a real account.", data: {} };
    const month = new Date().toISOString().slice(0, 7);
    const counts: Record<string, number> = {};
    for (const [label, table] of [["campaigns", "campaigns"], ["concepts", "concepts"], ["scheduled_posts", "scheduled_posts"]] as const) {
      const r = await ctx.db.prepare(`SELECT COUNT(*) as n FROM ${table} WHERE user_id = ? AND substr(created_at, 1, 7) = ?`).bind(ctx.userId, month).first<{ n: number }>();
      counts[label] = r?.n ?? 0;
    }
    const keys = await ctx.db.prepare("SELECT COUNT(*) as n FROM api_keys WHERE user_id = ?").bind(ctx.userId).first<{ n: number }>();
    counts.api_keys = keys?.n ?? 0;
    return { ok: true, summary: `This month: ${counts.campaigns} campaigns, ${counts.concepts} concepts, ${counts.scheduled_posts} scheduled.`, data: { month, ...counts } };
  },
};

const list_api_keys: CopilotTool = {
  name: "list_api_keys",
  description: "List API keys (prefixes only — full keys are never shown again).",
  parameters: {},
  label: "Listing API keys…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const res = await ctx.db!
      .prepare("SELECT id, name, key_prefix, created_at, last_used_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC")
      .bind(ctx.userId)
      .all();
    const keys = (res.results ?? []) as { id: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null }[];
    return { ok: true, summary: keys.length ? `${keys.length} API key(s).` : "No API keys yet.", data: { keys } };
  },
};

const create_api_key: CopilotTool = {
  name: "create_api_key",
  description: "Create a new API key. The full key is shown ONCE — tell the user to copy it.",
  parameters: {
    name: { type: "string", description: "Key name, e.g. 'zapier'.", required: true },
  },
  label: "Creating API key…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const name = pick(args, ["name", "label"]);
    if (!name) return { ok: false, summary: "What should I name the key?", data: {} };
    const secret = `af_${rid("key").replace("key_", "")}${Math.random().toString(36).slice(2, 10)}`;
    const id = rid("apikey");
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
    const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    await ctx.db!
      .prepare("INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash) VALUES (?, ?, ?, ?, ?)")
      .bind(id, ctx.userId, name, secret.slice(0, 8), hash)
      .run();
    return {
      ok: true,
      summary: `Key "${name}" created — copy it now, it won't be shown again.`,
      data: { id, name, key: secret, prefix: secret.slice(0, 8), warning: "Store this key securely. It cannot be retrieved later." },
    };
  },
};

const revoke_api_key: CopilotTool = {
  name: "revoke_api_key",
  description: "Revoke an API key by id or name.",
  parameters: {
    key: { type: "string", description: "Key id or name.", required: true },
  },
  label: "Revoking key…",
  needsConfirmation: true,
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const q = pick(args, ["key", "id", "name", "keyId"]);
    if (!q) return { ok: false, summary: "Which key?", data: {} };
    const r = await ctx.db!.prepare("DELETE FROM api_keys WHERE user_id = ? AND (id = ? OR name = ?)").bind(ctx.userId, q, q).run();
    if (!r.meta.changes) return { ok: false, summary: "Key not found.", data: {} };
    return { ok: true, summary: "Key revoked.", data: {} };
  },
};

const notification_prefs: CopilotTool = {
  name: "notification_prefs",
  description: "Read or update notification preferences (digest frequency, launch alerts).",
  parameters: {
    digest: { type: "string", description: "'daily', 'weekly', or 'off'." },
    launchAlerts: { type: "string", description: "'on' or 'off'." },
  },
  label: "Checking notifications…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const digest = pick(args, ["digest", "frequency"]);
    const launchAlerts = pick(args, ["launchAlerts", "alerts"]);
    const p = await getProfile(ctx);
    let settings: Record<string, unknown> = {};
    try { settings = JSON.parse(str((p as unknown as { settings?: string } | null)?.settings ?? "{}")); } catch { /* keep */ }
    const notif = { digest: "weekly", launchAlerts: true, ...(settings.notifications as Record<string, unknown> | undefined) };
    if (!digest && !launchAlerts) {
      return { ok: true, summary: "Notification preferences.", data: { notifications: notif } };
    }
    if (digest && ["daily", "weekly", "off"].includes(digest)) notif.digest = digest;
    if (launchAlerts) notif.launchAlerts = launchAlerts === "on";
    settings.notifications = notif;
    await ctx.db!
      .prepare("INSERT INTO profiles (user_id, settings) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET settings = ?")
      .bind(ctx.userId, JSON.stringify(settings), JSON.stringify(settings))
      .run();
    return { ok: true, summary: "Notification preferences updated.", data: { notifications: notif } };
  },
};

export const accountTools: CopilotTool[] = [
  get_profile,
  update_profile,
  get_plan,
  get_usage,
  list_api_keys,
  create_api_key,
  revoke_api_key,
  notification_prefs,
];
