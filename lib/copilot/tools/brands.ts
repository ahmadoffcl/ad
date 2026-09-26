/**
 * Brand kit tools — manage brands, voice, positioning, compliance.
 */
import type { Brand } from "@/lib/types";
import {
  type CopilotTool,
  rid,
  str,
  pick,
  needDb,
  brandLine,
  aiText,
  aiJson,
} from "../toolutil";

interface BrandRow {
  id: string;
  name: string;
  tagline: string;
  industry: string;
  colors: string;
  fonts: string;
  tone: string;
  voice: string;
  banned: string;
}

function rowToBrand(r: BrandRow): { id: string; name: string; tagline: string; industry: string; tone: string } {
  return { id: r.id, name: r.name, tagline: r.tagline, industry: r.industry, tone: r.tone };
}

async function listBrandRows(ctx: Parameters<CopilotTool["run"]>[1]): Promise<BrandRow[]> {
  if (!ctx.db || !ctx.userId) return [];
  const res = await ctx.db
    .prepare("SELECT id, name, tagline, industry, colors, fonts, tone, voice, banned FROM brands WHERE user_id = ? ORDER BY created_at")
    .bind(ctx.userId)
    .all();
  return ((res.results ?? []) as unknown) as BrandRow[];
}

const get_brand: CopilotTool = {
  name: "get_brand",
  description: "Get the active brand's full kit: tagline, industry, colors, tone, voice, banned words.",
  parameters: {},
  label: "Reading brand kit…",
  async run(args, ctx) {
    const b = ctx.brand;
    return {
      ok: true,
      summary: `${b.name} — ${b.tagline || "no tagline set"}.`,
      data: {
        id: b.id, name: b.name, tagline: b.tagline, industry: b.industry,
        colors: b.colors, fonts: { display: b.displayFont, body: b.bodyFont },
        tone: b.tone, voice: b.voice, banned: b.banned,
      },
    };
  },
};

const list_brands: CopilotTool = {
  name: "list_brands",
  description: "List all brands in the workspace.",
  parameters: {},
  label: "Listing brands…",
  async run(args, ctx) {
    const rows = await listBrandRows(ctx);
    if (!rows.length) {
      return { ok: true, demo: !ctx.db, summary: `Only brand here is ${ctx.brand.name}.`, data: { brands: [{ id: ctx.brand.id, name: ctx.brand.name, active: true }] } };
    }
    return {
      ok: true,
      summary: `${rows.length} brand(s).`,
      data: { brands: rows.map((r) => ({ ...rowToBrand(r), active: r.id === ctx.brand.id })) },
    };
  },
};

const create_brand: CopilotTool = {
  name: "create_brand",
  description: "Create a new brand with name, tagline, industry, and tone.",
  parameters: {
    name: { type: "string", description: "Brand name.", required: true },
    tagline: { type: "string", description: "Tagline." },
    industry: { type: "string", description: "Industry." },
    tone: { type: "string", description: "Tone of voice." },
  },
  label: "Creating brand…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const name = pick(args, ["name", "brand", "brandName"]);
    if (!name) return { ok: false, summary: "What's the brand called?", data: {} };
    const id = rid("brand");
    await ctx.db!
      .prepare("INSERT INTO brands (id, user_id, name, tagline, industry, tone) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, ctx.userId, name, pick(args, ["tagline", "slogan"]), pick(args, ["industry", "sector", "category"]), pick(args, ["tone", "voice_tone"]))
      .run();
    return { ok: true, summary: `Brand "${name}" created.`, data: { brandId: id, name } };
  },
};

