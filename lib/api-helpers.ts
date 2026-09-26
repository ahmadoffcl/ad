/** Shared helpers for API routes: DB + session user resolution. */
import { getDb, noDbResponse } from "@/lib/db";
import { getSessionUser, readSessionCookie } from "@/lib/auth";
import type { D1Database } from "@cloudflare/workers-types";
import type { SessionUser } from "@/lib/auth";

export const RUNTIME_EDGE = "edge";

export async function requireUser(
  req: Request
): Promise<{ db: D1Database; user: SessionUser } | { error: Response }> {
  const db = getDb();
  if (!db) return { error: noDbResponse() };
  const user = await getSessionUser(db, readSessionCookie(req.headers.get("cookie")));
  if (!user) return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  return { db, user };
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

export function badRequest(message: string): Response {
  return Response.json({ error: message }, { status: 400 });
}
