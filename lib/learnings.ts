import type { AnalyticsPost, Learning } from "./types";

/**
 * Memory / Learnings — derived from real post performance, not vibes.
 * Every learning cites its sample so the studio can trust it.
 */

const eng = (p: AnalyticsPost) =>
  (p.likes + p.comments + p.shares + p.saves) / Math.max(1, p.reach);
const commentsRate = (p: AnalyticsPost) => p.comments / Math.max(1, p.reach);
const sharesRate = (p: AnalyticsPost) => p.shares / Math.max(1, p.reach);

const avg = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const lift = (a: number, b: number) =>
  Math.round(((a - b) / Math.max(b, 1e-9)) * 100);

export function engagementOf(p: AnalyticsPost): number {
  return eng(p);
}

export function deriveLearnings(posts: AnalyticsPost[]): Learning[] {
  const out: Learning[] = [];

  const short = posts.filter((p) => p.headlineWords <= 8);
  const long = posts.filter((p) => p.headlineWords > 8);
  if (short.length >= 2 && long.length >= 2) {
    const d = lift(avg(short.map(eng)), avg(long.map(eng)));
    out.push({
      title: "Short hooks keep the save",
      detail: `Hooks of 8 words or fewer (n=${short.length}) vs longer hooks (n=${long.length}), measured on total engagement per reach.`,
      delta: `${d >= 0 ? "+" : ""}${d}% engagement`,
      tone: d > 0 ? "up" : "neutral",
    });
  }

  const q = posts.filter((p) => p.hasQuestion);
  const nq = posts.filter((p) => !p.hasQuestion);
  if (q.length >= 2 && nq.length >= 2) {
    const d = lift(avg(q.map(commentsRate)), avg(nq.map(commentsRate)));
    out.push({
      title: "Questions buy comments",
      detail: `Question headlines (n=${q.length}) vs statements (n=${nq.length}), measured on comments per reach.`,
      delta: `${d >= 0 ? "+" : ""}${d}% comments`,
      tone: d > 0 ? "up" : "neutral",
    });
  }

  const cta = posts.filter((p) => p.hasCta);
  const nocta = posts.filter((p) => !p.hasCta);
  if (cta.length >= 2 && nocta.length >= 2) {
    const d = lift(avg(cta.map(sharesRate)), avg(nocta.map(sharesRate)));
    out.push({
      title: "A CTA is a share trigger",
      detail: `Posts with an explicit call to action (n=${cta.length}) vs without (n=${nocta.length}), measured on shares per reach.`,
      delta: `${d >= 0 ? "+" : ""}${d}% shares`,
      tone: d > 0 ? "up" : "neutral",
    });
  }

  const hi = posts.filter((p) => p.hookScore >= 75);
  const lo = posts.filter((p) => p.hookScore < 60);
  if (hi.length >= 2 && lo.length >= 2) {
    const d = lift(avg(hi.map((p) => p.reach)), avg(lo.map((p) => p.reach)));
    out.push({
      title: "Hook Score predicts reach",
      detail: `Posts scoring 75+ (n=${hi.length}) vs under 60 (n=${lo.length}). The score isn't decoration.`,
      delta: `${d >= 0 ? "+" : ""}${d}% avg reach`,
      tone: d > 0 ? "up" : "neutral",
    });
  }

  const byPlatform = new Map<string, number[]>();
  posts.forEach((p) => {
    const arr = byPlatform.get(p.platform) ?? [];
    arr.push(eng(p));
    byPlatform.set(p.platform, arr);
  });
  if (byPlatform.size >= 2) {
    const ranked = [...byPlatform.entries()]
      .map(([k, v]) => ({ k, v: avg(v), n: v.length }))
      .sort((a, b) => b.v - a.v);
    const best = ranked[0];
    out.push({
      title: `${platformLabel(best.k)} is the workhorse`,
      detail: `Highest engagement per reach across ${ranked.length} placements (n=${best.n} posts). Feed it first.`,
      delta: "top placement",
      tone: "up",
    });
  }

  return out;
}

function platformLabel(id: string): string {
  const map: Record<string, string> = {
    "ig-feed": "Instagram Feed",
    "ig-reel": "Instagram Reels",
    "ig-story": "Instagram Stories",
    tiktok: "TikTok",
    shorts: "YouTube Shorts",
    x: "X",
  };
  return map[id] ?? id;
}
