/**
 * Trend radar tools — turn cultural moments into ad angles.
 * AI-backed; honest about being insight, not live social listening.
 */
import {
  type CopilotTool,
  pick,
  brandLine,
  aiText,
  aiJson,
  todayIso,
} from "../toolutil";

const SYS = "You are a trend analyst for advertisers. Specific and current-thinking. Name real formats and behaviors, not vague 'authenticity' talk.";

function lines(text: string, n: number): string[] {
  return text.split("\n").map((l) => l.replace(/^[\d\-•*.)\s]+/, "").trim()).filter((l) => l.length > 2).slice(0, n);
}

const trend_angle: CopilotTool = {
  name: "trend_angle",
  description: "Turn a trend into a concrete ad angle for the brand.",
  parameters: {
    trend: { type: "string", description: "The trend to ride.", required: true },
  },
  label: "Finding the angle…",
  async run(args, ctx) {
    const trend = pick(args, ["trend", "topic", "moment"]);
    if (!trend) return { ok: false, summary: "Which trend?", data: {} };
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nTrend: ${trend}\nGive ONE concrete ad angle for this brand riding it: the hook, the format, and why it fits. Under 100 words.`
    );
    if (!text) return { ok: false, summary: "Couldn't find an angle right now.", data: {} };
    return { ok: true, summary: "Angle ready.", data: { trend, angle: text.trim() } };
  },
};

const trending_formats: CopilotTool = {
  name: "trending_formats",
  description: "What's working in short-form right now: formats the brand should try.",
  parameters: {
    niche: { type: "string", description: "Niche to focus on (defaults to brand industry)." },
  },
  label: "Scanning formats…",
  async run(args, ctx) {
    const niche = pick(args, ["niche", "industry", "category"]) || ctx.brand.industry || "general consumer";
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nList 6 short-form video formats trending right now in ${niche} that this brand should try.\nEach: format name + one-line why it works + fit for this brand. Under 150 words total.`
    );
    const out = lines(text, 8);
    if (!out.length) return { ok: false, summary: "Couldn't scan right now.", data: {} };
    return { ok: true, summary: `${out.length} formats to try.`, data: { formats: out, niche } };
  },
};

const trending_hashtags_now: CopilotTool = {
  name: "trending_hashtags_now",
  description: "Hashtag angles trending around the brand's niche right now.",
  parameters: {},
  label: "Checking hashtags…",
  async run(args, ctx) {
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nSuggest 10 hashtags trending around "${ctx.brand.industry || ctx.brand.name}" right now — mix of evergreen-niche and moment-driven.\nReply with ONLY hashtags, space-separated.`
    );
    const tags = (text.match(/#[\p{L}\p{N}_]+/gu) ?? []).slice(0, 10);
    if (!tags.length) return { ok: false, summary: "Couldn't check right now.", data: {} };
    return { ok: true, summary: `${tags.length} trending tags.`, data: { hashtags: tags } };
  },
};

const seasonal_moments: CopilotTool = {
  name: "seasonal_moments",
  description: "Upcoming seasonal/cultural moments the brand can plan campaigns around.",
  parameters: {
    months: { type: "string", description: "How many months ahead (default 3)." },
  },
  label: "Looking ahead…",
  async run(args, ctx) {
    const months = Math.max(1, Math.min(6, parseInt(pick(args, ["months", "n"], "3"), 10) || 3));
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nToday is ${todayIso()}. List the key seasonal/cultural/commerce moments in the next ${months} months relevant to ${ctx.brand.industry || "consumer brands"}, each with a one-line campaign idea for this brand.`
    );
    if (!text) return { ok: false, summary: "Couldn't look ahead right now.", data: {} };
    return { ok: true, summary: "Seasonal calendar ready.", data: { moments: text.trim() } };
  },
};

const competitor_angle: CopilotTool = {
  name: "competitor_angle",
  description: "Generate ad angles that position against a named competitor.",
  parameters: {
    competitor: { type: "string", description: "Competitor name.", required: true },
    count: { type: "string", description: "How many angles (default 5)." },
  },
  label: "Studying the rival…",
  async run(args, ctx) {
    const competitor = pick(args, ["competitor", "rival", "vs", "brand"]);
    if (!competitor) return { ok: false, summary: "Which competitor?", data: {} };
    const count = Math.max(3, Math.min(10, parseInt(pick(args, ["count", "n"], "5"), 10) || 5));
    const text = await aiText(
      ctx,
      SYS + " Never trash-talk; win on sharp differentiation. No false claims.",
      `${brandLine(ctx.brand)}\nWrite ${count} ad angles positioning this brand against ${competitor}.\nEach: the angle + one-line rationale. One per line group, no numbering.`
    );
    const out = lines(text, count * 2);
    if (!out.length) return { ok: false, summary: "Couldn't generate angles right now.", data: {} };
    return { ok: true, summary: `${count} competitor angles ready.`, data: { competitor, angles: out } };
  },
};

const niche_language: CopilotTool = {
  name: "niche_language",
  description: "How the brand's niche actually talks — words, phrases, and references to use (or avoid).",
  parameters: {},
  label: "Learning the lingo…",
  async run(args, ctx) {
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nFor the ${ctx.brand.industry || ctx.brand.name} niche: 8 words/phrases the community actually uses (use these), and 4 corporate-sounding phrases to avoid. Short list format.`
    );
    if (!text) return { ok: false, summary: "Couldn't analyze right now.", data: {} };
    return { ok: true, summary: "Niche language guide ready.", data: { guide: text.trim() } };
  },
};

const viral_hooks_deconstructed: CopilotTool = {
  name: "viral_hooks_deconstructed",
  description: "Deconstruct why viral hooks in the niche work, then write 5 in the same DNA for the brand.",
  parameters: {
    niche: { type: "string", description: "Niche (defaults to brand industry)." },
  },
  label: "Deconstructing virality…",
  async run(args, ctx) {
    const niche = pick(args, ["niche", "industry"]) || ctx.brand.industry || "consumer";
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nDeconstruct 3 hook patterns going viral in ${niche} right now (the psychology of each, one line), then write 5 hooks for THIS brand using those patterns.`
    );
    if (!text) return { ok: false, summary: "Couldn't deconstruct right now.", data: {} };
    return { ok: true, summary: "Viral DNA decoded + 5 hooks.", data: { analysis: text.trim(), niche } };
  },
};

const trend_lifespan: CopilotTool = {
  name: "trend_lifespan",
  description: "Judge whether a trend is early, peaking, or dead — and whether the brand should touch it.",
  parameters: {
    trend: { type: "string", description: "The trend to judge.", required: true },
  },
  label: "Timing the trend…",
  async run(args, ctx) {
    const trend = pick(args, ["trend", "topic"]);
    if (!trend) return { ok: false, summary: "Which trend?", data: {} };
    const verdict = await aiJson<{ stage: string; verdict: string; advice: string }>(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nTrend: "${trend}"\nJudge its lifespan stage and whether this brand should ride it.\nReply with JSON: {"stage": "early|peaking|fading|dead", "verdict": "one line", "advice": "one line"}`
    );
    if (!verdict?.stage) return { ok: false, summary: "Couldn't judge right now.", data: {} };
    return { ok: true, summary: `"${trend}" is ${verdict.stage} — ${verdict.verdict}`, data: { trend, ...verdict } };
  },
};

export const trendTools: CopilotTool[] = [
  trend_angle,
  trending_formats,
  trending_hashtags_now,
  seasonal_moments,
  competitor_angle,
  niche_language,
  viral_hooks_deconstructed,
  trend_lifespan,
];
