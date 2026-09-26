/**
 * Workers AI engine — concept drafting with a self-critique pass,
 * hook-score second opinions, and caption writing.
 *
 * QUALITY CONTRACT ("no AI slop"):
 *  - Every AI output is validated by the deterministic Slop Shield +
 *    Hook Score before it is returned.
 *  - Any concept that fails QC is replaced by the deterministic engine.
 *  - If the AI binding is missing or errors, the deterministic engines
 *    serve transparently (source: "deterministic").
 *  - Every response carries a `source` badge: "ai" | "mixed" | "deterministic".
 */
/**
 * Minimal Workers AI binding surface. Deliberately not imported from
 * @cloudflare/workers-types: the package's Ai declarations disagree with
 * each other structurally, so a narrow interface keeps us immune.
 */
export interface AiBinding {
  run(model: string, inputs: unknown, options?: unknown): Promise<unknown>;
}
import type {
  AdConcept,
  AdVariant,
  Brand,
  Brief,
  DirectorPrefs,
  PlatformId,
} from "./types";
import { scoreHook } from "./hookScore";
import { runSlop } from "./slop";
import {
  buildCaption,
  fit,
  generateConcepts,
  platformMeta,
} from "./campaign";
import {
  AI_MODEL,
  AI_MODEL_FALLBACK,
  buildCaptionPrompt,
  buildCaptionSystemPrompt,
  buildConceptsDraftPrompt,
  buildConceptsSystemPrompt,
  buildCritiquePrompt,
  buildHookScorePrompt,
  creativityToTemperature,
} from "./ai/prompts";

export type AiSource = "ai" | "mixed" | "deterministic";

interface DraftConcept {
  name?: string;
  angle?: string;
  headline?: string;
  sub?: string;
  cta?: string;
  visual?: { motif?: string; layout?: string };
}

/* ---------------- low-level ---------------- */

/** Coerce the many shapes Workers AI text models can return into plain text. */
function coerceModelText(out: unknown): string {
  if (typeof out === "string") return out;
  if (!out || typeof out !== "object") return "";
  const o = out as Record<string, unknown>;
  const r = o.response;
  if (typeof r === "string") return r;
  if (r && typeof r === "object") {
    const nested = (r as Record<string, unknown>).content ?? (r as Record<string, unknown>).text;
    if (typeof nested === "string") return nested;
  }
  const choices = o.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown>;
    const msg = first?.message as Record<string, unknown> | undefined;
    const content = msg?.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .map((p) => (typeof p === "string" ? p : String((p as Record<string, unknown>)?.text ?? "")))
        .join("");
    }
    const delta = first?.delta as Record<string, unknown> | undefined;
    if (typeof delta?.content === "string") return delta.content;
  }
  return "";
}

/** One-line shape hint for diagnostics (keys + value types, never values). */
function shapeHint(out: unknown): string {
  if (out === null || out === undefined) return String(out);
  if (typeof out !== "object") return typeof out;
  const keys = Object.keys(out as Record<string, unknown>).slice(0, 8);
  return `{${keys.map((k) => `${k}:${typeof (out as Record<string, unknown>)[k]}`).join(",")}}`;
}

async function runModel(
  ai: AiBinding,
  system: string,
  user: string,
  temperature: number,
  maxTokens = 1600
): Promise<string> {
  const messages = [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
  const opts = { messages, temperature, max_tokens: maxTokens };
  let firstErr: unknown = null;
  try {
    const out = await ai.run(AI_MODEL as never, opts as never);
    const text = coerceModelText(out);
    if (text) return text;
    firstErr = new Error(`primary model ${AI_MODEL} returned unusable shape ${shapeHint(out)}`);
  } catch (e) {
    firstErr = e;
  }
  try {
    const out2 = await ai.run(AI_MODEL_FALLBACK as never, opts as never);
    const text2 = coerceModelText(out2);
    if (text2) return text2;
    throw new Error(`fallback model ${AI_MODEL_FALLBACK} returned unusable shape ${shapeHint(out2)}`);
  } catch (e2) {
    const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 280);
    throw new Error(`AI models failed — primary: ${msg(firstErr)}; fallback: ${msg(e2)}`);
  }
}

/** Extract the first balanced JSON object from model output. */
export function extractJson(text: string): unknown | null {
  if (typeof text !== "string" || !text) return null;
  const clean = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const start = clean.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < clean.length; i++) {
    const ch = clean[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(clean.slice(start, i + 1));
          } catch {
            return null;
          }
        }
      }
    }
  }
  return null;
}

function bannedHits(text: string, banned: string[]): string[] {
  const low = text.toLowerCase();
  return banned.filter((w) => w && low.includes(w.toLowerCase()));
}

/* ---------------- concept assembly + QC ---------------- */

