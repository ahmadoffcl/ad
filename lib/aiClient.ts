/**
 * Browser client for the Workers AI routes (/api/ai/*).
 * Every call returns the payload plus an honest `source` label
 * ("ai" | "mixed" | "deterministic") so the UI can badge it.
 */
import type { AdConcept, Brand, Brief, DirectorPrefs } from "./types";

export type AISource = "ai" | "mixed" | "deterministic";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `AI request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export interface GenerateConceptsResult {
  concepts: AdConcept[];
  source: AISource;
  critique?: string;
}

export function generateConcepts(
  brand: Brand,
  brief: Brief,
  director?: DirectorPrefs
): Promise<GenerateConceptsResult> {
  return post<GenerateConceptsResult>("/api/ai/generate-concepts", {
    brand,
    brief,
    director: director ?? brand.director,
  });
}

export interface ScoreHookResult {
  deterministic: number;
  ai: { score: number; reason: string } | null;
  blended: number;
  source: AISource;
}

export function scoreHook(headline: string, sub?: string): Promise<ScoreHookResult> {
  return post<ScoreHookResult>("/api/ai/score-hook", { headline, caption: sub ?? "" });
}

export interface CaptionResult {
  caption: string;
  hashtags: string[];
  source: AISource;
}

export function writeCaption(
  brand: Brand,
  headline: string,
  sub: string,
  cta: string,
  placement: string
): Promise<CaptionResult> {
  return post<CaptionResult>("/api/ai/caption", {
    brand,
    headline,
    sub,
    cta,
    platform: placement,
  });
}