const update_brand: CopilotTool = {
  name: "update_brand",
  description: "Update the active brand's tagline, industry, tone, or voice notes.",
  parameters: {
    tagline: { type: "string", description: "New tagline." },
    industry: { type: "string", description: "New industry." },
    tone: { type: "string", description: "New tone." },
    voice: { type: "string", description: "Voice notes, separated by semicolons." },
    banned: { type: "string", description: "Banned words/phrases, comma-separated." },
  },
  label: "Updating brand…",
  async run(args, ctx) {
    const blocked = needDb(ctx);
    if (blocked) return blocked;
    const sets: string[] = [];
    const binds: unknown[] = [];
    const tagline = pick(args, ["tagline", "slogan"]);
    const industry = pick(args, ["industry", "sector"]);
    const tone = pick(args, ["tone"]);
    const voice = pick(args, ["voice", "voiceNotes"]);
    const banned = pick(args, ["banned", "bannedWords", "neverSay"]);
    if (tagline) { sets.push("tagline = ?"); binds.push(tagline); }
    if (industry) { sets.push("industry = ?"); binds.push(industry); }
    if (tone) { sets.push("tone = ?"); binds.push(tone); }
    if (voice) { sets.push("voice = ?"); binds.push(JSON.stringify(voice.split(";").map((s) => s.trim()).filter(Boolean))); }
    if (banned) { sets.push("banned = ?"); binds.push(JSON.stringify(banned.split(",").map((s) => s.trim()).filter(Boolean))); }
    if (!sets.length) return { ok: false, summary: "What should I change? (tagline, industry, tone, voice, banned words)", data: {} };
    await ctx.db!.prepare(`UPDATE brands SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`).bind(...binds, ctx.brand.id, ctx.userId).run();
    return { ok: true, summary: "Brand kit updated.", data: { updated: sets.map((s) => s.split(" ")[0]) } };
  },
};

const set_active_brand: CopilotTool = {
  name: "set_active_brand",
  description: "Switch the active brand by name or id. Returns the brand so the app can switch.",
  parameters: {
    brand: { type: "string", description: "Brand name or id.", required: true },
  },
  label: "Switching brand…",
  async run(args, ctx) {
    const q = pick(args, ["brand", "name", "brandName", "brandId", "id"]).toLowerCase();
    if (!q) return { ok: false, summary: "Which brand?", data: {} };
    const rows = await listBrandRows(ctx);
    const match = rows.find((r) => r.id.toLowerCase() === q || r.name.toLowerCase().includes(q));
    if (!match) {
      const names = rows.map((r) => r.name).join(", ");
      return { ok: false, summary: rows.length ? `No brand matching that. I see: ${names}.` : "No other brands found.", data: {} };
    }
    return { ok: true, summary: `Switching to ${match.name}.`, data: { brandId: match.id, name: match.name, switch: true } };
  },
};

const brand_voice_check: CopilotTool = {
  name: "brand_voice_check",
  description: "Check whether a piece of copy actually sounds like the brand. Returns a verdict + fixes.",
  parameters: {
    copy: { type: "string", description: "The copy to check.", required: true },
  },
  label: "Checking voice…",
  async run(args, ctx) {
    const copy = pick(args, ["copy", "text", "caption", "content"]);
    if (!copy) return { ok: false, summary: "What copy should I check?", data: {} };
    const verdict = await aiJson<{ score: number; verdict: string; fixes: string[] }>(
      ctx,
      "You are a brand voice editor. Judge honestly.",
      `${brandLine(ctx.brand)}\nDoes this copy sound like the brand? Score 0-100.\nCopy: "${copy}"\nReply with JSON: {"score": 0-100, "verdict": "one line", "fixes": ["fix 1", "fix 2"]}`
    );
    if (!verdict) {
      const bannedHit = (ctx.brand.banned ?? []).find((w) => copy.toLowerCase().includes(w.toLowerCase()));
      return {
        ok: true,
        summary: bannedHit ? `Voice check: banned phrase "${bannedHit}" found.` : "Voice check passed (deterministic).",
        data: { score: bannedHit ? 40 : 80, bannedHit: bannedHit ?? null },
      };
    }
    return { ok: true, summary: `Voice score: ${verdict.score}/100 — ${verdict.verdict}`, data: verdict };
  },
};

const suggest_taglines: CopilotTool = {
  name: "suggest_taglines",
  description: "Suggest fresh taglines for the brand.",
  parameters: {
    count: { type: "string", description: "How many (default 6)." },
    direction: { type: "string", description: "Creative direction." },
  },
  label: "Writing taglines…",
  async run(args, ctx) {
    const count = Math.max(3, Math.min(12, parseInt(pick(args, ["count", "n"], "6"), 10) || 6));
    const direction = pick(args, ["direction", "style", "vibe"]);
    const text = await aiText(
      ctx,
      "You write taglines agencies would kill for. Short. Memorable. No clichés.",
      `${brandLine(ctx.brand)}\nWrite ${count} taglines for this brand.${direction ? ` Direction: ${direction}.` : ""}\nOne per line, no numbering.`
    );
    const out = text.split("\n").map((l) => l.replace(/^[\d\-•*.)\s]+/, "").trim()).filter((l) => l.length > 2).slice(0, count);
    if (!out.length) return { ok: false, summary: "Couldn't write taglines right now.", data: {} };
    return { ok: true, summary: `${out.length} taglines ready.`, data: { taglines: out } };
  },
};

