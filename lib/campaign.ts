import type {
  AdConcept,
  Brand,
  Brief,
  PlatformId,
  PlatformMeta,
} from "./types";
import { scoreHook } from "./hookScore";
import { runSlop } from "./slop";

/**
 * One-Brief Campaign — one brief in, three platform-native concepts out.
 * Deterministic: the same brief always produces the same campaign.
 */

export const PLATFORMS: PlatformMeta[] = [
  {
    id: "ig-feed",
    label: "Instagram Feed",
    short: "IG Feed",
    aspect: "1:1",
    captionLimit: 2200,
    captionHint: "Hook in the first 125 characters — the rest hides behind “more”.",
    hashtagMin: 3,
    hashtagMax: 5,
    video: false,
  },
  {
    id: "ig-reel",
    label: "Instagram Reel",
    short: "IG Reel",
    aspect: "9:16",
    captionLimit: 2200,
    captionHint: "The first line is the second hook — it shows under the video.",
    hashtagMin: 3,
    hashtagMax: 5,
    video: true,
  },
  {
    id: "ig-story",
    label: "Instagram Story",
    short: "IG Story",
    aspect: "9:16",
    captionLimit: 125,
    captionHint: "Only ~125 characters stay visible over the creative.",
    hashtagMin: 0,
    hashtagMax: 2,
    video: true,
  },
  {
    id: "tiktok",
    label: "TikTok",
    short: "TikTok",
    aspect: "9:16",
    captionLimit: 2200,
    captionHint: "Keep it under ~150 characters — TikTok rewards brevity.",
    hashtagMin: 3,
    hashtagMax: 5,
    video: true,
  },
  {
    id: "shorts",
    label: "YouTube Shorts",
    short: "Shorts",
    aspect: "9:16",
    captionLimit: 100,
    captionHint: "This is a title, not a caption — 100 characters max.",
    hashtagMin: 2,
    hashtagMax: 4,
    video: true,
  },
  {
    id: "x",
    label: "X",
    short: "X",
    aspect: "16:9",
    captionLimit: 280,
    captionHint: "280 characters. One idea per post.",
    hashtagMin: 1,
    hashtagMax: 2,
    video: false,
  },
];

export function platformMeta(id: PlatformId): PlatformMeta {
  return PLATFORMS.find((p) => p.id === id) ?? PLATFORMS[0];
}

/* ---------- deterministic PRNG ---------- */

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fillTpl(tpl: string, map: Record<string, string>): string {
  return Object.entries(map).reduce(
    (s, [k, v]) => s.split(`{${k}}`).join(v),
    tpl
  );
}

export function fit(s: string, limit: number): string {
  if (s.length <= limit) return s;
  const cut = s.slice(0, limit - 1);
  const sp = cut.lastIndexOf(" ");
  return (sp > limit * 0.55 ? cut.slice(0, sp) : cut).trimEnd() + "…";
}

/* ---------- angle banks ---------- */

interface Angle {
  name: string;
  angle: string;
  headlines: string[];
  subs: string[];
  ctas: string[];
  motifs: string[];
  captions: string[];
  tags: string[];
}

