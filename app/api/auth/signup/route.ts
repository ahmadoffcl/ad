export const runtime = "edge";
export const dynamic = "force-dynamic";

import { getDb, noDbResponse } from "@/lib/db";
import {
  createSession,
  hashPassword,
  newId,
  isSecureRequest,
  sessionCookie,
} from "@/lib/auth";
import { DEFAULT_DIRECTOR_PREFS } from "@/lib/ai/prompts";
import { SEED_BRANDS } from "@/lib/seed";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request): Promise<Response> {
  const db = getDb();
  if (!db) return noDbResponse();

  let body: { email?: string; password?: string; name?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email))
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!body.password || body.password.length < 8)
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });

  const existing = await db.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) {
    return Response.json(
      { error: "That email is already forging. Try logging in." },
      { status: 409 }
    );
  }

  const id = newId("user");
  const name = (body.name ?? "").trim() || email.split("@")[0];
  await db
    .prepare("INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)")
    .bind(id, email, await hashPassword(body.password), name)
    .run();
  await db
    .prepare(
      "INSERT INTO profiles (user_id, handle, workspace, role, plan, avatar_color, timezone) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(
      id,
      `@${name.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      "Forge Studio",
      "Founder",
      "Forge Free",
      "#FF5A1F",
      "UTC"
    )
    .run();

  // Every new account starts with the two demo brand kits.
  for (const b of SEED_BRANDS) {
    await db
      .prepare(
        "INSERT INTO brands (id, user_id, name, tagline, industry, colors, fonts, tone, voice, banned, prefs) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(
        newId("brand"),
        id,
        b.name,
        b.tagline,
        b.industry,
        JSON.stringify(b.colors),
        JSON.stringify({ display: b.displayFont, body: b.bodyFont }),
        b.tone,
        JSON.stringify(b.voice),
        JSON.stringify(b.banned),
        JSON.stringify(DEFAULT_DIRECTOR_PREFS)
      )
      .run();
  }

  const token = await createSession(db, id);
  return Response.json(
    { user: { id, email, name } },
    {
      status: 201,
      headers: { "Set-Cookie": sessionCookie(token, isSecureRequest(req)) },
    }
  );
}
