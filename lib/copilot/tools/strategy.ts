/**
 * Strategy tools — audiences, positioning, funnels, budgets, launch plans.
 */
import {
  type CopilotTool,
  pick,
  brandLine,
  aiText,
  aiJson,
} from "../toolutil";

const SYS = "You are a growth strategist. Concrete, opinionated, no textbook filler. Every recommendation must be actionable this week.";

function lines(text: string, n: number): string[] {
  return text.split("\n").map((l) => l.replace(/^[\d\-•*.)\s]+/, "").trim()).filter((l) => l.length > 2).slice(0, n);
}

const audience_personas: CopilotTool = {
  name: "audience_personas",
  description: "Build 3 sharp audience personas for the brand with pains, desires, and where they scroll.",
  parameters: {
    product: { type: "string", description: "Product or campaign to build personas for." },
  },
  label: "Profiling audiences…",
  async run(args, ctx) {
    const product = pick(args, ["product", "topic", "campaign", "brief"]) || ctx.brand.name;
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nBuild 3 audience personas for: ${product}.\nEach: name, age/life, core pain, core desire, where they scroll, what creative hooks them. Keep each persona to 4 lines.`
    );
    if (!text) return { ok: false, summary: "Couldn't build personas right now.", data: {} };
    return { ok: true, summary: "3 personas ready.", data: { personas: text.trim() } };
  },
};

const channel_mix: CopilotTool = {
  name: "channel_mix",
  description: "Recommend where to spend creative energy across channels for a goal.",
  parameters: {
    goal: { type: "string", description: "e.g. launch hype, sales, brand awareness.", required: true },
  },
  label: "Mixing channels…",
  async run(args, ctx) {
    const goal = pick(args, ["goal", "objective", "aim"]);
    if (!goal) return { ok: false, summary: "What's the goal?", data: {} };
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nGoal: ${goal}.\nRecommend a channel mix (Instagram, TikTok, X, YouTube Shorts): percentage of effort each, what format wins on each, and one line why. Under 120 words.`
    );
    if (!text) return { ok: false, summary: "Couldn't mix right now.", data: {} };
    return { ok: true, summary: "Channel mix ready.", data: { mix: text.trim(), goal } };
  },
};

const funnel_plan: CopilotTool = {
  name: "funnel_plan",
  description: "Plan a simple 3-stage funnel: hook content → nurture → convert.",
  parameters: {
    offer: { type: "string", description: "The offer at the bottom of the funnel.", required: true },
  },
  label: "Building funnel…",
  async run(args, ctx) {
    const offer = pick(args, ["offer", "product", "goal"]);
    if (!offer) return { ok: false, summary: "What's the offer?", data: {} };
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nPlan a 3-stage content funnel for: ${offer}.\nStage 1 (attract): 2 content ideas. Stage 2 (nurture): 2 ideas. Stage 3 (convert): the offer framing + CTA. Keep it tight.`
    );
    if (!text) return { ok: false, summary: "Couldn't plan right now.", data: {} };
    return { ok: true, summary: "Funnel plan ready.", data: { funnel: text.trim() } };
  },
};

const budget_split: CopilotTool = {
  name: "budget_split",
  description: "Suggest how to split a paid budget across platforms and funnel stages.",
  parameters: {
    budget: { type: "string", description: "Total budget, e.g. $500 or Rs 100000.", required: true },
    goal: { type: "string", description: "Campaign goal." },
  },
  label: "Splitting budget…",
  async run(args, ctx) {
    const budget = pick(args, ["budget", "amount", "spend"]);
    if (!budget) return { ok: false, summary: "What's the budget?", data: {} };
    const goal = pick(args, ["goal", "objective"]) || "conversions";
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nBudget: ${budget}. Goal: ${goal}.\nSuggest a split across platforms and funnel stages with percentages and one-line rationale each. Under 120 words.`
    );
    if (!text) return { ok: false, summary: "Couldn't split right now.", data: {} };
    return { ok: true, summary: "Budget split ready.", data: { split: text.trim(), budget, goal } };
  },
};