const GOAL_BANKS: Record<string, Angle[]> = {
  launch: [
    {
      name: "The Drop",
      angle: "Scarcity + arrival. Make the launch feel like an event, not an announcement.",
      headlines: [
        "Stop scrolling. {product} just dropped.",
        "Your rotation ends today: {product}.",
        "We made a limited run of {product}. Then we stopped.",
      ],
      subs: [
        "{offer}. Built for {audience} who notice the details.",
        "First come, first served. No restock promised.",
      ],
      ctas: ["Shop the drop", "Claim yours"],
      motifs: ["Oversized type over a product silhouette", "Giant countdown numerals on a dark field"],
      captions: [
        "{product} is live. {offer}. {cta} — link in bio.",
        "The drop is here: {product}, built for {audience}. {offer}.",
      ],
      tags: ["dropalert", "newarrival", "limitedrun", "freshdrop", "dontsleep", "firstdrop"],
    },
    {
      name: "The Problem Callout",
      angle: "Name the enemy — what they're using now — then replace it.",
      headlines: [
        "Your current pair is lying to you.",
        "Stop paying for logos. Start paying for craft.",
        "Everything else in your closet called. It wants {product}.",
      ],
      subs: [
        "{product} fixes what {audience} hate about the rest.",
        "{offer} — while the launch lasts.",
      ],
      ctas: ["See the difference", "Upgrade now"],
      motifs: ["Split frame: dull grey left, molten color right", "The old thing crossed out, the new thing in bold type"],
      captions: [
        "Your current pair is lying to you. {product} doesn't. {offer}.",
        "We built {product} for {audience} who are done compromising. {cta}.",
      ],
      tags: ["honestreview", "switchup", "upgrade", "realtalk", "notsponsored"],
    },
    {
      name: "The Proof",
      angle: "Wear-test evidence. Numbers beat adjectives every time.",
      headlines: [
        "Worn 214 days straight. Still sharp.",
        "0 blisters. 214 days. One pair.",
        "We tortured {product} so you don't have to.",
      ],
      subs: [
        "{audience} tested it. {offer} for launch week.",
        "The lab report is in: it holds.",
      ],
      ctas: ["Read the proof", "Shop tested"],
      motifs: ["Stamped test-result graphics over product", "Timeline strip: day 1 → day 214"],
      captions: [
        "214 days of wear-testing. Zero apologies. {product} — {offer}.",
        "Don't take our word for it. Take 214 days of evidence. {cta}.",
      ],
      tags: ["weartest", "durability", "puttothetest", "qualityoverhype", "proof"],
    },
  ],
  sales: [
    {
      name: "The Offer Hammer",
      angle: "Lead with the deal. No throat-clearing.",
      headlines: [
        "{offer} — this week only.",
        "{product}, minus the markup.",
        "The price drops. The quality doesn't.",
      ],
      subs: [
        "{audience}, this is your window. {offer}.",
        "No code needed. No games.",
      ],
      ctas: ["Grab the deal", "Shop the sale"],
      motifs: ["Giant price type on a dark field", "Ticket-stub frame with the offer stamped"],
      captions: [
        "{offer} on {product}. Built for {audience}. Ends Sunday.",
        "The math is simple: {product} + {offer}. {cta}.",
      ],
      tags: ["salealert", "dealhunter", "limitedoffer", "dontmissout", "sale"],
    },
    {
      name: "The Objection Killer",
      angle: "Too expensive? Too plain? Answer the objection head-on.",
      headlines: [
        "\u201CToo minimal?\u201D Watch this.",
        "Costs less than your last dinner out.",
        "One pair. Every outfit. Zero thought.",
      ],
      subs: [
        "{product} answers the only question {audience} ask.",
        "{offer} removes the last excuse.",
      ],
      ctas: ["End the debate", "Shop now"],
      motifs: ["Objection text crossed out, replaced by proof", "Receipt-style cost breakdown graphic"],
      captions: [
        "The objection: too simple. The answer: {product}. {offer}.",
        "{audience} did the math — {product} wins on cost-per-wear. {cta}.",
      ],
      tags: ["worthit", "costperwear", "smartbuy", "noexcuses"],
    },
    {
      name: "The Countdown",
      angle: "Urgency as the entire pitch. The clock does the selling.",
      headlines: [
        "47 hours left on {offer}.",
        "When it's gone, it's gone.",
        "Last call: {product}.",
      ],
      subs: [
        "{audience} already moved. {offer} ends soon.",
        "The clock is the whole pitch.",
      ],
      ctas: ["Beat the clock", "Claim before midnight"],
      motifs: ["Live-timer numerals over the product", "Bold diagonal ENDING banner"],
      captions: [
        "47 hours. Then {offer} is history. {product} — {cta}.",
        "Last call for {audience}: {product} at {offer}.",
      ],
      tags: ["lastcall", "endingsoon", "finalhours", "urgent"],
    },
  ],
  awareness: [
    {
      name: "The Belief Breaker",
      angle: "Attack a lazy belief the audience holds. Polarize politely.",
      headlines: [
        "Sneakers shouldn't shout.",
        "Minimal isn't boring. Your feed is.",
        "Design is what you remove.",
      ],
      subs: [
        "{brand} makes {product} for {audience} who get it.",
        "{offer} for first-timers.",
      ],
      ctas: ["Meet the brand", "Explore"],
      motifs: ["A single line of type on vast negative space", "Manifesto poster layout"],
      captions: [
        "Sneakers shouldn't shout. {product} doesn't. Meet {brand}.",
        "We removed everything that didn't earn its place. This is {product}.",
      ],
      tags: ["brandstory", "designmatters", "minimalism", "lessismore"],
    },
    {
      name: "The Worldview",
      angle: "Sell the philosophy, not the product. Belonging beats features.",
      headlines: [
        "We make one thing. We make it perfectly.",
        "No seasons. No hype cycles. Just {product}.",
        "Slow-made in a fast world.",
      ],
      subs: [
        "This is {brand}. {offer} if you're new here.",
        "For {audience} who buy once and buy right.",
      ],
      ctas: ["Our story", "Discover"],
      motifs: ["Atelier-style craft imagery in duotone", "Blueprint linework on a dark field"],
      captions: [
        "No seasons. No hype cycles. Just {product}, made properly. — {brand}",
        "Slow-made in a fast world. This is what {brand} stands for.",
      ],
      tags: ["slowmade", "craftsmanship", "ourstory", "behindthebrand"],
    },
    {
      name: "The Ritual",
      angle: "Attach the product to a daily ritual the audience already has.",
      headlines: [
        "Lace up. Tune out. Go.",
        "Your 6AM deserves better shoes.",
        "The first thing you put on sets the day.",
      ],
      subs: [
        "{product} for {audience} and their mornings.",
        "{offer} — start the ritual.",
      ],
      ctas: ["Start yours", "Shop the ritual"],
      motifs: ["Morning-light product still in a bold frame", "Routine timeline graphic"],
      captions: [
        "Lace up. Tune out. Go. {product} — the 6AM ritual.",
        "Your mornings called. They want {product}. {offer}.",
      ],
      tags: ["morningroutine", "dailydriver", "everydaycarry", "ritual"],
    },
  ],
  retention: [
    {
      name: "The Insider",
      angle: "Reward past buyers with early access. Loyalty without a points card.",
      headlines: [
        "You bought the first drop. This one's yours first.",
        "Insiders shop 48 hours early.",
        "Your pair misses you. Complete the set.",
      ],
      subs: [
        "{offer} — insider pricing for {audience}.",
        "Loyalty, rewarded without a points card.",
      ],
      ctas: ["Shop early access", "Claim insider price"],
      motifs: ["Member-card aesthetic stamped INSIDER", "Velvet-rope metaphor drawn in type"],
      captions: [
        "Insiders first: {product} opens 48 hours early for you. {offer}.",
        "You were early once. Be early again — {product}. {cta}.",
      ],
      tags: ["insideraccess", "earlyaccess", "loyaltyrewarded", "backagain"],
    },
    {
      name: "The Win-Back",
      angle: "Acknowledge the absence. Give them a reason to return.",
      headlines: [
        "It's been a while. {offer}.",
        "We saved your size.",
        "Come back. We fixed the thing you hated.",
      ],
      subs: [
        "{product} is waiting, {audience}.",
        "No guilt trip. Just a better pair.",
      ],
      ctas: ["Welcome back", "Reclaim your pair"],
      motifs: ["\u201CWe miss you\u201D in giant warm type", "Before/after of the improved detail"],
      captions: [
        "It's been a while. {product} got better while you were gone. {offer}.",
        "We saved your size, {audience}. Come see what changed.",
      ],
      tags: ["comeback", "wemissyou", "secondchance"],
    },
    {
      name: "The Pairing",
      angle: "Cross-sell the next logical piece. One purchase was the gateway.",
      headlines: [
        "Your {product} called. It wants friends.",
        "One pair was the gateway.",
        "Complete the rotation.",
      ],
      subs: [
        "{audience} pair it with what's next. {offer}.",
        "The collection makes sense together. That's the point.",
      ],
      ctas: ["Complete the set", "Shop the pairing"],
      motifs: ["Lineup of silhouettes in a row", "Puzzle-piece product lockup"],
      captions: [
        "Your {product} called — it wants friends. {offer} on the pairing.",
        "One was the gateway. Complete the rotation. {cta}.",
      ],
      tags: ["completethelook", "rotation", "collection"],
    },
  ],
};

