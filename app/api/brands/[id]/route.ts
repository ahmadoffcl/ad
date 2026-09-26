export const runtime = "edge";
export const dynamic = "force-dynamic";

import { requireUser, json, badRequest } from "@/lib/api-helpers";
import { rowToBrand } from "@/lib/brandRows";
import type { Brand } from "@/lib/types";

async function owned(req: Request, id: string) {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx;
  const row = await ctx.db
    .prepare("SELECT * FROM brands WHERE id = ? AND user_id = ?")
    .bind(id, ctx.user.id)
    .first<Record<string, unknown>>();
  if (!row) return { error: json({ error: "not_found" }, 404) };
  return { ...ctx, row };
}

export async function GET(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const ctx = await owned(req, params.id);
  if ("error" in ctx) return ctx.error;
  return json({ brand: rowToBrand(ctx.row) });
}

export async function PUT(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const ctx = await owned(req, params.id);
  if ("error" in ctx) return ctx.error;

  let body: Partial<Brand>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }
  const b = body;
  await ctx.db
    .prepare(
      `UPDATE brands SET name = COALESCE(?, name), tagline = COALESCE(?, tagline),
       industry = COALESCE(?, industry), colors = COALESCE(?, colors), fonts = COALESCE(?, fonts),
       tone = COALESCE(?, tone), voice = COALESCE(?, voice), banned = COALESCE(?, banned),
       prefs = COALESCE(?, prefs) WHERE id = ?`
    )
    .bind(
      b.name ?? null,
      b.tagline ?? null,
      b.industry ?? null,
      b.colors ? JSON.stringify(b.colors) : null,
      b.displayFont || b.bodyFont
        ? JSON.stringify({
            display: b.displayFont ?? "Space Grotesk",
            body: b.bodyFont ?? "Inter",
          })
        : null,
      b.tone ?? null,
      b.voice ? JSON.stringify(b.voice) : null,
      b.banned ? JSON.stringify(b.banned) : null,
      b.director ? JSON.stringify(b.director) : null,
      params.id
    )
    .run();
  const row = await ctx.db
    .prepare("SELECT * FROM brands WHERE id = ?")
    .bind(params.id)
    .first<Record<string, unknown>>();
  return json({ brand: rowToBrand(row!) });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }): Promise<Response> {
  const ctx = await owned(req, params.id);
  if ("error" in ctx) return ctx.error;
  await ctx.db.prepare("DELETE FROM brands WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