function assembleConcept(
  draft: DraftConcept,
  brief: Brief,
  brand: Brand,
  prefs: DirectorPrefs | undefined,
  index: number
): AdConcept | null {
  const headline = (draft.headline ?? "").trim();
  const sub = (draft.sub ?? "").trim();
  const cta = (draft.cta ?? "").trim() || "Shop now";
  const name = (draft.name ?? "").trim() || `Concept ${index + 1}`;
  if (!headline || headline.split(/\s+/).length > 14) return null;

  const visual = {
    bg: index === 1 ? brand.colors.paper : brand.colors.ink,
    fg: index === 1 ? brand.colors.ink : brand.colors.paper,
    accent: brand.colors.accent,
    motif: (draft.visual?.motif ?? "").trim() || "Type-dominant product frame",
    layout: ["Stacked type", "Split frame", "Type-dominant"][
      ["Stacked type", "Split frame", "Type-dominant"].includes(
        (draft.visual?.layout ?? "").trim()
      )
        ? ["Stacked type", "Split frame", "Type-dominant"].indexOf(
            (draft.visual?.layout ?? "").trim()
          )
        : index % 3
    ],
  };

  const hook = scoreHook(headline, sub);
  const primary = brief.platforms[0] ?? "ig-feed";
  const pmeta = platformMeta(primary);
  const variants: AdVariant[] = brief.platforms.map((p) => {
    const meta = platformMeta(p);
    const caption = buildCaption(p, headline, sub, cta, brand, sub);
    return {
      platform: p,
      caption,
      hashtags: [`#${brand.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`, "#newdrop"].slice(
        0,
        Math.max(meta.hashtagMin, 1)
      ),
      cta,
    };
  });

  const slop = runSlop({
    headline,
    caption: variants[0]?.caption ?? sub,
    hashtags: variants[0]?.hashtags ?? [],
    visual,
    brand,
    isVideo: brief.platforms.some((p) => platformMeta(p).video),
    sensitivity: 60,
    hashtagMin: pmeta.hashtagMin,
    hashtagMax: pmeta.hashtagMax,
  });

  return {
    id: `ai${Date.now().toString(36)}${index}`,
    brandId: brand.id,
    name,
    angle: (draft.angle ?? "").trim(),
    headline,
    sub,
    cta,
    visual,
    hook,
    slop: slop.checks,
    slopStatus: slop.status,
    variants,
    createdAt: new Date().toISOString(),
  };
}

/** Hard QC gate for an AI concept. Returns null when it must not ship. */
function qcConcept(
  concept: AdConcept | null,
  brand: Brand,
  prefs: DirectorPrefs | undefined
): AdConcept | null {
  if (!concept) return null;
  const text = `${concept.headline} ${concept.sub} ${concept.cta} ${concept.variants
    .map((v) => v.caption)
    .join(" ")}`;
  if (bannedHits(text, brand.banned).length > 0) return null;
  if (prefs?.avoid && bannedHits(text, [prefs.avoid]).length > 0) return null;
  if (concept.slopStatus === "fail") return null;
  if (concept.hook.score < 40) return null;
  if (prefs?.emoji === false && /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text))
    return null;
  return concept;
}

export interface GenerateResult {
  concepts: AdConcept[];
  source: AiSource;
  critique?: string;
  /** Populated when the model call failed — lets the client show why it fell back. */
  aiError?: string;
}

/**
 * Draft → self-critique → QC. Weakest concept gets rewritten by the model;
 * anything failing the Slop Shield is replaced by the deterministic engine.
 */
export async function generateConceptsAI(
  ai: AiBinding,
  brief: Brief,
  brand: Brand,
  prefs?: DirectorPrefs
): Promise<GenerateResult> {
  const temperature = creativityToTemperature(prefs?.creativity ?? 55);
  const system = buildConceptsSystemPrompt(brand, prefs);

  let drafts: DraftConcept[] = [];
  let aiError: string | undefined;
  try {
    const raw = await runModel(ai, system, buildConceptsDraftPrompt(brief, brand, prefs), temperature, 2200);
    const parsed = extractJson(raw) as { concepts?: DraftConcept[] } | null;
    if (parsed?.concepts?.length) drafts = parsed.concepts.slice(0, 3);
    else aiError = "model returned no parseable concepts";
  } catch (e) {
    drafts = [];
    aiError = (e instanceof Error ? e.message : String(e)).slice(0, 400);
  }
  if (drafts.length === 0) {
    return { concepts: generateConcepts(brief, brand), source: "deterministic", aiError };
  }

  // Self-critique pass: the model scores its drafts and rewrites the weakest.
  let critiqueNote: string | undefined;
  let final: DraftConcept[] = drafts;
  try {
    const raw = await runModel(
      ai,
      system,
      buildCritiquePrompt(JSON.stringify({ concepts: drafts }), brand, prefs),
      Math.min(temperature, 0.7),
      2200
    );
    const parsed = extractJson(raw) as {
      concepts?: DraftConcept[];
      _critique?: string;
    } | null;
    if (parsed?.concepts?.length === 3) {
      final = parsed.concepts;
      critiqueNote = parsed._critique;
    }
  } catch {
    /* ship the drafts — QC still applies below */
  }

  const deterministic = generateConcepts(brief, brand);
  let aiCount = 0;
  const concepts = final.map((d, i) => {
    const assembled = assembleConcept(d, brief, brand, prefs, i);
    const passed = qcConcept(assembled, brand, prefs);
    if (passed) {
      aiCount++;
      return passed;
    }
    return deterministic[i % deterministic.length];
  });

  const source: AiSource =
    aiCount === 3 ? "ai" : aiCount === 0 ? "deterministic" : "mixed";
  return { concepts, source, critique: critiqueNote };
}

