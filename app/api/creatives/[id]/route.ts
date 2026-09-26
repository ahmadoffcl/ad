export const runtime = "edge";
export const dynamic = "force-dynamic";

import { requireUser, json, badRequest } from "@/lib/api-helpers";

async function owned(req: Request, id: string) {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx;
  const row = await ctx.db
    .prepare("SELECT * FROM creatives WHERE id = ? AND user_id = ?")
    .bind(id, ctx.user.id)
    .first();
  if (!row) return { error: json({ error: "not_found" }, 404) };
  return { ...ctx, row };
}

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const ctx = await owned(req, params.id);
  if ("error" in ctx) return ctx.error;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }
  await ctx.db
    .prepare(
      "UPDATE creatives SET caption = COALESCE(?, caption), hashtags = COALESCE(?, hashtags), status = COALESCE(?, status), payload = COALESCE(?, payload) WHERE id = ?"
    )
    .bind(
      (body.caption as string) ?? null,
      body.hashtags ? JSON.stringify(body.hashtags) : null,
      (body.status as string) ?? null,
      body.payload ? JSON.stringify(body.payload) : null,
      params.id
    )
    .run();
  return json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const ctx = await owned(req, params.id);
  if ("error" in ctx) return ctx.error;
  await ctx.db.prepare("DELETE FROM creatives WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
