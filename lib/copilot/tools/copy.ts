/**
 * Copywriting tools — captions, hashtags, platform copy, email, SMS, landing.
 */
import { platformMeta } from "@/lib/campaign";
import {
  type CopilotTool,
  str,
  pick,
  brandLine,
  aiText,
  aiJson,
} from "../toolutil";

const SYS = "You are a conversion copywriter. Every word earns its place. Match the brand voice exactly. No clichés, no filler.";

function lines(text: string, n: number): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[\d\-•*.)\s]+/, "").trim())
    .filter((l) => l.length > 2)
    .slice(0, n);
}

const caption_variants: CopilotTool = {
  name: "caption_variants",
  description: "Write several caption variants for one post so the user can pick.",
  parameters: {
    topic: { type: "string", description: "What the post is about.", required: true },
    count: { type: "string", description: "How many variants (default 4)." },
    platform: { type: "string", description: "e.g. ig-feed, tiktok, x." },
  },
  label: "Writing caption variants…",
  async run(args, ctx) {
    const topic = pick(args, ["topic", "product", "campaign", "brief", "idea", "headline"]);
    if (!topic) return { ok: false, summary: "What's the post about?", data: {} };
    const count = Math.max(2, Math.min(8, parseInt(pick(args, ["count", "n"], "4"), 10) || 4));
    const platform = pick(args, ["platform", "network"]) || "ig-feed";
    const variants = await aiJson<string[]>(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nWrite ${count} DISTINCT caption variants for a ${platform} post about: ${topic}.\nVary the angle (funny, bold, story, direct). Reply with a JSON array of strings.`
    );
    const out = (Array.isArray(variants) ? variants : []).map((v) => str(v)).filter(Boolean).slice(0, count);
    if (!out.length) {
      const one = `${topic}\n\n#${ctx.brand.name.replace(/\s+/g, "")}`;
      return { ok: true, summary: "Caption ready (deterministic).", data: { variants: [one] } };
    }
    return { ok: true, summary: `${out.length} caption variants ready.`, data: { variants: out } };
  },
};

