/**
 * Forge Copilot chat — ReAct loop over Workers AI + copilot tools.
 *
 * The model's tool-calling is emulated: the system prompt tells the model to
 * emit a single-line {"tool":"<name>","args":{...}} JSON object when it wants
 * to act; we parse, validate, run the tool, and feed the result back.
 * (Honest caveat: this is a ReAct-style JSON loop, not native tool binding.)
 *
 * SSE protocol: `data: {json}\n\n` events —
 *   {type:"tool", name, label}   — copilot started a tool
 *   {type:"card", card}          — rich concept cards to render
 *   {type:"confirm", id, title, summary, details} — needs user confirmation
 *   {type:"message", text}       — final assistant reply
 *   {type:"done", threadId, title}
 *   {type:"error", message}
 */
import type { D1Database, Ai } from "@cloudflare/workers-types";
import type { Brand, PlatformId } from "@/lib/types";
import { getDb, getAI } from "@/lib/db";
import { getSessionUser, readSessionCookie, newId } from "@/lib/auth";
import { buildCopilotSystemPrompt, AI_MODEL, AI_MODEL_FALLBACK } from "@/lib/ai/prompts";
import { buildToolCatalog } from "@/lib/copilot/tools";
import { extractJson } from "@/lib/ai";
import { COPILOT_TOOLS, runTool, executeSchedulePost, type CopilotCtx, type SchedulePostInput } from "@/lib/copilot/tools";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const MAX_STEPS = 10;
const HISTORY_LIMIT = 20;

function sseEncode(obj: Record<string, unknown>): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

const DEMO_BRAND: Brand = {
  id: "demo",
  name: "Your Brand",
  tagline: "",
  industry: "",
  colors: { ink: "#101014", paper: "#FAFAF7", accent: "#FF5A1F", muted: "#8B8B93" },
  displayFont: "Space Grotesk",
  bodyFont: "Inter",
  tone: "Direct and confident.",
  voice: ["Short sentences."],
  banned: [],
};

/* ---------------- brand resolution ---------------- */

async function resolveBrand(
  db: D1Database | null,
  userId: string | null,
  brandId?: string
): Promise<Brand> {
  if (db && userId) {
    const row = await db
      .prepare(
        brandId
          ? `SELECT * FROM brands WHERE user_id = ? AND id = ?`
          : `SELECT * FROM brands WHERE user_id = ? ORDER BY created_at ASC LIMIT 1`
      )
      .bind(...(brandId ? [userId, brandId] : [userId]))
      .first<Record<string, unknown>>();
    if (row) {
      const j = (v: unknown, fb: unknown) => {
        try {
          return JSON.parse(String(v ?? JSON.stringify(fb)));
        } catch {
          return fb;
        }
      };
      const colors = j(row.colors, DEMO_BRAND.colors) as Brand["colors"];
      const fonts = j(row.fonts, {}) as Record<string, string>;
      const prefs = j(row.prefs, {}) as Record<string, unknown>;
      const brand: Brand = {
        id: String(row.id),
        name: String(row.name ?? "Your Brand"),
        tagline: String(row.tagline ?? ""),
        industry: String(row.industry ?? ""),
        colors: { ...DEMO_BRAND.colors, ...colors },
        displayFont: fonts.display ?? "Space Grotesk",
        bodyFont: fonts.body ?? "Inter",
        tone: String(row.tone ?? "Direct and confident."),
        voice: j(row.voice, []) as string[],
        banned: j(row.banned, []) as string[],
        director: {
          tone: String(prefs.tone ?? "Match brand kit"),
          hookStyle: (prefs.hookStyle as "auto" | "question" | "bold-claim" | "story" | "stat" | undefined) ?? "auto",
          ctaType: "auto",
          captionLength: "medium",
          emoji: true,
          creativity: 55,
          avoid: "",
        },
      };
      return brand;
    }
  }
  return DEMO_BRAND;
}

/* ---------------- thread helpers ---------------- */

interface ThreadRow {
  id: string;
  user_id: string;
  title: string;
  pending_action: string | null;
}

async function loadThread(
  db: D1Database | null,
  userId: string | null,
  threadId: string | undefined
): Promise<ThreadRow | null> {
  if (!db || !userId || !threadId) return null;
  return (
    (await db
      .prepare(`SELECT id, user_id, title, pending_action FROM copilot_threads WHERE id = ? AND user_id = ?`)
      .bind(threadId, userId)
      .first<ThreadRow>()) ?? null
  );
}

