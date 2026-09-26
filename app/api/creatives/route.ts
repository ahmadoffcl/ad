export const runtime = "edge";
export const dynamic = "force-dynamic";

import { requireUser, json, badRequest } from "@/lib/api-helpers";
import { newId } from "@/lib/auth";

export async function GET(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const conceptId = url.searchParams.get("concept_id");
  const stmt = conceptId
    ? ctx.db.prepare("SELECT * FROM creatives WHERE user_id = ? AND concept_id = ? ORDER BY created_at DESC LIMIT 200").bind(ctx.user.id, conceptId)
    : ctx.db.prepare("SELECT * FROM creatives WHERE user_id = ? ORDER BY created_at DESC LIMIT 200").bind(ctx.user.id);
  const rows = await stmt.all();
  return json({ creatives: rows.results ?? [] });
}

export async function POST(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }
  const id = (body.id as string) || newId("crv");
  await ctx.db
    .prepare(
      "INSERT INTO creatives (id, concept_id, user_id, placement, caption, hashtags, status, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET caption=excluded.caption, hashtags=excluded.hashtags, status=excluded.status, payload=excluded.payload"
    )
    .bind(
      id,
      (body.concept_id as string) ?? null,
      ctx.user.id,
      (body.placement as string) ?? "",
      (body.caption as string) ?? "",
      JSON.stringify(body.hashtags ?? []),
      (body.status as string) ?? "draft",
      JSON.stringify(body.payload ?? {})
    )
    .run();
  return json({ creative: { id } }, 201);
}
