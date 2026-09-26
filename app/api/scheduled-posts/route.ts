export const runtime = "edge";
export const dynamic = "force-dynamic";

import { requireUser, json, badRequest } from "@/lib/api-helpers";
import { newId } from "@/lib/auth";

export async function GET(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;
  const rows = await ctx.db
    .prepare("SELECT * FROM scheduled_posts WHERE user_id = ? ORDER BY scheduled_at ASC LIMIT 500")
    .bind(ctx.user.id)
    .all();
  return json({ posts: rows.results ?? [] });
}

export async function POST(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;

  let body: Record<string, unknown> | Record<string, unknown>[];
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }
  const items = Array.isArray(body) ? body : [body];
  const ids: string[] = [];
  const stmt = ctx.db.prepare(
    "INSERT INTO scheduled_posts (id, creative_id, user_id, network, scheduled_at, status, payload) VALUES (?, ?, ?, ?, ?, ?, ?) " +
      "ON CONFLICT(id) DO UPDATE SET network=excluded.network, scheduled_at=excluded.scheduled_at, status=excluded.status, payload=excluded.payload"
  );
  const batch = items.map((p) => {
    const id = (p.id as string) || newId("sch");
    ids.push(id);
    return stmt.bind(
      id,
      (p.creative_id as string) ?? null,
      ctx.user.id,
      (p.network as string) ?? "",
      (p.scheduled_at as string) ?? "",
      (p.status as string) ?? "queued",
      JSON.stringify(p.payload ?? {})
    );
  });
  await ctx.db.batch(batch);
  return json({ posts: ids.map((id) => ({ id })) }, 201);
}