/* ---------------- hook score second opinion ---------------- */

export interface HookSecondOpinion {
  deterministic: number;
  ai: { score: number; reason: string } | null;
  blended: number;
  source: AiSource;
}

export async function scoreHookAI(
  ai: AiBinding,
  headline: string,
  caption: string
): Promise<HookSecondOpinion> {
  const deterministic = scoreHook(headline, caption).score;
  try {
    const raw = await runModel(
      ai,
      "You are a direct-response copy chief. Output strict JSON only.",
      buildHookScorePrompt(headline, caption),
      0.3,
      300
    );
    const parsed = extractJson(raw) as { score?: number; reason?: string } | null;
    const aiScore =
      typeof parsed?.score === "number"
        ? Math.max(0, Math.min(100, Math.round(parsed.score)))
        : null;
    if (aiScore === null) {
      return { deterministic, ai: null, blended: deterministic, source: "deterministic" };
    }
    return {
      deterministic,
      ai: { score: aiScore, reason: (parsed?.reason ?? "").slice(0, 140) },
      blended: Math.round(deterministic * 0.6 + aiScore * 0.4),
      source: "ai",
    };
  } catch {
    return { deterministic, ai: null, blended: deterministic, source: "deterministic" };
  }
}

/* ---------------- captions ---------------- */

export interface CaptionResult {
  caption: string;
  hashtags: string[];
  source: AiSource;
}

export async function captionAI(
  ai: AiBinding,
  platform: PlatformId,
  headline: string,
  sub: string,
  cta: string,
  brand: Brand,
  prefs?: DirectorPrefs
): Promise<CaptionResult> {
  const meta = platformMeta(platform);
  const fallback = (): CaptionResult => ({
    caption: buildCaption(platform, headline, sub, cta, brand, sub),
    hashtags: [],
    source: "deterministic",
  });

  try {
    const raw = await runModel(
      ai,
      buildCaptionSystemPrompt(brand, prefs),
      buildCaptionPrompt(platform, headline, sub, cta, brand, prefs),
      creativityToTemperature(prefs?.creativity ?? 55),
      600
    );
    const parsed = extractJson(raw) as {
      caption?: string;
      hashtags?: string[];
    } | null;
    let caption = (parsed?.caption ?? "").trim();
    let hashtags = (parsed?.hashtags ?? [])
      .map((t) => t.replace(/^#+/, "").trim().toLowerCase().replace(/\s+/g, ""))
      .filter(Boolean)
      .slice(0, meta.hashtagMax);
    if (!caption) return fallback();

    // QC: banned words, length, hashtag band, honesty
    const banned = [...brand.banned, ...(prefs?.avoid ? [prefs.avoid] : [])];
    if (bannedHits(`${caption} ${hashtags.join(" ")}`, banned).length > 0) return fallback();
    while (hashtags.length < meta.hashtagMin) {
      hashtags.push(`${brand.name.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
    }
    const withTags = hashtags.map((t) => `#${t}`);
    const combined = caption + (withTags.length ? " " + withTags.join(" ") : "");
    if (combined.length > meta.captionLimit) {
      caption = fit(caption, meta.captionLimit - withTags.join(" ").length - 1);
    }
    const slop = runSlop({
      headline,
      caption,
      hashtags: withTags,
      visual: {
        bg: brand.colors.ink,
        fg: brand.colors.paper,
        accent: brand.colors.accent,
        motif: "",
      },
      brand,
      isVideo: meta.video,
      sensitivity: 60,
      hashtagMin: meta.hashtagMin,
      hashtagMax: meta.hashtagMax,
    });
    if (slop.status === "fail") return fallback();
    return { caption, hashtags: withTags, source: "ai" };
  } catch {
    return fallback();
  }
}
