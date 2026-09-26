/**
 * Forge Copilot threads — list + create. Plain JSON (no SSE).
 * Soft auth: DB present → require session; no DB → demo mode (no threads).
 */
import { getDb } from "@/lib/db";
import { getSessionUser, readSessionCookie, newId } from "@/lib/auth";
import { json } from "@/lib/api-helpers";

export const runtime = "edge";
export const dynamic = "force-dynamic";

async function softUser(req: Request) {
  const db = getDb();
  if (!db) return { db: null, userId: null };
  const user = await getSessionUser(db, readSessionCookie(req.headers.get("cookie")));
  if (!user) return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  return { db, userId: user.id };
}

export async function GET(req: Request) {
  const ctx = await softUser(req);
  if ("error" in ctx) return ctx.error;
  if (!ctx.db || !ctx.userId) return json({ threads: [], demo: true });
  const rows = await ctx.db
    .prepare(
      `SELECT id, title, created_at, updated_at FROM copilot_threads
       WHERE user_id = ? ORDER BY updated_at DESC LIMIT 50`
    )
    .bind(ctx.userId)
    .all<{ id: string; title: string; created_at: string; updated_at: string }>();
  return json({ threads: rows.results ?? [] });
}

export async function POST(req: Request) {
  const ctx = await softUser(req);
  if ("error" in ctx) return ctx.error;
  const id = newId("cth");
  if (ctx.db && ctx.userId) {
    await ctx.db
      .prepare(`INSERT INTO copilot_threads (id, user_id, title) VALUES (?, ?, '')`)
      .bind(id, ctx.userId)
      .run();
  }
  return json({ thread: { id, title: "" } }, 201);
}
