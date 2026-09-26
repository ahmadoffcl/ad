export const runtime = "edge";
export const dynamic = "force-dynamic";

import { requireUser, json } from "@/lib/api-helpers";

export async function DELETE(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;
  const res = await ctx.db
    .prepare("DELETE FROM api_keys WHERE id = ? AND user_id = ?")
    .bind(params.id, ctx.user.id)
    .run();
  if ((res.meta?.changes ?? 0) === 0) return json({ error: "not_found" }, 404);
  return json({ ok: true });
}
