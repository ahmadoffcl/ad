export const runtime = "edge";
export const dynamic = "force-dynamic";

import { requireUser, json, badRequest } from "@/lib/api-helpers";
import { rowToBrand } from "@/lib/brandRows";
import { newId } from "@/lib/auth";
import type { Brand } from "@/lib/types";

export async function GET(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;
  const rows = await ctx.db
    .prepare("SELECT * FROM brands WHERE user_id = ? ORDER BY created_at ASC")
    .bind(ctx.user.id)
    .all<Record<string, unknown>>();
  return json({ brands: (rows.results ?? []).map(rowToBrand) });
}

export async function POST(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;

  let body: Partial<Brand>;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }
  if (!body.name?.trim()) return badRequest("Brand name is required.");

  const id = newId("brand");
  await ctx.db
    .prepare(
      "INSERT INTO brands (id, user_id, name, tagline, industry, colors, fonts, tone, voice, banned, prefs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      id,
      ctx.user.id,
      body.name.trim(),
      body.tagline ?? "",
      body.industry ?? "",
      JSON.stringify(body.colors ?? {}),
      JSON.stringify({ display: body.displayFont ?? "Space Grotesk", body: body.bodyFont ?? "Inter" }),
      body.tone ?? "",
      JSON.stringify(body.voice ?? []),
      JSON.stringify(body.banned ?? []),
      JSON.stringify(body.director ?? {})
    )
    .run();
  const row = await ctx.db
    .prepare("SELECT * FROM brands WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();
  return json({ brand: rowToBrand(row!) }, 201);
}
