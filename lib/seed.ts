import type {
  ActivityItem,
  AnalyticsPost,
  Brand,
  PipelineItem,
  ScheduledPost,
  TrendItem,
} from "./types";

export const SEED_BRANDS: Brand[] = [
  {
    id: "kova",
    name: "KOVA",
    tagline: "Nothing extra.",
    industry: "Footwear — minimalist sneakers",
    colors: { ink: "#101014", paper: "#FAFAF7", accent: "#FF5A1F", muted: "#8B8B93" },
    displayFont: "Space Grotesk",
    bodyFont: "Inter",
    tone: "Blunt. Minimal. Zero hype.",
    voice: [
      "Short sentences. No throat-clearing.",
      "No adjective without evidence.",
      "Confidence, not shouting.",
    ],
    banned: ["Amazing", "Revolutionary", "Game-changer", "Epic"],
  },
  {
    id: "juniper",
    name: "Juniper & Co.",
    tagline: "Slow light for fast lives.",
    industry: "Home — hand-poured candles",
    colors: { ink: "#1B231F", paper: "#F6F1E7", accent: "#D9A441", muted: "#9A917F" },
    displayFont: "Space Grotesk",
    bodyFont: "Inter",
    tone: "Warm, slow, sensory.",
    voice: [
      "Sensory detail over claims.",
      "Unhurried rhythm — let sentences breathe.",
      "Never shout about calm.",
    ],
    banned: ["Insane", "Crazy", "Hustle", "Smash"],
  },
];

export const SEED_TRENDS: TrendItem[] = [
  {
    id: "t1",
    title: "Silent unboxing",
    platform: "TikTok · Reels",
    heat: 94,
    format: "Video · 9:16",
    hook: "No talking. Just the box.",
    why: "No-dialogue product reveals are holding 31% longer watch time this month — the product does the talking.",
    growth: "+212% uses this week",
    prefill: {
      product: "KOVA Court Low in bone white",
      audience: "design-obsessed 25–34s",
      goal: "launch",
      offer: "Launch-week pricing",
      angle: "Film the unboxing with zero dialogue — hands, box, shoe, done.",
    },
  },
  {
    id: "t2",
    title: "The 3-word hook",
    platform: "Reels · Shorts",
    heat: 89,
    format: "Video · 9:16",
    hook: "Three words. Then silence.",
    why: "Ultra-short text hooks (“Stop buying this.”) are beating full sentences on cold traffic — curiosity does the heavy lifting.",
    growth: "+148% uses this week",
    prefill: {
      product: "Juniper No. 04 — smoked cedar candle",
      audience: "homebodies who read labels",
      goal: "awareness",
      offer: "Free shipping over $40",
      angle: "Open on three words of type, hold two beats, then reveal the pour.",
    },
  },
  {
    id: "t3",
    title: "FounderCam confessionals",
    platform: "TikTok",
    heat: 86,
    format: "Video · 9:16",
    hook: "“We almost killed this product.”",
    why: "Founder-to-camera honesty is converting skeptics — behind-the-scenes doubt reads as trust.",
    growth: "+121% uses this week",
    prefill: {
      product: "KOVA Court Low",
      audience: "skeptical minimalists",
      goal: "awareness",
      offer: "Our story, unfiltered",
      angle: "Founder admits the design nearly failed — then shows the fix.",
    },
  },
  {
    id: "t4",
    title: "Price-flash frames",
    platform: "Reels · TikTok",
    heat: 83,
    format: "Video · 9:16",
    hook: "The price appears for 0.4 seconds.",
    why: "Flashing the offer as a single frame forces rewatches — and rewatches are the algorithm's love language.",
    growth: "+97% uses this week",
    prefill: {
      product: "KOVA Court Low",
      audience: "deal hunters",
      goal: "sales",
      offer: "20% off ends Sunday",
      angle: "Flash the offer for a single frame mid-video. Make them rewatch.",
    },
  },
  {
    id: "t5",
    title: "ASMR pour & fizz",
    platform: "TikTok · Reels",
    heat: 81,
    format: "Video · 9:16",
    hook: "Turn your sound on.",
    why: "Close-mic product sounds (wax pours, laces, boxes) are driving saves — people bookmark what they can hear.",
    growth: "+88% uses this week",
    prefill: {
      product: "Juniper No. 04 — smoked cedar",
      audience: "ASMR-adjacent scrollers",
      goal: "awareness",
      offer: "Small-batch pour",
      angle: "Record the wax pour in close-mic. No music. No voice.",
    },
  },
  {
    id: "t6",
    title: "Comment-bait endings",
    platform: "TikTok",
    heat: 78,
    format: "Video · 9:16",
    hook: "“Wrong answers only.”",
    why: "Ending on a playful prompt (“wrong answers only”) is doubling comment rate on product posts.",
    growth: "+74% uses this week",
    prefill: {
      product: "KOVA Court Low",
      audience: "chronically online sneaker fans",
      goal: "awareness",
      offer: "Join the argument",
      angle: "End the video with a deliberately debatable take.",
    },
  },
  {
    id: "t7",
    title: "Before / after wipes",
    platform: "Reels · Shorts",
    heat: 75,
    format: "Video · 9:16",
    hook: "Swipe the transformation.",
    why: "Hand-wipe transitions between before/after states keep thumbs parked — simple, physical, effective.",
    growth: "+63% uses this week",
    prefill: {
      product: "Juniper No. 04 — smoked cedar",
      audience: "cozy-home upgraders",
      goal: "sales",
      offer: "20% off ends Sunday",
      angle: "Wipe from a dull room to the candle-lit version. One hand, one move.",
    },
  },
  {
    id: "t8",
    title: "Duet chains",
    platform: "TikTok",
    heat: 72,
    format: "Video · 9:16",
    hook: "“Stitch this with your pair.”",
    why: "Stitch/duet CTAs turn one post into a chain — each duet is free distribution.",
    growth: "+51% uses this week",
    prefill: {
      product: "KOVA Court Low",
      audience: "sneaker collectors",
      goal: "retention",
      offer: "Show your rotation",
      angle: "Post your pair, invite duets of theirs. Chain the community.",
    },
  },
];

