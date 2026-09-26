/**
 * Creative tools — headlines, hooks, CTAs, scripts, visual direction.
 * AI-backed with deterministic fallbacks so they always produce something.
 */
import { scoreHook } from "@/lib/hookScore";
import {
  type CopilotTool,
  str,
  pick,
  brandLine,
  aiText,
  aiJson,
} from "../toolutil";

const SYS = "You are a world-class direct-response ad creative. Short, punchy, specific. No clichés, no emojis unless asked, no generic AI filler. Every line must earn its place.";

function lines(text: string, n: number): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[\d\-•*.)\s]+/, "").trim())
    .filter((l) => l.length > 2)
    .slice(0, n);
}

const generate_headlines: CopilotTool = {
  name: "generate_headlines",
  description: "Generate punchy ad headlines for a product or campaign.",
  parameters: {
    topic: { type: "string", description: "Product, offer, or campaign to write headlines for.", required: true },
    count: { type: "string", description: "How many (default 8)." },
    style: { type: "string", description: "e.g. bold, playful, luxury, urgent." },
  },
  label: "Writing headlines…",
  async run(args, ctx) {
    const topic = pick(args, ["topic", "product", "campaign", "brief", "idea"]);
    if (!topic) return { ok: false, summary: "What are the headlines for?", data: {} };
    const count = Math.max(3, Math.min(15, parseInt(pick(args, ["count", "n"], "8"), 10) || 8));
    const style = pick(args, ["style", "tone", "vibe"]);
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nWrite ${count} ad headlines for: ${topic}.${style ? ` Style: ${style}.` : ""}\nOne per line, no numbering.`
    );
    const out = lines(text, count);
    if (!out.length) return { ok: false, summary: "Couldn't generate headlines right now.", data: {} };
    return { ok: true, summary: `${out.length} headlines ready.`, data: { headlines: out } };
  },
};

const improve_headline: CopilotTool = {
  name: "improve_headline",
  description: "Rewrite one headline to be sharper, with a note on what changed.",
  parameters: {
    headline: { type: "string", description: "The headline to improve.", required: true },
  },
  label: "Sharpening headline…",
  async run(args, ctx) {
    const headline = pick(args, ["headline", "text", "line", "hook"]);
    if (!headline) return { ok: false, summary: "Which headline should I improve?", data: {} };
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nImprove this headline: "${headline}"\nReply: the improved headline on line 1, then one short line explaining what changed.`
    );
    const out = lines(text, 3);
    if (!out.length) return { ok: false, summary: "Couldn't improve it right now.", data: {} };
    return { ok: true, summary: `Improved: "${out[0]}"`, data: { original: headline, improved: out[0], note: out[1] ?? "" } };
  },
};

const suggest_ctas: CopilotTool = {
  name: "suggest_ctas",
  description: "Suggest call-to-action lines matched to a goal (buy, sign up, learn more…).",
  parameters: {
    goal: { type: "string", description: "What the viewer should do.", required: true },
    count: { type: "string", description: "How many (default 6)." },
  },
  label: "Writing CTAs…",
  async run(args, ctx) {
    const goal = pick(args, ["goal", "action", "objective", "cta"]);
    if (!goal) return { ok: false, summary: "What should the viewer do?", data: {} };
    const count = Math.max(3, Math.min(12, parseInt(pick(args, ["count", "n"], "6"), 10) || 6));
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nWrite ${count} call-to-action lines that get people to: ${goal}.\nOne per line, no numbering, each under 8 words.`
    );
    const out = lines(text, count);
    if (!out.length) return { ok: false, summary: "Couldn't write CTAs right now.", data: {} };
    return { ok: true, summary: `${out.length} CTAs ready.`, data: { ctas: out } };
  },
};

const rank_ctas: CopilotTool = {
  name: "rank_ctas",
  description: "Rank a list of CTAs by likely click-through strength and explain the winner.",
  parameters: {
    ctas: { type: "string", description: "CTAs separated by newlines or commas." },
    goal: { type: "string", description: "What the viewer should do." },
  },
  label: "Ranking CTAs…",
  async run(args, ctx) {
    const raw = pick(args, ["ctas", "list", "options", "text"]);
    if (!raw) return { ok: false, summary: "Give me the CTAs to rank.", data: {} };
    const list = raw.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean).slice(0, 10);
    const goal = pick(args, ["goal", "action", "objective"]) || "click through";
    const ranked = await aiJson<{ ranked: { cta: string; score: number; why: string }[] }>(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nRank these CTAs for the goal "${goal}", strongest first. Score 0-100.\nCTAs:\n${list.map((c, i) => `${i + 1}. ${c}`).join("\n")}`
    );
    if (!ranked?.ranked?.length) {
      const scored = list.map((cta) => ({ cta, score: scoreHook(cta, "").score, why: "Deterministic score (AI unavailable)." }));
      scored.sort((a, b) => b.score - a.score);
      return { ok: true, summary: `Ranked ${scored.length} CTAs (deterministic).`, data: { ranked: scored } };
    }
    return { ok: true, summary: `Winner: "${ranked.ranked[0].cta}"`, data: ranked };
  },
};

