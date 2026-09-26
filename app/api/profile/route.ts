export const runtime = "edge";
export const dynamic = "force-dynamic";

import { requireUser, json, badRequest } from "@/lib/api-helpers";

interface ProfileBody {
  name?: string;
  handle?: string;
  workspace?: string;
  role?: string;
  avatarColor?: string;
  timezone?: string;
  settings?: Record<string, unknown>;
  notificationPrefs?: Record<string, boolean>;
}

export async function GET(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;
  const { db, user } = ctx;
  const profile = await db
    .prepare("SELECT * FROM profiles WHERE user_id = ?")
    .bind(user.id)
    .first();
  return json({
    profile: {
      name: user.name,
      email: user.email,
      handle: profile?.handle ?? "",
      workspace: profile?.workspace ?? "",
      role: profile?.role ?? "",
      plan: profile?.plan ?? "Forge Free",
      avatarColor: profile?.avatar_color ?? "#FF5A1F",
      timezone: profile?.timezone ?? "UTC",
      settings: safeJson(profile?.settings as string | undefined),
      notificationPrefs: safeJson(profile?.notification_prefs as string | undefined),
    },
  });
}

export async function PUT(req: Request): Promise<Response> {
  const ctx = await requireUser(req);
  if ("error" in ctx) return ctx.error;
  const { db, user } = ctx;

  let body: ProfileBody;
  try {
    body = await req.json();
  } catch {
    return badRequest("Invalid JSON body.");
  }

  if (typeof body.name === "string" && body.name.trim()) {
    await db.prepare("UPDATE users SET name = ? WHERE id = ?").bind(body.name.trim(), user.id).run();
  }
  const fields: [string, unknown][] = [
    ["handle", body.handle],
    ["workspace", body.workspace],
    ["role", body.role],
    ["avatar_color", body.avatarColor],
    ["timezone", body.timezone],
  ];
  for (const [col, val] of fields) {
    if (typeof val === "string") {
      await db.prepare(`UPDATE profiles SET ${col} = ? WHERE user_id = ?`).bind(val, user.id).run();
    }
  }
  if (body.settings && typeof body.settings === "object") {
    await db
      .prepare("UPDATE profiles SET settings = ? WHERE user_id = ?")
      .bind(JSON.stringify(body.settings), user.id)
      .run();
  }
  if (body.notificationPrefs && typeof body.notificationPrefs === "object") {
    await db
      .prepare("UPDATE profiles SET notification_prefs = ? WHERE user_id = ?")
      .bind(JSON.stringify(body.notificationPrefs), user.id)
      .run();
  }
  return GET(req);
}

function safeJson(s: string | undefined): Record<string, unknown> {
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
}
