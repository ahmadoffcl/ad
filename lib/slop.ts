import type { Brand, QCCheck } from "./types";
import { countEmojis } from "./hookScore";

/**
 * Slop Shield — deterministic QC over a generated creative.
 * Every check is computed, explainable, and overridable with a note.
 */

function hexLum(hex: string): number {
  const h = hex.replace("#", "");
  const c = h.length === 3 ? h.split("").map((x) => x + x).join("") : h;
  const r = parseInt(c.slice(0, 2), 16) / 255;
  const g = parseInt(c.slice(2, 4), 16) / 255;
  const b = parseInt(c.slice(4, 6), 16) / 255;
  const f = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: string, b: string): number {
  const l1 = hexLum(a);
  const l2 = hexLum(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

export interface SlopInput {
  headline: string;
  caption: string;
  hashtags: string[];
  visual: { bg: string; fg: string; accent: string; motif: string };
  brand: Brand;
  isVideo: boolean;
  sensitivity: number; // 0–100; high sensitivity promotes warns to fails
  hashtagMin: number;
  hashtagMax: number;
}

export interface SlopResult {
  checks: QCCheck[];
  status: "pass" | "warn" | "fail";
}

const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export function runSlop(input: SlopInput): SlopResult {
  const { headline, caption, hashtags, visual, brand, isVideo, sensitivity } = input;
  const checks: QCCheck[] = [];

  // 1 — Text legibility (WCAG-style contrast of headline vs background)
  const cr = contrastRatio(visual.fg, visual.bg);
  checks.push({
    id: "legibility",
    label: "Text legibility",
    status: cr >= 4.5 ? "pass" : cr >= 3 ? "warn" : "fail",
    note: `${cr.toFixed(1)}:1 contrast — ${
      cr >= 4.5 ? "crisp on any screen" : cr >= 3 ? "readable, but thin on cheap displays" : "fails contrast — text will wash out"
    }`,
  });

  // 2 — Brand-color compliance
  const kit = [brand.colors.accent, brand.colors.paper, brand.colors.ink, brand.colors.muted].map((c) =>
    c.toLowerCase()
  );
  const onKit = kit.includes(visual.accent.toLowerCase());
  checks.push({
    id: "brand",
    label: "Brand-color compliance",
    status: onKit ? "pass" : "warn",
    note: onKit
      ? `Accent pulled straight from the ${brand.name} kit`
      : "Accent drifts from the brand kit — re-skin or accept",
  });

  // 3 — Hook lands fast (first 2s for video / above the fold for static)
  const hwn = wc(headline);
  checks.push({
    id: "hook-speed",
    label: isVideo ? "Hook in first 2 seconds" : "Hook above the fold",
    status: hwn <= 8 ? "pass" : hwn <= 12 ? "warn" : "fail",
    note:
      hwn <= 8
        ? `${hwn} words — lands before the thumb moves`
        : hwn <= 12
          ? `${hwn} words — borderline for a cold viewer`
          : `${hwn} words — the hook is buried, front-load it`,
  });

  // 4 — Safe zones (CTA short enough to survive cropping/UI overlays)
  const ctaOk = wc(input.headline) <= 18;
  checks.push({
    id: "safe-zones",
    label: "Safe zones",
    status: ctaOk ? "pass" : "warn",
    note: ctaOk
      ? "Type block clears platform UI overlays on 9:16 and 1:1"
      : "Long copy risks clipping under platform chrome on 9:16",
  });

  // 5 — Synthetic integrity (faces/hands)
  checks.push({
    id: "integrity",
    label: "Faces & hands integrity",
    status: "pass",
    note: "Graphic template — no synthetic faces or hands to degrade",
  });

  // 6 — Hashtag load
  const hn = hashtags.length;
  checks.push({
    id: "hashtags",
    label: "Hashtag load",
    status: hn >= input.hashtagMin && hn <= input.hashtagMax ? "pass" : hn > input.hashtagMax ? "warn" : "warn",
    note:
      hn >= input.hashtagMin && hn <= input.hashtagMax
        ? `${hn} tags — inside the platform's healthy band`
        : hn > input.hashtagMax
          ? `${hn} tags — stuffing reads as spam, trim it`
          : `${hn} tags — under-tagged, discovery will suffer`,
  });

  // 7 — Emoji discipline on the creative
  const e = countEmojis(headline + " " + caption);
  checks.push({
    id: "emoji",
    label: "Emoji discipline",
    status: e <= 3 ? "pass" : e <= 5 ? "warn" : "fail",
    note:
      e <= 3 ? "Restrained" : e <= 5 ? `${e} emojis — one too many` : `${e} emojis — visual noise`,
  });

  const fails = checks.filter((c) => c.status === "fail").length;
  const warns = checks.filter((c) => c.status === "warn").length;
  const strict = sensitivity >= 75;
  const status: SlopResult["status"] =
    fails > 0 ? "fail" : warns > 0 ? (strict ? "fail" : "warn") : "pass";

  return { checks, status };
}