export const SEED_PIPELINE: PipelineItem[] = [
  {
    id: "p1", title: "KOVA — “Beige is a personality flaw” reel", brandId: "kova",
    stage: "ideas", gate: "awaiting", hookScore: 88,
    platforms: ["ig-reel", "tiktok"], due: "2026-09-28", updatedAt: "2026-09-26T08:12:00",
  },
  {
    id: "p2", title: "Juniper — “Your apartment smells like nothing” story", brandId: "juniper",
    stage: "ideas", gate: "auto-ok", hookScore: 74,
    platforms: ["ig-story"], due: "2026-09-29", updatedAt: "2026-09-26T07:40:00",
  },
  {
    id: "p3", title: "KOVA — 214-day wear-test carousel", brandId: "kova",
    stage: "producing", gate: "awaiting", hookScore: 81,
    platforms: ["ig-feed"], due: "2026-09-27", updatedAt: "2026-09-25T18:02:00",
  },
  {
    id: "p4", title: "Juniper — Pour-day ASMR reel", brandId: "juniper",
    stage: "producing", gate: "auto-ok", hookScore: 79,
    platforms: ["ig-reel", "tiktok", "shorts"], due: "2026-09-28", updatedAt: "2026-09-25T16:44:00",
  },
  {
    id: "p5", title: "KOVA — Offer hammer: launch-week pricing", brandId: "kova",
    stage: "review", gate: "awaiting", hookScore: 72,
    platforms: ["ig-feed", "x"], due: "2026-09-27", updatedAt: "2026-09-26T06:15:00",
  },
  {
    id: "p6", title: "Juniper — “Slow light” manifesto post", brandId: "juniper",
    stage: "review", gate: "overridden", hookScore: 68,
    platforms: ["ig-feed"], due: "2026-09-30", updatedAt: "2026-09-24T11:30:00",
  },
  {
    id: "p7", title: "KOVA — Countdown: 47 hours left", brandId: "kova",
    stage: "scheduled", gate: "auto-ok", hookScore: 83,
    platforms: ["ig-reel", "ig-story"], due: "2026-09-27", updatedAt: "2026-09-26T05:00:00",
  },
  {
    id: "p8", title: "Juniper — Fall scent drop teaser", brandId: "juniper",
    stage: "scheduled", gate: "auto-ok", hookScore: 77,
    platforms: ["ig-feed", "tiktok"], due: "2026-09-29", updatedAt: "2026-09-25T09:20:00",
  },
  {
    id: "p9", title: "KOVA — “Stop scrolling” launch reel", brandId: "kova",
    stage: "live", gate: "auto-ok", hookScore: 91,
    platforms: ["ig-reel", "tiktok", "shorts"], due: "2026-09-24", updatedAt: "2026-09-24T19:00:00",
  },
];

