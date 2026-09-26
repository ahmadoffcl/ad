import type { HookResult, ScorePart } from "./types";

/**
 * Hook Score — a deterministic heuristic (0–100) that grades how hard an
 * opening line grabs. No randomness, no black box: every point is explained.
 */

const POWER_WORDS = [
  "stop", "secret", "free", "new", "proven", "exact", "mistake", "warning",
  "finally", "shocking", "brutal", "honest", "nobody", "everyone", "never",
  "steal", "hack", "truth", "banned", "urgent", "limited", "win", "fix",
  "broken", "insane", "wild", "forbidden", "exposed", "guaranteed", "instant",
];

const CTA_WORDS = [
  "shop", "buy", "get", "grab", "claim", "try", "order", "book", "tap",
  "click", "link", "dm", "comment", "follow", "save", "swipe", "start",
  "join", "sign", "cop",
];

const QUESTION_OPENERS = [
  "why", "how", "what", "when", "which", "who", "can", "do", "does", "is",
  "are", "should", "have",
];

const CURIOSITY_WORDS = [
  "secret", "nobody", "never", "mistake", "truth", "won't", "wont", "nobody's",
  "hidden", "nobody",
];

function words(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean);
}

function clean(w: string): string {
  return w.toLowerCase().replace(/[^a-z']/g, "");
}

export function countEmojis(s: string): number {
  const m = s.match(/\p{Extended_Pictographic}/gu);
  return m ? m.length : 0;
}

function grade(score: number): string {
  if (score >= 85) return "Lethal";
  if (score >= 70) return "Strong";
  if (score >= 55) return "Workable";
  if (score >= 40) return "Shaky";
  return "Dead on arrival";
}

export function scoreHook(headline: string, caption: string): HookResult {
  const h = headline.trim() || "Untitled hook";
  const hw = words(h);
  const first12 = hw.slice(0, 12).map(clean);
  const lower = h.toLowerCase();
  const capLower = caption.toLowerCase();

  // 1 — Hook-word power (0–25)
  const powerHits = first12.filter((w) => POWER_WORDS.includes(w)).length;
  const powerPts = Math.min(25, powerHits * 9);
  const parts: ScorePart[] = [
    {
      label: "Hook-word power",
      points: powerPts,
      max: 25,
      note:
        powerHits > 0
          ? `${powerHits} power ${powerHits === 1 ? "word" : "words"} in the opening line`
          : "No power words — the opening reads flat",
    },
  ];

  // 2 — Brevity (0–20)
  const n = hw.length;
  const brevPts = n <= 6 ? 20 : n <= 8 ? 17 : n <= 10 ? 13 : n <= 13 ? 9 : n <= 16 ? 5 : 2;
  parts.push({
    label: "Brevity",
    points: brevPts,
    max: 20,
    note: `${n} words — ${n <= 8 ? "lands before the scroll" : n <= 13 ? "acceptable, could tighten" : "too long for a hook"}`,
  });

  // 3 — Pattern interrupt (0–15)
  const first = clean(hw[0] || "");
  let intPts = 3;
  let intNote = "Opens like everything else in the feed";
  if (/^\d/.test(h)) {
    intPts = 15;
    intNote = "Opens with a number — the eye stops";
  } else if (["stop", "pov", "warning", "watch"].includes(first)) {
    intPts = 14;
    intNote = `Opens with "${hw[0]}" — a hard interrupt`;
  } else if (QUESTION_OPENERS.includes(first) || h.endsWith("?")) {
    intPts = 13;
    intNote = "Opens as a question — the brain answers";
  } else if (/\d/.test(h)) {
    intPts = 8;
    intNote = "Contains a number mid-line — decent pull";
  } else if (["you", "your"].includes(first)) {
    intPts = 7;
    intNote = "Speaks to the viewer directly";
  }
  parts.push({ label: "Pattern interrupt", points: intPts, max: 15, note: intNote });

  // 4 — Curiosity gap (0–15)
  let curPts = 3;
  let curNote = "No open loop — nothing left to resolve";
  if (/(\?|\.\.\.|…)/.test(h)) {
    curPts = 15;
    curNote = "Unresolved punctuation — the loop stays open";
  } else if (first12.some((w) => CURIOSITY_WORDS.includes(w))) {
    curPts = 12;
    curNote = "Curiosity language detected";
  } else if (first12.includes("you") || first12.includes("your")) {
    curPts = 7;
    curNote = "Personal, but the loop closes too fast";
  }
  parts.push({ label: "Curiosity gap", points: curPts, max: 15, note: curNote });

  // 5 — CTA presence (0–15)
  const capWords = words(capLower).map(clean);
  const ctaInCap = capWords.some((w) => CTA_WORDS.includes(w));
  const ctaInHead = first12.some((w) => CTA_WORDS.includes(w));
  const ctaPts = ctaInCap ? 15 : ctaInHead ? 11 : 3;
  parts.push({
    label: "CTA presence",
    points: ctaPts,
    max: 15,
    note: ctaInCap
      ? "Caption tells the viewer exactly what to do"
      : ctaInHead
        ? "CTA lives in the hook — move it to the caption"
        : "No call to action — attention with nowhere to go",
  });

  // 6 — Emoji discipline (0–10)
  const e = countEmojis(h + " " + caption);
  const emoPts = e <= 2 ? 10 : e === 3 ? 6 : e <= 5 ? 3 : 1;
  parts.push({
    label: "Emoji discipline",
    points: emoPts,
    max: 10,
    note:
      e === 0
        ? "Clean — zero emoji, full confidence"
        : e <= 2
          ? `${e} ${e === 1 ? "emoji" : "emojis"} — restrained and effective`
          : e <= 5
            ? `${e} emojis — starting to look desperate`
            : `${e} emojis — emoji salad, trust drops`,
  });

  const score = parts.reduce((s, p) => s + p.points, 0);
  void lower;
  return { score, grade: grade(score), parts };
}
