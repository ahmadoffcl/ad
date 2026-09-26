export const runtime = "edge";
export const dynamic = "force-dynamic";

import { requireUser, json, badRequest } from "@/lib/api-helpers";

export async function PATCH(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;

  let body: { read?: boolean };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }
  const res = await ctx.db
    .prepare("UPDATE notifications SET read = ? WHERE id = ? AND user_id = ?")
    .bind(body.read ? 1 : 0, params.id, ctx.user.id)
    .run();
  if ((res.meta?.changes ?? 0) === 0) return json({ error: "not_found" }, 404);
  return json({ ok: true });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;
  await ctx.db
    .prepare("DELETE FROM notifications WHERE id = ? AND user_id = ?")
    .bind(params.id, ctx.user.id)
    .run();
  return json({ ok: true });
}