function sched(
  id: string, title: string, brandId: string, platform: ScheduledPost["platform"],
  date: string, time: string, status: ScheduledPost["status"]
): ScheduledPost {
  return { id, title, brandId, platform, date, time, status };
}

const SEED_SCHEDULED_BASE: ScheduledPost[] = [
  sched("s01", "KOVA — Countdown reel", "kova", "ig-reel", "2026-09-27", "18:00", "scheduled"),
  sched("s02", "KOVA — Countdown story cut", "kova", "ig-story", "2026-09-27", "18:15", "scheduled"),
  sched("s03", "Juniper — Pour-day ASMR", "juniper", "ig-reel", "2026-09-28", "12:00", "queued"),
  sched("s04", "Juniper — Pour-day TikTok cut", "juniper", "tiktok", "2026-09-28", "12:20", "queued"),
  sched("s05", "KOVA — Offer hammer feed post", "kova", "ig-feed", "2026-09-29", "10:00", "queued"),
  sched("s06", "Juniper — Fall scent teaser", "juniper", "ig-feed", "2026-09-29", "16:00", "queued"),
  sched("s07", "Juniper — Fall scent TikTok cut", "juniper", "tiktok", "2026-09-29", "16:20", "queued"),
  sched("s08", "KOVA — Wear-test carousel", "kova", "ig-feed", "2026-10-01", "10:00", "queued"),
  sched("s09", "KOVA — Wear-test Shorts cut", "kova", "shorts", "2026-10-01", "14:00", "queued"),
  sched("s10", "Juniper — Manifesto post", "juniper", "ig-feed", "2026-10-02", "09:00", "queued"),
  sched("s11", "KOVA — “Stop scrolling” reel", "kova", "ig-reel", "2026-09-24", "19:00", "posted"),
  sched("s12", "KOVA — “Stop scrolling” TikTok", "kova", "tiktok", "2026-09-24", "19:20", "posted"),
  sched("s13", "Juniper — Wick-story carousel", "juniper", "ig-feed", "2026-09-20", "11:00", "posted"),
];

// Oct 3 is deliberately overloaded: 27 queued posts trip the IG rate-limit guard.
const OVERLOAD_DATE = "2026-10-03";
const OVERLOAD_PLATFORMS: ScheduledPost["platform"][] = ["ig-feed", "ig-reel", "tiktok"];
const SEED_OVERLOAD: ScheduledPost[] = Array.from({ length: 27 }, (_, i) => {
  const n = i + 1;
  const hh = String(9 + Math.floor(i / 3)).padStart(2, "0");
  const mm = ["00", "20", "40"][i % 3];
  return sched(
    `sx${String(n).padStart(2, "0")}`,
    `KOVA — Launch reminder ${n}`,
    "kova",
    OVERLOAD_PLATFORMS[i % 3],
    OVERLOAD_DATE,
    `${hh}:${mm}`,
    "queued"
  );
});

export const SEED_SCHEDULED: ScheduledPost[] = [...SEED_SCHEDULED_BASE, ...SEED_OVERLOAD];