async function createThread(db: D1Database | null, userId: string | null): Promise<string> {
  const id = newId("cth");
  if (db && userId) {
    await db
      .prepare(`INSERT INTO copilot_threads (id, user_id, title) VALUES (?, ?, '')`)
      .bind(id, userId)
      .run();
  }
  return id;
}

async function saveMessage(
  db: D1Database | null,
  threadId: string,
  role: "user" | "assistant" | "tool",
  content: string,
  cards: unknown[] = []
): Promise<void> {
  if (!db || threadId === "demo") return;
  await db
    .prepare(
      `INSERT INTO copilot_messages (id, thread_id, role, content, cards) VALUES (?, ?, ?, ?, ?)`
    )
    .bind(newId("cmsg"), threadId, role, content, JSON.stringify(cards))
    .run();
}

async function loadHistory(
  db: D1Database | null,
  threadId: string
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  if (!db || threadId === "demo") return [];
  const rows = await db
    .prepare(
      `SELECT role, content FROM copilot_messages WHERE thread_id = ?
       ORDER BY created_at DESC LIMIT ${HISTORY_LIMIT}`
    )
    .bind(threadId)
    .all<{ role: string; content: string }>();
  return (rows.results ?? [])
    .reverse()
    .filter((r) => r.role === "user" || r.role === "assistant")
    .map((r) => ({ role: r.role as "user" | "assistant", content: r.content }));
}

/* ---------------- deterministic offline responder ---------------- */