const generate_hashtags: CopilotTool = {
  name: "generate_hashtags",
  description: "Generate a smart hashtag set: niche + mid + broad, sized for the platform.",
  parameters: {
    topic: { type: "string", description: "Post topic or niche.", required: true },
    platform: { type: "string", description: "e.g. ig-feed, tiktok." },
    count: { type: "string", description: "How many (default 12)." },
  },
  label: "Researching hashtags…",
  async run(args, ctx) {
    const topic = pick(args, ["topic", "niche", "product", "campaign"]);
    if (!topic) return { ok: false, summary: "What's the niche?", data: {} };
    const count = Math.max(5, Math.min(30, parseInt(pick(args, ["count", "n"], "12"), 10) || 12));
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nGenerate ${count} hashtags for "${topic}" — mix niche, mid-size, and broad. Reply with ONLY the hashtags, space-separated, each starting with #.`
    );
    const tags = (text.match(/#[\p{L}\p{N}_]+/gu) ?? []).slice(0, count);
    if (!tags.length) return { ok: false, summary: "Couldn't generate hashtags right now.", data: {} };
    return { ok: true, summary: `${tags.length} hashtags ready.`, data: { hashtags: tags } };
  },
};

const ad_copy: CopilotTool = {
  name: "ad_copy",
  description: "Write paid-ad copy: primary text + headline + description for a platform.",
  parameters: {
    product: { type: "string", description: "What's being advertised.", required: true },
    platform: { type: "string", description: "e.g. instagram, tiktok, x." },
    offer: { type: "string", description: "The offer or deal." },
  },
  label: "Writing ad copy…",
  async run(args, ctx) {
    const product = pick(args, ["product", "topic", "campaign", "brief"]);
    if (!product) return { ok: false, summary: "What's being advertised?", data: {} };
    const platform = pick(args, ["platform", "network"]) || "instagram";
    const offer = pick(args, ["offer", "deal", "promo"]);
    const copy = await aiJson<{ primary: string; headline: string; description: string }>(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nWrite paid ad copy for ${platform}.\nProduct: ${product}${offer ? `\nOffer: ${offer}` : ""}\nReply with JSON: {"primary": "...", "headline": "...", "description": "..."}`
    );
    if (!copy?.primary) return { ok: false, summary: "Couldn't write ad copy right now.", data: {} };
    return { ok: true, summary: "Ad copy ready.", data: copy };
  },
};

const x_post: CopilotTool = {
  name: "x_post",
  description: "Write a punchy X/Twitter post under 280 characters.",
  parameters: {
    topic: { type: "string", description: "What the post is about.", required: true },
  },
  label: "Writing post…",
  async run(args, ctx) {
    const topic = pick(args, ["topic", "product", "campaign", "brief", "idea"]);
    if (!topic) return { ok: false, summary: "What's the post about?", data: {} };
    const text = await aiText(
      ctx,
      SYS + " Under 280 characters. Punchy. Built for retweets.",
      `${brandLine(ctx.brand)}\nWrite one X post about: ${topic}\nReply with ONLY the post text.`
    );
    const post = str(text).split("\n")[0].slice(0, 280);
    if (!post) return { ok: false, summary: "Couldn't write it right now.", data: {} };
    return { ok: true, summary: "Post ready.", data: { post, chars: post.length } };
  },
};

const x_thread: CopilotTool = {
  name: "x_thread",
  description: "Write an X thread (5-8 posts) that teaches or tells a story.",
  parameters: {
    topic: { type: "string", description: "Thread topic.", required: true },
    posts: { type: "string", description: "Number of posts (default 6)." },
  },
  label: "Writing thread…",
  async run(args, ctx) {
    const topic = pick(args, ["topic", "product", "campaign", "brief", "idea"]);
    if (!topic) return { ok: false, summary: "What's the thread about?", data: {} };
    const n = Math.max(3, Math.min(10, parseInt(pick(args, ["posts", "count", "n"], "6"), 10) || 6));
    const text = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nWrite a ${n}-post X thread about: ${topic}.\nPost 1 = hook that demands the click. Each post under 260 chars. Separate posts with "---".`
    );
    const posts = str(text).split("---").map((p) => p.trim()).filter(Boolean).slice(0, n);
    if (!posts.length) return { ok: false, summary: "Couldn't write the thread right now.", data: {} };
    return { ok: true, summary: `Thread ready (${posts.length} posts).`, data: { posts } };
  },
};

const email_subject_lines: CopilotTool = {
  name: "email_subject_lines",
  description: "Write email subject lines optimized for opens.",
  parameters: {
    topic: { type: "string", description: "Email topic or offer.", required: true },
    count: { type: "string", description: "How many (default 7)." },
  },
  label: "Writing subject lines…",
  async run(args, ctx) {
    const topic = pick(args, ["topic", "product", "offer", "campaign"]);
    if (!topic) return { ok: false, summary: "What's the email about?", data: {} };
    const count = Math.max(3, Math.min(12, parseInt(pick(args, ["count", "n"], "7"), 10) || 7));
    const text = await aiText(
      ctx,
      SYS + " Subject lines: curiosity + specificity. Under 50 characters each. No clickbait lies.",
      `${brandLine(ctx.brand)}\nWrite ${count} email subject lines for: ${topic}\nOne per line, no numbering.`
    );
    const out = lines(text, count);
    if (!out.length) return { ok: false, summary: "Couldn't write them right now.", data: {} };
    return { ok: true, summary: `${out.length} subject lines ready.`, data: { subjects: out } };
  },
};

const sms_copy: CopilotTool = {
  name: "sms_copy",
  description: "Write a short SMS/push message (under 160 chars) with a clear CTA.",
  parameters: {
    message: { type: "string", description: "What to communicate.", required: true },
  },
  label: "Writing message…",
  async run(args, ctx) {
    const message = pick(args, ["message", "topic", "offer", "text"]);
    if (!message) return { ok: false, summary: "What should the message say?", data: {} };
    const text = await aiText(
      ctx,
      SYS + " Under 160 characters including CTA. Urgent but not spammy.",
      `${brandLine(ctx.brand)}\nWrite one SMS about: ${message}\nReply with ONLY the message text.`
    );
    const sms = str(text).split("\n")[0].slice(0, 160);
    if (!sms) return { ok: false, summary: "Couldn't write it right now.", data: {} };
    return { ok: true, summary: "Message ready.", data: { sms, chars: sms.length } };
  },
};

const landing_headline: CopilotTool = {
  name: "landing_headline",
  description: "Write landing page hero copy: headline + subheadline + CTA.",
  parameters: {
    product: { type: "string", description: "The product or offer.", required: true },
  },
  label: "Writing hero copy…",
  async run(args, ctx) {
    const product = pick(args, ["product", "topic", "campaign", "offer"]);
    if (!product) return { ok: false, summary: "What's the page for?", data: {} };
    const copy = await aiJson<{ headline: string; subheadline: string; cta: string }>(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nWrite hero copy for a landing page selling: ${product}\nReply with JSON: {"headline": "...", "subheadline": "...", "cta": "..."}`
    );
    if (!copy?.headline) return { ok: false, summary: "Couldn't write it right now.", data: {} };
    return { ok: true, summary: "Hero copy ready.", data: copy };
  },
};

const product_description: CopilotTool = {
  name: "product_description",
  description: "Write a product description that sells benefits, not features.",
  parameters: {
    product: { type: "string", description: "The product.", required: true },
    features: { type: "string", description: "Key features to translate into benefits." },
  },
  label: "Writing description…",
  async run(args, ctx) {
    const product = pick(args, ["product", "topic", "name"]);
    if (!product) return { ok: false, summary: "Which product?", data: {} };
    const features = pick(args, ["features", "specs", "details"]);
    const text = await aiText(
      ctx,
      SYS + " Lead with the transformation, weave features in as proof. Under 120 words.",
      `${brandLine(ctx.brand)}\nWrite a product description for: ${product}${features ? `\nFeatures: ${features}` : ""}`
    );
    if (!text) return { ok: false, summary: "Couldn't write it right now.", data: {} };
    return { ok: true, summary: "Description ready.", data: { description: text.trim() } };
  },
};

const adjust_tone: CopilotTool = {
  name: "adjust_tone",
  description: "Rewrite any copy in a different tone while keeping the meaning.",
  parameters: {
    text: { type: "string", description: "The copy to rewrite.", required: true },
    tone: { type: "string", description: "Target tone: e.g. playful, luxury, bold, warm.", required: true },
  },
  label: "Adjusting tone…",
  async run(args, ctx) {
    const text = pick(args, ["text", "copy", "content", "caption"]);
    const tone = pick(args, ["tone", "style", "voice", "vibe"]);
    if (!text) return { ok: false, summary: "What copy should I rewrite?", data: {} };
    if (!tone) return { ok: false, summary: "Which tone? (playful, luxury, bold, warm…)", data: {} };
    const out = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nRewrite this in a ${tone} tone, keeping the meaning:\n"${text}"\nReply with ONLY the rewritten text.`
    );
    if (!out) return { ok: false, summary: "Couldn't rewrite right now.", data: {} };
    return { ok: true, summary: `Rewritten in a ${tone} tone.`, data: { original: text, rewritten: out.trim(), tone } };
  },
};

const shorten_copy: CopilotTool = {
  name: "shorten_copy",
  description: "Cut copy down to a target length without losing the punch.",
  parameters: {
    text: { type: "string", description: "The copy to shorten.", required: true },
    target: { type: "string", description: "Target like '50 words' or '280 chars'." },
  },
  label: "Tightening copy…",
  async run(args, ctx) {
    const text = pick(args, ["text", "copy", "content", "caption"]);
    if (!text) return { ok: false, summary: "What should I shorten?", data: {} };
    const target = pick(args, ["target", "length", "to"]) || "half the length";
    const out = await aiText(
      ctx,
      SYS + " Cut ruthlessly. Keep the hook and the CTA.",
      `Shorten this to ${target}:\n"${text}"\nReply with ONLY the shortened text.`
    );
    if (!out) return { ok: false, summary: "Couldn't shorten right now.", data: {} };
    return { ok: true, summary: "Tightened.", data: { original: text, shortened: out.trim() } };
  },
};

const expand_copy: CopilotTool = {
  name: "expand_copy",
  description: "Expand a short line into fuller copy — a hook into a caption, a headline into a paragraph.",
  parameters: {
    text: { type: "string", description: "The short copy to expand.", required: true },
    format: { type: "string", description: "Target format: caption, paragraph, email…" },
  },
  label: "Expanding copy…",
  async run(args, ctx) {
    const text = pick(args, ["text", "copy", "headline", "hook"]);
    if (!text) return { ok: false, summary: "What should I expand?", data: {} };
    const format = pick(args, ["format", "into", "type"]) || "a full caption";
    const out = await aiText(
      ctx,
      SYS,
      `${brandLine(ctx.brand)}\nExpand this into ${format}:\n"${text}"`
    );
    if (!out) return { ok: false, summary: "Couldn't expand right now.", data: {} };
    return { ok: true, summary: "Expanded.", data: { original: text, expanded: out.trim(), format } };
  },
};

export const copyTools: CopilotTool[] = [
  caption_variants,
  generate_hashtags,
  ad_copy,
  x_post,
  x_thread,
  email_subject_lines,
  sms_copy,
  landing_headline,
  product_description,
  adjust_tone,
  shorten_copy,
  expand_copy,
];

/** Re-exported for the prompt's platform list. */
export { platformMeta };