export const SEED_ANALYTICS: AnalyticsPost[] = [
  { id: "a01", title: "Stop scrolling. The drop is live.", brandId: "kova", platform: "ig-reel", date: "2026-09-20", headlineWords: 6, hasQuestion: false, hasCta: true, hookScore: 91, reach: 120400, likes: 9840, comments: 412, shares: 1930, saves: 2210 },
  { id: "a02", title: "Your sneakers are lying to you.", brandId: "kova", platform: "tiktok", date: "2026-09-18", headlineWords: 6, hasQuestion: false, hasCta: true, hookScore: 88, reach: 96400, likes: 7210, comments: 388, shares: 1540, saves: 1870 },
  { id: "a03", title: "Worn 214 days straight. Still sharp.", brandId: "kova", platform: "ig-feed", date: "2026-09-15", headlineWords: 6, hasQuestion: false, hasCta: true, hookScore: 84, reach: 48200, likes: 3120, comments: 144, shares: 620, saves: 940 },
  { id: "a04", title: "Your apartment smells like nothing.", brandId: "juniper", platform: "ig-reel", date: "2026-09-19", headlineWords: 5, hasQuestion: false, hasCta: true, hookScore: 79, reach: 61300, likes: 4280, comments: 236, shares: 890, saves: 1210 },
  { id: "a05", title: "POV: your 6PM just got slower.", brandId: "juniper", platform: "tiktok", date: "2026-09-17", headlineWords: 6, hasQuestion: false, hasCta: false, hookScore: 76, reach: 54800, likes: 3910, comments: 198, shares: 720, saves: 1040 },
  { id: "a06", title: "Why do all minimal sneakers look the same now?", brandId: "kova", platform: "ig-reel", date: "2026-09-16", headlineWords: 9, hasQuestion: true, hasCta: true, hookScore: 74, reach: 71900, likes: 4020, comments: 612, shares: 840, saves: 690 },
  { id: "a07", title: "We spent 11 months on the wick. Here's why that matters for your evenings at home.", brandId: "juniper", platform: "ig-feed", date: "2026-09-14", headlineWords: 16, hasQuestion: false, hasCta: false, hookScore: 58, reach: 21400, likes: 980, comments: 64, shares: 120, saves: 150 },
  { id: "a08", title: "47 hours left on launch pricing.", brandId: "kova", platform: "x", date: "2026-09-21", headlineWords: 6, hasQuestion: false, hasCta: true, hookScore: 82, reach: 38900, likes: 1240, comments: 188, shares: 940, saves: 210 },
  { id: "a09", title: "Slow light. Tonight.", brandId: "juniper", platform: "ig-story", date: "2026-09-22", headlineWords: 3, hasQuestion: false, hasCta: true, hookScore: 71, reach: 18700, likes: 1420, comments: 42, shares: 180, saves: 320 },
  { id: "a10", title: "One pair. Every outfit. Zero thought.", brandId: "kova", platform: "shorts", date: "2026-09-13", headlineWords: 6, hasQuestion: false, hasCta: true, hookScore: 80, reach: 44500, likes: 2890, comments: 132, shares: 510, saves: 780 },
  { id: "a11", title: "Which scent are you really? Take the 10-second quiz.", brandId: "juniper", platform: "ig-feed", date: "2026-09-12", headlineWords: 10, hasQuestion: true, hasCta: true, hookScore: 66, reach: 29800, likes: 1730, comments: 402, shares: 310, saves: 280 },
  { id: "a12", title: "Introducing the KOVA Court Low, our new minimalist sneaker designed for everyday wear.", brandId: "kova", platform: "ig-feed", date: "2026-09-10", headlineWords: 13, hasQuestion: false, hasCta: false, hookScore: 47, reach: 16200, likes: 640, comments: 38, shares: 70, saves: 90 },
];

export const SEED_ACTIVITY: ActivityItem[] = [
  { id: "ac1", text: "Slop Shield passed “214-day wear-test carousel” — 7/7 checks green", time: "12m ago", kind: "qc" },
  { id: "ac2", text: "“47 hours left” moved to Scheduled · 2 placements", time: "1h ago", kind: "system" },
  { id: "ac3", text: "Instagram auto-posted “Stop scrolling” reel — 12.4k reach in 6h", time: "3h ago", kind: "post" },
  { id: "ac4", text: "3 concepts generated from brief “Fall scent drop”", time: "5h ago", kind: "concept" },
  { id: "ac5", text: "Rate-limit warning: Oct 3 has 27 queued posts", time: "6h ago", kind: "system" },
  { id: "ac6", text: "You approved “Slow light” manifesto with an override note", time: "Yesterday", kind: "qc" },
  { id: "ac7", text: "Trend Radar: “Silent unboxing” hit 94 heat", time: "Yesterday", kind: "system" },
  { id: "ac8", text: "Juniper brand kit updated — accent shifted to amber", time: "2 days ago", kind: "system" },
];

export const CONNECTIONS = [
  { id: "instagram", label: "Instagram", note: "@kova.studio", blurb: "Post reels, carousels and stories. 25 auto-posts/day." },
  { id: "threads", label: "Threads", note: "@kova.studio", blurb: "Text-first drops and launch threads." },
  { id: "facebook", label: "Facebook", note: "KOVA page", blurb: "Feed posts and Reels via Pages API." },
  { id: "tiktok", label: "TikTok", note: "—", blurb: "Direct posting after app audit approval." },
  { id: "youtube", label: "YouTube Shorts", note: "—", blurb: "Upload Shorts to the brand channel." },
  { id: "x", label: "X", note: "—", blurb: "Post text + 16:9 creative." },
];
