export const runtime = "edge";
export const dynamic = "force-dynamic";

import { requireUser, json, badRequest } from "@/lib/api-helpers";

async function owned(req: Request, id: string) {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx;
  const row = await ctx.db
    .prepare("SELECT * FROM concepts WHERE id = ? AND user_id = ?")
    .bind(id, ctx.user.id)
    .first();
  if (!row) return { error: json({ error: "not_found" }, 404) };
  return { ...ctx, row };
}

export async function GET(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const ctx = await owned(req, params.id);
  if ("error" in ctx) return ctx.error;
  return json({ concept: ctx.row });
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
      "UPDATE concepts SET title = COALESCE(?, title), hook = COALESCE(?, hook), body = COALESCE(?, body), hook_score = COALESCE(?, hook_score), score_breakdown = COALESCE(?, score_breakdown), payload = COALESCE(?, payload), source = COALESCE(?, source) WHERE id = ?"
    )
    .bind(
      (body.title as string) ?? null,
      (body.hook as string) ?? null,
      (body.body as string) ?? null,
      (body.hook_score as number) ?? null,
      body.score_breakdown ? JSON.stringify(body.score_breakdown) : null,
      body.payload ? JSON.stringify(body.payload) : null,
      (body.source as string) ?? null,
      params.id
    )
    .run();
  return json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const ctx = await owned(req, params.id);
  if ("error" in ctx) return ctx.error;
  await ctx.db.prepare("DELETE FROM concepts WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
