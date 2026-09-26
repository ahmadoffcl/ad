export const runtime = "edge";
export const dynamic = "force-dynamic";

import { requireUser, json, badRequest } from "@/lib/api-helpers";
import { newId } from "@/lib/auth";

export async function GET(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;
  const rows = await ctx.db
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50")
    .bind(ctx.user.id)
    .all<Record<string, unknown>>();
  return json({
    notifications: (rows.results ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      kind: n.kind,
      read: n.read === 1,
      time: n.created_at,
    })),
  });
}

export async function POST(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;

  let body: { title?: string; body?: string; kind?: string; markAll?: boolean };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }
  if (body.markAll) {
    await ctx.db
      .prepare("UPDATE notifications SET read = 1 WHERE user_id = ?")
      .bind(ctx.user.id)
      .run();
    return json({ marked: true });
  }
  if (!body.title?.trim()) return badRequest("Title is required.");
  const id = newId("n");
  await ctx.db
    .prepare("INSERT INTO notifications (id, user_id, title, body, kind, read) VALUES (?, ?, ?, ?, ?, 0)")
    .bind(id, ctx.user.id, body.title.trim(), body.body ?? "", body.kind ?? "info")
    .run();
  return json({ notification: { id } }, 201);
}