/* ---------- generation ---------- */

function buildCaption(
  platform: PlatformId,
  headline: string,
  sub: string,
  cta: string,
  brand: Brand,
  base: string
): string {
  switch (platform) {
    case "ig-story":
      return fit(`${headline} ${cta}. Link in bio.`, 125);
    case "shorts":
      return fit(`${headline} | ${brand.name}`, 100);
    case "x":
      return fit(`${headline} ${sub}`, 250);
    default:
      return base;
  }
}

export function generateConcepts(brief: Brief, brand: Brand): AdConcept[] {
  const bank = GOAL_BANKS[brief.goal] ?? GOAL_BANKS.sales;
  const map = {
    product: brief.product || "the new drop",
    audience: brief.audience || "everyone",
    offer: brief.offer || "Available now",
    brand: brand.name,
  };

  return [0, 1, 2].map((i) => {
    const t = bank[i % bank.length];
    const rnd = mulberry32(hashStr(`${brief.product}|${brief.audience}|${brief.offer}|${i}|${brand.id}`));
    const pick = <T,>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];

    const cta = fillTpl(pick(t.ctas), map);
    const headline = fillTpl(pick(t.headlines), { ...map, cta });
    const sub = fillTpl(pick(t.subs), { ...map, cta });
    const baseCaption = fillTpl(pick(t.captions), { ...map, cta });

    const light = i === 1;
    const visual = {
      bg: light ? brand.colors.paper : brand.colors.ink,
      fg: light ? brand.colors.ink : brand.colors.paper,
      accent: brand.colors.accent,
      motif: pick(t.motifs),
      layout: ["Stacked type", "Split frame", "Type-dominant"][i % 3],
    };

    const hook = scoreHook(headline, baseCaption);
    const primary = brief.platforms[0] ?? "ig-feed";
    const pmeta = platformMeta(primary);
    const tagSeed = hashStr(headline);
    const tagCount =
      pmeta.hashtagMin + (tagSeed % Math.max(1, pmeta.hashtagMax - pmeta.hashtagMin + 1));
    const hashtags = t.tags.slice(0, Math.max(tagCount, 1)).map((tag) => `#${tag}`);

    const slop = runSlop({
      headline,
      caption: baseCaption,
      hashtags,
      visual,
      brand,
      isVideo: brief.platforms.some((p) => platformMeta(p).video),
      sensitivity: 60,
      hashtagMin: pmeta.hashtagMin,
      hashtagMax: pmeta.hashtagMax,
    });

    const variants = brief.platforms.map((p) => {
      const meta = platformMeta(p);
      const n = meta.hashtagMin + (tagSeed % Math.max(1, meta.hashtagMax - meta.hashtagMin + 1));
      return {
        platform: p,
        caption: buildCaption(p, headline, sub, cta, brand, baseCaption),
        hashtags: t.tags.slice(0, Math.max(n, 1)).map((tag) => `#${tag}`),
        cta,
      };
    });

    return {
      id: `c${Date.now().toString(36)}${i}${(tagSeed % 97).toString(36)}`,
      brandId: brand.id,
      name: t.name,
      angle: brief.trendAngle ? `${t.angle} Trend fuel: ${brief.trendAngle}` : t.angle,
      headline,
      sub,
      cta,
      visual,
      hook,
      slop: slop.checks,
      slopStatus: slop.status,
      variants,
      createdAt: new Date().toISOString(),
    } as AdConcept;
  });
}
