/**
 * D1 + AI binding access — edge-safe, null when bindings are absent
 * (plain `next dev` → demo/offline mode with localStorage).
 */
import { getRequestContext } from "@cloudflare/next-on-pages";

export interface Env {
  DB?: D1Database;
  AI?: Ai;
}

export function getEnv(): Env | null {
  try {
    return (getRequestContext().env ?? null) as Env | null;
  } catch {
    // Not running on Cloudflare (local next dev) — demo mode.
    return null;
  }
}

export function getDb(): D1Database | null {
  return getEnv()?.DB ?? null;
}

export function getAI(): Ai | null {
  return getEnv()?.AI ?? null;
}

export function noDbResponse() {
  return Response.json({ error: "database_unavailable", demo: true }, { status: 503 });
}

export function noAiResponse() {
  return Response.json({ error: "ai_unavailable", demo: true }, { status: 503 });
}