const launch_checklist: CopilotTool = {
  name: "launch_checklist",
  description: "A complete launch-day checklist: creative, copy, tracking, and timing.",
  parameters: {
    launch: { type: "string", description: "What's launching." },
  },
  label: "Building checklist…",
  async run(args, ctx) {
    const launch = pick(args, ["launch", "product", "campaign", "topic"]) || "the campaign";
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nLaunching: ${launch}.\nWrite a launch-day checklist: 10 items across creative, copy, scheduling, and measurement. Each item one line, checkbox style.`
    );
    const items = lines(text, 12);
    if (!items.length) return { ok: false, summary: "Couldn't build it right now.", data: {} };
    return { ok: true, summary: `Launch checklist: ${items.length} items.`, data: { items } };
  },
};

const campaign_name_ideas: CopilotTool = {
  name: "campaign_name_ideas",
  description: "Name the campaign — internal codename + public-facing title ideas.",
  parameters: {
    brief: { type: "string", description: "Campaign brief.", required: true },
    count: { type: "string", description: "How many (default 6)." },
  },
  label: "Naming…",
  async run(args, ctx) {
    const brief = pick(args, ["brief", "campaign", "topic", "idea", "summary"]);
    if (!brief) return { ok: false, summary: "What's the campaign about?", data: {} };
    const count = Math.max(3, Math.min(10, parseInt(pick(args, ["count", "n"], "6"), 10) || 6));
    const text = await aiText(
      ctx,
      "You name campaigns like albums. Memorable, short, on-brand.",
      `${brandLine(ctx.brand)}\nCampaign: ${brief}\nSuggest ${count} campaign names (internal codename style). One per line, no numbering.`
    );
    const out = lines(text, count);
    if (!out.length) return { ok: false, summary: "Couldn't name it right now.", data: {} };
    return { ok: true, summary: `${out.length} names ready.`, data: { names: out } };
  },
};

const offer_angles: CopilotTool = {
  name: "offer_angles",
  description: "Reframe one offer 6 different ways (discount, bonus, bundle, urgency, guarantee, exclusivity).",
  parameters: {
    offer: { type: "string", description: "The offer.", required: true },
  },
  label: "Reframing offer…",
  async run(args, ctx) {
    const offer = pick(args, ["offer", "deal", "product", "promo"]);
    if (!offer) return { ok: false, summary: "What's the offer?", data: {} };
    const angles = await aiJson<{ angles: { frame: string; copy: string }[] }>(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nOffer: ${offer}\nReframe it 6 ways: discount, bonus, bundle, urgency, guarantee, exclusivity.\nReply with JSON: {"angles": [{"frame": "...", "copy": "..."}]}`
    );
    if (!angles?.angles?.length) return { ok: false, summary: "Couldn't reframe right now.", data: {} };
    return { ok: true, summary: `${angles.angles.length} offer angles ready.`, data: angles };
  },
};

const objection_handling: CopilotTool = {
  name: "objection_handling",
  description: "List the top objections to an offer and the one-line copy that neutralizes each.",
  parameters: {
    offer: { type: "string", description: "The offer or product.", required: true },
  },
  label: "Handling objections…",
  async run(args, ctx) {
    const offer = pick(args, ["offer", "product", "campaign"]);
    if (!offer) return { ok: false, summary: "What's the offer?", data: {} };
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nFor: ${offer}\nList the 5 most likely buyer objections, each with a one-line copy rebuttal. Format: "Objection → Rebuttal".`
    );
    const out = lines(text, 10);
    if (!out.length) return { ok: false, summary: "Couldn't analyze right now.", data: {} };
    return { ok: true, summary: `${out.length} objections handled.`, data: { objections: out } };
  },
};

export const strategyTools: CopilotTool[] = [
  audience_personas,
  channel_mix,
  funnel_plan,
  budget_split,
  launch_checklist,
  campaign_name_ideas,
  offer_angles,
  objection_handling,
];