const hook_score_batch: CopilotTool = {
  name: "hook_score_batch",
  description: "Score many hooks at once with the deterministic hook engine, best first.",
  parameters: {
    hooks: { type: "string", description: "Hooks separated by newlines.", required: true },
  },
  label: "Scoring hooks…",
  async run(args, ctx) {
    const raw = pick(args, ["hooks", "list", "text", "lines"]);
    if (!raw) return { ok: false, summary: "Give me the hooks to score.", data: {} };
    const list = raw.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);
    const scored = list.map((hook) => ({ hook, score: scoreHook(hook, "").score }));
    scored.sort((a, b) => b.score - a.score);
    return { ok: true, summary: `Scored ${scored.length} hooks. Best: "${scored[0]?.hook}" (${scored[0]?.score}/100).`, data: { hooks: scored } };
  },
};

const pattern_interrupt_ideas: CopilotTool = {
  name: "pattern_interrupt_ideas",
  description: "Generate scroll-stopping pattern-interrupt openers for short-form video.",
  parameters: {
    topic: { type: "string", description: "Product or campaign topic.", required: true },
    count: { type: "string", description: "How many (default 6)." },
  },
  label: "Dreaming up openers…",
  async run(args, ctx) {
    const topic = pick(args, ["topic", "product", "campaign", "brief", "idea"]);
    if (!topic) return { ok: false, summary: "What's the video about?", data: {} };
    const count = Math.max(3, Math.min(12, parseInt(pick(args, ["count", "n"], "6"), 10) || 6));
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nWrite ${count} pattern-interrupt openers (first 2 seconds of a short video) for: ${topic}.\nEach must break the scroll: a bold claim, a visual shock, or a question that stings. One per line, no numbering.`
    );
    const out = lines(text, count);
    if (!out.length) return { ok: false, summary: "Couldn't generate openers right now.", data: {} };
    return { ok: true, summary: `${out.length} openers ready.`, data: { openers: out } };
  },
};

const curiosity_gap_lines: CopilotTool = {
  name: "curiosity_gap_lines",
  description: "Write curiosity-gap lines that make people need to watch/read more.",
  parameters: {
    topic: { type: "string", description: "Product or campaign topic.", required: true },
    count: { type: "string", description: "How many (default 6)." },
  },
  label: "Building curiosity…",
  async run(args, ctx) {
    const topic = pick(args, ["topic", "product", "campaign", "brief", "idea"]);
    if (!topic) return { ok: false, summary: "What's this about?", data: {} };
    const count = Math.max(3, Math.min(12, parseInt(pick(args, ["count", "n"], "6"), 10) || 6));
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nWrite ${count} curiosity-gap lines for: ${topic}.\nTease information without revealing it. One per line, no numbering.`
    );
    const out = lines(text, count);
    if (!out.length) return { ok: false, summary: "Couldn't generate lines right now.", data: {} };
    return { ok: true, summary: `${out.length} curiosity lines ready.`, data: { lines: out } };
  },
};