const TOOL_HINTS: { re: RegExp; tool: string; label: string }[] = [
  { re: /dashboard|how('|’| i)?s .*doing|stats|overview/i, tool: "get_dashboard_stats", label: "Checking your dashboard…" },
  { re: /campaign/i, tool: "list_campaigns", label: "Listing campaigns…" },
  { re: /trend|what's working|niche/i, tool: "get_trends", label: "Checking what's working…" },
  { re: /analytic|performance|reach|working\??$/i, tool: "get_analytics", label: "Pulling your numbers…" },
  { re: /concept|draft|ad idea|hooks? for|write (me|an?|some) (ad|hook)/i, tool: "generate_concepts", label: "Drafting concepts…" },
];

function offlineResponder(
  message: string
): { text?: string; toolCall?: { tool: string; args: Record<string, unknown> } } {
  const quoted = message.match(/["“](.+?)["”]/)?.[1];
  if (/score/i.test(message) && quoted) {
    return { toolCall: { tool: "score_hook", args: { headline: quoted } } };
  }
  for (const h of TOOL_HINTS) {
    if (h.re.test(message)) {
      const args: Record<string, unknown> =
        h.tool === "generate_concepts" ? { brief: message.slice(0, 200) } : {};
      return { toolCall: { tool: h.tool, args } };
    }
  }
  return {
    text:
      "AI engine is offline in this preview, so I'm running on the deterministic engines — " +
      "but I can still help. Try:\n" +
      "• **\"How's my brand doing?\"** — dashboard numbers\n" +
      "• **\"Draft 3 concepts for our drop\"** — QC'd ad concepts\n" +
      "• **\"Score my headline: \\\"Your current pair is lying to you.\\\"\"** — honest hook score\n" +
      "• **\"What's working in our niche?\"** — curated trends",
  };
}

/* ---------------- model call ---------------- */

function coerceText(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  if (Array.isArray(v)) return v.map(coerceText).join("\n");
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.content === "string") return o.content;
    if (typeof o.text === "string") return o.text;
    try {
      return JSON.stringify(v);
    } catch {
      return "";
    }
  }
  return String(v);
}

async function callModel(
  ai: Ai,
  system: string,
  messages: { role: string; content: string }[]
): Promise<string> {
  const opts = {
    messages: [{ role: "system", content: system }, ...messages],
    temperature: 0.7,
    max_tokens: 1200,
  } as never;
  for (const model of [AI_MODEL, AI_MODEL_FALLBACK]) {
    try {
      const out = (await ai.run(model as never, opts)) as { response?: unknown };
      const text = coerceText(out?.response);
      if (text.trim()) return text;
    } catch {
      /* try the fallback model */
    }
  }
  return "";
}

function parseToolCall(text: string): { tool: string; args: Record<string, unknown> } | null {
  const parsed = extractJson(text) as { tool?: unknown; args?: unknown } | null;
  if (parsed && typeof parsed.tool === "string") {
    return {
      tool: parsed.tool,
      args: (parsed.args as Record<string, unknown>) ?? {},
    };
  }
  return null;
}

/* ---------------- route ---------------- */

interface ChatBody {
  threadId?: string;
  message?: string;
  brandId?: string;
  brandName?: string;
  userName?: string;
  confirmed?: boolean;
  confirmId?: string;
}

export async function POST(req: Request): Promise<Response> {
  const db = getDb();
  // getAI() returns the ambient (global) Ai type; cast to the module Ai used by the copilot tools.
  const ai = getAI() as unknown as Ai | null;

  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Soft auth: DB present → require session. No DB → demo mode.
  let userId: string | null = null;
  let userName: string | undefined;
  if (db) {
    const user = await getSessionUser(db, readSessionCookie(req.headers.get("cookie")));
    if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
    userId = user.id;
    userName = body.userName ?? user.name;
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: Record<string, unknown>) =>
        controller.enqueue(new TextEncoder().encode(sseEncode(obj)));
      const fail = (message: string) => {
        send({ type: "error", message });
        controller.close();
      };
      try {
        let thread = await loadThread(db, userId, body.threadId);
        const threadId = thread?.id ?? (await createThread(db, userId));
        if (!thread) {
          thread = { id: threadId, user_id: userId ?? "", title: "", pending_action: null };
        }

        /* ---- pending confirmation flow ---- */
        if (typeof body.confirmed === "boolean") {
          const pending = thread.pending_action
            ? (JSON.parse(thread.pending_action) as { type?: string; posts?: SchedulePostInput[]; brandId?: string; confirmId?: string })
            : null;
          if (!pending || pending.type !== "schedule" || (body.confirmId && pending.confirmId !== body.confirmId)) {
            fail("Nothing waiting for confirmation — the proposal may have expired. Ask me to schedule again.");
            return;
          }
          if (body.confirmed) {
            const brand = await resolveBrand(db, userId, pending.brandId);
            const { inserted } = await executeSchedulePost(pending.posts ?? [], {
              userId,
              db,
              brand,
            });
            const text = `Scheduled ✓ — ${inserted} post${inserted === 1 ? "" : "s"} queued. You'll find them on your Calendar.`;
            await saveMessage(db, threadId, "assistant", text);
            if (db && threadId !== "demo") {
              await db
                .prepare(`UPDATE copilot_threads SET pending_action = NULL, updated_at = datetime('now') WHERE id = ?`)
                .bind(threadId)
                .run();
            }
            send({ type: "message", text });
          } else {
            if (db && threadId !== "demo") {
              await db
                .prepare(`UPDATE copilot_threads SET pending_action = NULL, updated_at = datetime('now') WHERE id = ?`)
                .bind(threadId)
                .run();
            }
            const text = "No problem — scrapped the schedule. Say the word if you change your mind.";
            await saveMessage(db, threadId, "assistant", text);
            send({ type: "message", text });
          }
          send({ type: "done", threadId, title: thread.title });
          controller.close();
          return;
        }

        /* ---- normal chat ---- */
        const message = (body.message ?? "").trim();
        if (!message) {
          fail("Send a message to chat with Forge Copilot.");
          return;
        }

        const brand = await resolveBrand(db, userId, body.brandId);
        const ctx: CopilotCtx = { userId, brand, db, ai, env: {} };
        const system = buildCopilotSystemPrompt({
          userName: userName ?? body.userName,
          brandName: body.brandName ?? brand.name,
          toolCatalog: buildToolCatalog(),
        });

        await saveMessage(db, threadId, "user", message);
        const history = await loadHistory(db, threadId);
        const firstExchange = history.filter((m) => m.role === "user").length <= 1;

        const convo: { role: string; content: string }[] = [
          ...history,
          { role: "user", content: message },
        ];

        const cards: unknown[] = [];
        let finalText = "";
        let stoppedForConfirm = false;
        // Loop guard: nudge the model forward if it repeats the same tool.
        let lastTool = "";
        let repeatCount = 0;

        for (let step = 0; step < MAX_STEPS; step++) {
          let reply: string;
          if (ai) {
            reply = await callModel(ai, system, convo);
          } else {
            const local = offlineResponder(convo[convo.length - 1]?.content ?? "");
            if (local.text) {
              finalText = local.text;
              break;
            }
            reply = JSON.stringify(local.toolCall);
          }

          const toolCall = parseToolCall(reply);
          if (!toolCall) {
            finalText = reply.trim();
            break;
          }

          if (toolCall.tool === lastTool) {
            repeatCount++;
            if (repeatCount >= 2) {
              convo.push({
                role: "user",
                content: `You've called ${toolCall.tool} ${repeatCount + 1} times in a row. Move on: use the results you already have, call the NEXT tool in the workflow, or summarize for the user. Do not call ${toolCall.tool} again.`,
              });
              lastTool = "";
              repeatCount = 0;
              continue;
            }
          } else {
            lastTool = toolCall.tool;
            repeatCount = 0;
          }

          const def = COPILOT_TOOLS.find((t) => t.name === toolCall.tool);
          if (!def) {
            convo.push({
              role: "user",
              content: `Tool result for ${toolCall.tool}: {"ok":false,"summary":"Unknown tool. Call search_tools with a keyword to find the right one."}`,
            });
            continue;
          }
          send({ type: "tool", name: def.name, label: def.label });

          let toolRes: Awaited<ReturnType<typeof runTool>>["result"];
          try {
            ({ result: toolRes } = await runTool(toolCall.tool, toolCall.args, ctx));
          } catch (e) {
            toolRes = { ok: false, summary: e instanceof Error ? e.message : "Tool failed." };
          }

          await saveMessage(
            db,
            threadId,
            "tool",
            `tool:${def.name} — ${toolRes.summary.slice(0, 300)}`
          );

          if (toolRes.needs_confirmation) {
            const confirmId = newId("cnf");
            const pending = {
              type: "schedule",
              confirmId,
              posts: (toolRes.data as { posts?: SchedulePostInput[] })?.posts ?? [],
              brandId: brand.id,
            };
            if (db && threadId !== "demo") {
              await db
                .prepare(
                  `UPDATE copilot_threads SET pending_action = ?, updated_at = datetime('now') WHERE id = ?`
                )
                .bind(JSON.stringify(pending), threadId)
                .run();
            }
            const posts = pending.posts;
            const title = `Schedule ${posts.length} post${posts.length === 1 ? "" : "s"} for ${brand.name}`;
            const details = posts.map(
              (p) => `${p.title} — ${p.platform} · ${p.date} ${p.time}`
            );
            finalText = `Here's the plan — ${posts.length} post${posts.length === 1 ? "" : "s"} ready to queue. Confirm and I'll lock it in.`;
            send({ type: "confirm", id: confirmId, title, summary: toolRes.summary, details });
            await saveMessage(db, threadId, "assistant", finalText);
            stoppedForConfirm = true;
            break;
          }

          if (toolCall.tool === "generate_concepts" && toolRes.ok) {
            const items = (toolRes.data as { concepts?: unknown[] })?.concepts ?? [];
            if (items.length) {
              const card = { kind: "concepts", items };
              cards.push(card);
              send({ type: "card", card });
            }
          }

          convo.push({
            role: "user",
            content: `Tool result for ${toolCall.tool}: ${JSON.stringify(toolRes).slice(0, 4000)}`,
          });
        }

        if (!finalText && !stoppedForConfirm) {
          finalText =
            "I hit my step limit without landing an answer — could you rephrase that? I draft concepts, score hooks, write captions, and check your numbers.";
        }
        if (finalText) {
          await saveMessage(db, threadId, "assistant", finalText, cards);
          send({ type: "message", text: finalText });
        }

        // Thread title from the first user message.
        let title = thread.title;
        if (firstExchange && db && threadId !== "demo") {
          title = message.slice(0, 48);
          await db
            .prepare(`UPDATE copilot_threads SET title = ?, updated_at = datetime('now') WHERE id = ?`)
            .bind(title, threadId)
            .run();
        }
        send({ type: "done", threadId, title });
        controller.close();
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : "Something went wrong in the copilot.",
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
