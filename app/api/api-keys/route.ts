export const runtime = "edge";
export const dynamic = "force-dynamic";

import { requireUser, json, badRequest } from "@/lib/api-helpers";
import { hashApiKey, newId } from "@/lib/auth";

function toClient(n: Record<string, unknown>) {
  return {
    id: n.id,
    name: n.name,
    prefix: n.key_prefix,
    created: n.created_at,
    lastUsed: n.last_used_at ?? "Never",
  };
}

export async function GET(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;
  const rows = await ctx.db
    .prepare("SELECT id, name, key_prefix, created_at, last_used_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC")
    .bind(ctx.user.id)
    .all<Record<string, unknown>>();
  return json({ keys: (rows.results ?? []).map(toClient) });
}

export async function POST(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;

  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }
  if (!body.name?.trim()) return badRequest("Key name is required.");

  // The full secret is shown ONCE — only its SHA-256 hash is stored.
  const rand = [...crypto.getRandomValues(new Uint8Array(18))]
    .map((b) => b.toString(36).padStart(2, "0"))
    .join("")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 24);
  const secret = `af_live_${rand}`;
  const id = newId("key");
  await ctx.db
    .prepare("INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash) VALUES (?, ?, ?, ?, ?)")
    .bind(id, ctx.user.id, body.name.trim(), secret.slice(0, 12) + "…", await hashApiKey(secret))
    .run();
  return json(
    { key: { id, name: body.name.trim(), prefix: secret.slice(0, 12) + "…", secret } },
    201
  );
}