const ugc_script: CopilotTool = {
  name: "ugc_script",
  description: "Write a natural UGC-style testimonial script (30s) that doesn't sound like an ad.",
  parameters: {
    product: { type: "string", description: "The product.", required: true },
    pain: { type: "string", description: "The pain point it solves." },
    persona: { type: "string", description: "Who's talking (e.g. busy mom, gym bro)." },
  },
  label: "Writing UGC script…",
  async run(args, ctx) {
    const product = pick(args, ["product", "topic", "campaign", "brief"]);
    if (!product) return { ok: false, summary: "Which product is this for?", data: {} };
    const pain = pick(args, ["pain", "problem"]);
    const persona = pick(args, ["persona", "audience", "who"]);
    const script = await aiText(
      ctx,
      SYS + " Write like a real person talking to their phone, not a brand. Casual, specific details, one genuine moment.",
      `${brandLine(ctx.brand)}\nWrite a ~30 second UGC testimonial script.\nProduct: ${product}${pain ? `\nPain it solves: ${pain}` : ""}${persona ? `\nSpeaker: ${persona}` : ""}\nFormat: HOOK (first line) / BODY / CTA. Keep it under 90 words.`
    );
    if (!script) return { ok: false, summary: "Couldn't write the script right now.", data: {} };
    return { ok: true, summary: "UGC script ready.", data: { script } };
  },
};

const reel_script: CopilotTool = {
  name: "reel_script",
  description: "Write a full short-form video script with shots, on-screen text, and VO.",
  parameters: {
    topic: { type: "string", description: "Video topic.", required: true },
    seconds: { type: "string", description: "Length in seconds (default 30)." },
  },
  label: "Writing reel script…",
  async run(args, ctx) {
    const topic = pick(args, ["topic", "product", "campaign", "brief", "idea"]);
    if (!topic) return { ok: false, summary: "What's the video about?", data: {} };
    const seconds = Math.max(7, Math.min(90, parseInt(pick(args, ["seconds", "length", "duration"], "30"), 10) || 30));
    const script = await aiText(
      ctx,
      SYS + " Structure every script as timed beats: [0-2s] etc. Include SHOT, ON-SCREEN TEXT, and VO/AUDIO for each beat.",
      `${brandLine(ctx.brand)}\nWrite a ${seconds}-second short-form video script for: ${topic}.\nHook in the first 2 seconds. End with a CTA.`
    );
    if (!script) return { ok: false, summary: "Couldn't write the script right now.", data: {} };
    return { ok: true, summary: `A ${seconds}s script is ready.`, data: { script, seconds } };
  },
};

const story_sequence: CopilotTool = {
  name: "story_sequence",
  description: "Plan a 3-frame Instagram story sequence (hook → value → CTA).",
  parameters: {
    topic: { type: "string", description: "Story topic.", required: true },
  },
  label: "Planning story…",
  async run(args, ctx) {
    const topic = pick(args, ["topic", "product", "campaign", "brief", "idea"]);
    if (!topic) return { ok: false, summary: "What's the story about?", data: {} };
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nPlan a 3-frame Instagram story sequence for: ${topic}.\nFrame 1 = hook (poll or question sticker idea), Frame 2 = value, Frame 3 = CTA with swipe/link. Keep each frame to 2 lines.`
    );
    if (!text) return { ok: false, summary: "Couldn't plan it right now.", data: {} };
    return { ok: true, summary: "Story sequence ready.", data: { sequence: text } };
  },
};

const visual_direction: CopilotTool = {
  name: "visual_direction",
  description: "Get art direction for an ad: palette, lighting, composition, mood, first frame.",
  parameters: {
    concept: { type: "string", description: "The concept or product to direct.", required: true },
    format: { type: "string", description: "e.g. 9:16 reel, 1:1 feed, 16:9." },
  },
  label: "Directing visuals…",
  async run(args, ctx) {
    const concept = pick(args, ["concept", "topic", "product", "campaign", "brief", "idea"]);
    if (!concept) return { ok: false, summary: "What am I directing?", data: {} };
    const format = pick(args, ["format", "aspect", "platform"]) || "9:16";
    const text = await aiText(
      ctx,
      SYS + " You are an art director. Concrete and visual: name colors, light, textures, camera moves. Never vague.",
      `${brandLine(ctx.brand)}\nArt-direct this for ${format}: ${concept}\nCover: palette, lighting, composition, mood, and exactly what the first frame looks like. Under 150 words.`
    );
    if (!text) return { ok: false, summary: "Couldn't direct it right now.", data: {} };
    return { ok: true, summary: "Visual direction ready.", data: { direction: text, format } };
  },
};

const thumb_stopper_ideas: CopilotTool = {
  name: "thumb_stopper_ideas",
  description: "Ideas for the first frame / thumbnail that stops the scroll.",
  parameters: {
    topic: { type: "string", description: "Video or post topic.", required: true },
    count: { type: "string", description: "How many (default 5)." },
  },
  label: "Designing first frames…",
  async run(args, ctx) {
    const topic = pick(args, ["topic", "product", "campaign", "brief", "idea"]);
    if (!topic) return { ok: false, summary: "What's this for?", data: {} };
    const count = Math.max(3, Math.min(10, parseInt(pick(args, ["count", "n"], "5"), 10) || 5));
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nGive ${count} first-frame ideas for: ${topic}.\nEach: what we SEE + the 3-5 words on screen. One per line, no numbering.`
    );
    const out = lines(text, count);
    if (!out.length) return { ok: false, summary: "Couldn't generate ideas right now.", data: {} };
    return { ok: true, summary: `${out.length} first-frame ideas ready.`, data: { ideas: out } };
  },
};

