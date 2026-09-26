export const runtime = "edge";
export const dynamic = "force-dynamic";

import { requireUser, json, badRequest } from "@/lib/api-helpers";
import { newId } from "@/lib/auth";

export async function GET(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;
  const rows = await ctx.db
    .prepare("SELECT * FROM campaigns WHERE user_id = ? ORDER BY created_at DESC LIMIT 200")
    .bind(ctx.user.id)
    .all<Record<string, unknown>>();
  return json({ campaigns: rows.results ?? [] });
}

export async function POST(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;

  let body: { brand_id?: string; brief?: string; status?: string; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }
  const id = (body.payload as { id?: string } | undefined)?.id ?? newId("cmp");
  await ctx.db
    .prepare(
      "INSERT INTO campaigns (id, user_id, brand_id, brief, status, payload) VALUES (?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET brand_id=excluded.brand_id, brief=excluded.brief, status=excluded.status, payload=excluded.payload"
    )
    .bind(
      id,
      ctx.user.id,
      body.brand_id ?? "",
      body.brief ?? "",
      body.status ?? "ideas",
      JSON.stringify(body.payload ?? {})
    )
    .run();
  return json({ campaign: { id } }, 201);
}
