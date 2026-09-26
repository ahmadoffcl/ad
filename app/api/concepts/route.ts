export const runtime = "edge";
export const dynamic = "force-dynamic";

import { requireUser, json, badRequest } from "@/lib/api-helpers";
import { newId } from "@/lib/auth";

export async function GET(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign_id");
  const stmt = campaignId
    ? ctx.db.prepare("SELECT * FROM concepts WHERE user_id = ? AND campaign_id = ? ORDER BY created_at DESC LIMIT 200").bind(ctx.user.id, campaignId)
    : ctx.db.prepare("SELECT * FROM concepts WHERE user_id = ? ORDER BY created_at DESC LIMIT 200").bind(ctx.user.id);
  const rows = await stmt.all();
  return json({ concepts: rows.results ?? [] });
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
  const id = (body.id as string) || newId("cpt");
  await ctx.db
    .prepare(
      "INSERT INTO concepts (id, campaign_id, user_id, title, hook, body, hook_score, score_breakdown, payload, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(id) DO UPDATE SET title=excluded.title, hook=excluded.hook, body=excluded.body, hook_score=excluded.hook_score, score_breakdown=excluded.score_breakdown, payload=excluded.payload, source=excluded.source"
    )
    .bind(
      id,
      (body.campaign_id as string) ?? null,
      ctx.user.id,
      (body.title as string) ?? "",
      (body.hook as string) ?? "",
      (body.body as string) ?? "",
      (body.hook_score as number) ?? 0,
      JSON.stringify(body.score_breakdown ?? []),
      JSON.stringify(body.payload ?? {}),
      (body.source as string) ?? "deterministic"
    )
    .run();
  return json({ concept: { id } }, 201);
}