const brand_positioning: CopilotTool = {
  name: "brand_positioning",
  description: "Get a sharp positioning statement: who it's for, what it does differently, why it wins.",
  parameters: {
    competitor: { type: "string", description: "Main competitor to position against." },
  },
  label: "Positioning brand…",
  async run(args, ctx) {
    const competitor = pick(args, ["competitor", "vs", "against"]);
    const text = await aiText(
      ctx,
      "You are a brand strategist. Positioning must be specific and ownable — never 'high quality' or 'customer focused'.",
      `${brandLine(ctx.brand)}\nWrite a positioning statement for this brand${competitor ? ` against ${competitor}` : ""}.\nFormat: FOR [audience] WHO [need], [BRAND] IS [category] THAT [difference] BECAUSE [proof]. Then one line on why it wins.`
    );
    if (!text) return { ok: false, summary: "Couldn't position right now.", data: {} };
    return { ok: true, summary: "Positioning ready.", data: { positioning: text.trim() } };
  },
};

const compliance_check: CopilotTool = {
  name: "compliance_check",
  description: "Scan copy for banned words, risky claims, and platform red flags.",
  parameters: {
    copy: { type: "string", description: "The copy to scan.", required: true },
  },
  label: "Scanning for risks…",
  async run(args, ctx) {
    const copy = pick(args, ["copy", "text", "caption", "content", "ad"]);
    if (!copy) return { ok: false, summary: "What copy should I scan?", data: {} };
    const lower = copy.toLowerCase();
    const issues: string[] = [];
    for (const w of ctx.brand.banned ?? []) {
      if (w && lower.includes(w.toLowerCase())) issues.push(`Banned phrase: "${w}"`);
    }
    const risky = ["guaranteed", "miracle", "#1", "best in the world", "risk-free", "doctors hate", "you won't believe"];
    for (const r of risky) {
      if (lower.includes(r)) issues.push(`Risky claim: "${r}" — may trigger ad rejection or erode trust`);
    }
    if (/(.)\1{3,}/.test(copy)) issues.push("Excessive character repetition looks spammy");
    const emojiCount = (copy.match(/[\u{1F300}-\u{1FAFF}]/gu) ?? []).length;
    if (emojiCount > 4) issues.push(`${emojiCount} emojis — more than 4 reads as spam`);
    return {
      ok: true,
      summary: issues.length ? `${issues.length} issue(s) found.` : "Clean — no issues found.",
      data: { issues, passed: !issues.length },
    };
  },
};

const brand_story: CopilotTool = {
  name: "brand_story",
  description: "Write a short brand story / about blurb for bios and profiles.",
  parameters: {
    length: { type: "string", description: "'short' (bio, ~30 words) or 'long' (~100 words)." },
  },
  label: "Writing brand story…",
  async run(args, ctx) {
    const length = pick(args, ["length", "size"]) || "short";
    const words = length === "long" ? 100 : 30;
    const text = await aiText(
      ctx,
      "You write brand stories with a pulse. Specific, human, no corporate filler.",
      `${brandLine(ctx.brand)}\nWrite a brand story, ~${words} words, suitable for a social bio${length === "long" ? " or about page" : ""}.`
    );
    if (!text) return { ok: false, summary: "Couldn't write it right now.", data: {} };
    return { ok: true, summary: "Brand story ready.", data: { story: text.trim() } };
  },
};

export const brandTools: CopilotTool[] = [
  get_brand,
  list_brands,
  create_brand,
  update_brand,
  set_active_brand,
  brand_voice_check,
  suggest_taglines,
  brand_positioning,
  compliance_check,
  brand_story,
];

/** Re-exported so the chat route can hydrate a full Brand from D1. */
export type { Brand };