const concept_remix: CopilotTool = {
  name: "concept_remix",
  description: "Remix a concept into a fresh angle — same product, new creative territory.",
  parameters: {
    concept: { type: "string", description: "The concept to remix.", required: true },
    direction: { type: "string", description: "Where to take it (e.g. funnier, more premium, contrarian)." },
  },
  label: "Remixing concept…",
  async run(args, ctx) {
    const concept = pick(args, ["concept", "idea", "headline", "topic"]);
    if (!concept) return { ok: false, summary: "Which concept should I remix?", data: {} };
    const direction = pick(args, ["direction", "style", "tone", "angle"]) || "a surprising new angle";
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nRemix this concept into ${direction}:\n"${concept}"\nReply with: the remixed headline, then a 2-line description of the new angle.`
    );
    const out = lines(text, 4);
    if (!out.length) return { ok: false, summary: "Couldn't remix right now.", data: {} };
    return { ok: true, summary: `Remixed: "${out[0]}"`, data: { original: concept, remixed: out[0], angle: out.slice(1).join(" ") } };
  },
};

const hook_polish: CopilotTool = {
  name: "hook_polish",
  description: "Take a weak hook and rewrite it until it scores 80+ on the hook engine.",
  parameters: {
    hook: { type: "string", description: "The hook to polish.", required: true },
  },
  label: "Polishing hook…",
  async run(args, ctx) {
    const hook = pick(args, ["hook", "headline", "text", "line"]);
    if (!hook) return { ok: false, summary: "Which hook should I polish?", data: {} };
    const before = scoreHook(hook, "").score;
    const text = await aiText(
      ctx,
      SYS + " Hooks win with specificity, stakes, and curiosity. Cut every wasted word.",
      `${brandLine(ctx.brand)}\nThis hook scores ${before}/100: "${hook}"\nRewrite it to be dramatically stronger. Reply with ONLY the rewritten hook, one line.`
    );
    const polished = str(text).split("\n")[0] || hook;
    const after = scoreHook(polished, "").score;
    return { ok: true, summary: `Hook went from ${before} → ${after}.`, data: { before: hook, beforeScore: before, polished, afterScore: after } };
  },
};

export const creativeTools: CopilotTool[] = [
  generate_headlines,
  improve_headline,
  suggest_ctas,
  rank_ctas,
  hook_score_batch,
  pattern_interrupt_ideas,
  curiosity_gap_lines,
  ugc_script,
  reel_script,
  story_sequence,
  visual_direction,
  thumb_stopper_ideas,
  concept_remix,
  hook_polish,
];
