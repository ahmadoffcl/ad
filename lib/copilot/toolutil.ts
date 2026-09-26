/**
 * Shared building blocks for Forge's tool registry.
 * Category files import from here — never from the tools index (avoids cycles).
 */
import type { D1Database, Ai } from "@cloudflare/workers-types";
import type { Brand, PlatformId } from "@/lib/types";
import type { AiBinding } from "@/lib/ai";
import { aiText as aiTextRaw, aiJson as aiJsonRaw } from "@/lib/ai";

export interface CopilotCtx {
  userId: string | null;
  brand: Brand;
  db: D1Database | null;
  ai: Ai | null;
  env: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  summary: string;
  data?: unknown;
  /** Set when the tool needs the user to confirm before anything happens. */
  needs_confirmation?: boolean;
  /** True when the result is demo/offline behavior, not real data. */
  demo?: boolean;
}

export interface CopilotTool {
  name: string;
  description: string;
  /** Simple JSON-schema-ish shape used by the ReAct loop. */
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  /** Friendly label shown in the UI while the tool runs. */
  label: string;
  needsConfirmation?: boolean;
  run: (args: Record<string, unknown>, ctx: CopilotCtx) => Promise<ToolResult>;
}

export function rid(prefix: string): string {
  const r =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
      : Math.random().toString(36).slice(2, 18);
  return `${prefix}_${r}`;
}

export function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v.trim() : fallback;
}

/** Models don't always use our exact parameter names — try sensible aliases. */
export function pick(args: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = str(args[k]);
    if (v) return v;
  }
  return fallback;
}

export function pickList(args: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = args[k];
    if (Array.isArray(v) && v.length) return v;
    if (typeof v === "string" && v.trim()) return v;
  }
  return undefined;
}

const VALID_PLATFORMS: PlatformId[] = ["ig-feed", "ig-reel", "ig-story", "tiktok", "shorts", "x"];

export function platformList(v: unknown): PlatformId[] {
  const arr = Array.isArray(v) ? v : typeof v === "string" ? v.split(/[,\s]+/) : [];
  const out = arr.filter((p): p is PlatformId =>
    VALID_PLATFORMS.includes(String(p).toLowerCase().replace(/_/g, "-") as PlatformId)
  );
  return out.length ? out : ["ig-feed"];
}

/** Today's date as yyyy-mm-dd in the user's timezone (best effort). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Guard: needs a real account + database. Returns an error result or null when fine. */
export function needDb(ctx: CopilotCtx): ToolResult | null {
  if (!ctx.db || !ctx.userId) {
    return {
      ok: false,
      demo: true,
      summary: "That needs a real account with a database — we're in demo mode, so I couldn't do it.",
      data: {},
    };
  }
  return null;
}

function asBinding(ai: Ai | null): AiBinding | null {
  return ai as unknown as AiBinding | null;
}

/** Free-form text generation. "" when AI is unavailable. */
export function aiText(
  ctx: CopilotCtx,
  system: string,
  user: string,
  temperature = 0.7,
  maxTokens = 900
): Promise<string> {
  return aiTextRaw(asBinding(ctx.ai), system, user, temperature, maxTokens);
}

/** JSON generation. null when unavailable or unparseable. */
export function aiJson<T>(
  ctx: CopilotCtx,
  system: string,
  user: string,
  temperature = 0.7,
  maxTokens = 900
): Promise<T | null> {
  return aiJsonRaw<T>(asBinding(ctx.ai), system, user, temperature, maxTokens);
}

/** One-line brand context stamped into AI prompts. */
export function brandLine(brand: Brand): string {
  const bits = [
    `Brand: ${brand.name}${brand.tagline ? ` — "${brand.tagline}"` : ""}`,
    brand.industry ? `Industry: ${brand.industry}` : "",
    brand.tone ? `Tone: ${brand.tone}` : "",
    brand.voice?.length ? `Voice notes: ${brand.voice.join("; ")}` : "",
    brand.banned?.length ? `Never use/say: ${brand.banned.join(", ")}` : "",
  ].filter(Boolean);
  return bits.join("\n");
}

/** Parse a D1 row's JSON payload column safely. */
export function payloadOf<T>(row: { payload?: unknown }): T {
  const p = (row as { payload?: string }).payload;
  if (!p) return {} as T;
  try {
    return JSON.parse(String(p)) as T;
  } catch {
    return {} as T;
  }
}
