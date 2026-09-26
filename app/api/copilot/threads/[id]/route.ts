/**
 * Forge Copilot thread detail — GET messages, DELETE thread. Plain JSON.
 * Soft auth: DB present → require session; no DB → demo mode (empty).
 */
import { getDb } from "@/lib/db";
import { getSessionUser, readSessionCookie } from "@/lib/auth";
import { json, badRequest } from "@/lib/api-helpers";

export const runtime = "edge";
export const dynamic = "force-dynamic";

async function softUser(req: Request) {
  const db = getDb();
  if (!db) return { db: null, userId: null };
  const user = await getSessionUser(db, readSessionCookie(req.headers.get("cookie")));
  if (!user) return { error: Response.json({ error: "unauthorized" }, { status: 401 }) };
  return { db, userId: user.id };
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await softUser(req);
  if ("error" in ctx) return ctx.error;
  if (!ctx.db || !ctx.userId) return json({ messages: [], demo: true });
  const threadId = params.id;
  const owned = await ctx.db
    .prepare(`SELECT id, title FROM copilot_threads WHERE id = ? AND user_id = ?`)
    .bind(threadId, ctx.userId)
    .first<{ id: string; title: string }>();
  if (!owned) return badRequest("Thread not found.");
  const rows = await ctx.db
    .prepare(
      `SELECT id, role, content, cards, created_at FROM copilot_messages
       WHERE thread_id = ? ORDER BY created_at ASC LIMIT 200`
    )
    .bind(threadId)
    .all<{ id: string; role: string; content: string; cards: string; created_at: string }>();
  const messages = (rows.results ?? [])
    .filter((m) => m.role !== "tool")
    .map((m) => {
      let cards: unknown[] = [];
      try {
        cards = JSON.parse(m.cards || "[]");
      } catch {
        /* keep empty */
      }
      return { id: m.id, role: m.role, content: m.content, cards, created_at: m.created_at };
    });
  return json({ thread: owned, messages });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ctx = await softUser(req);
  if ("error" in ctx) return ctx.error;
  if (!ctx.db || !ctx.userId) return json({ ok: true, demo: true });
  await ctx.db
    .prepare(`DELETE FROM copilot_messages WHERE thread_id = ? AND EXISTS (SELECT 1 FROM copilot_threads WHERE id = ? AND user_id = ?)`)
    .bind(params.id, params.id, ctx.userId)
    .run();
  await ctx.db
    .prepare(`DELETE FROM copilot_threads WHERE id = ? AND user_id = ?`)
    .bind(params.id, ctx.userId)
    .run();
  return json({ ok: true });
}
