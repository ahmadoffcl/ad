"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForge } from "@/lib/store";
import ChatMessage, {
  type ChatMessageData,
  type ChatCard,
  type ChatConfirm,
} from "./ChatMessage";

type SSEEvent =
  | { type: "tool"; name: string; label: string }
  | { type: "card"; card: ChatCard }
  | { type: "confirm"; id: string; title: string; summary: string; details: string[] }
  | { type: "message"; text: string }
  | { type: "done"; threadId: string; title: string }
  | { type: "error"; message: string };

const WORK_ID = "__working__";

function newId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

async function* readSSE(res: Response): AsyncGenerator<SSEEvent> {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response stream.");
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      try {
        yield JSON.parse(line.slice(5).trim()) as SSEEvent;
      } catch {
        /* skip malformed chunk */
      }
    }
  }
}

function WorkflowChips({
  brandName,
  onPick,
  disabled,
}: {
  brandName: string;
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  const chips = [
    { label: "Launch a campaign", text: `Launch a campaign for ${brandName} — take it from brief to scheduled posts.` },
    { label: "Plan this week's posts", text: "Plan this week's posts for me — check what's scheduled and fill the gaps." },
    { label: "How's my brand doing?", text: `How's ${brandName} doing? Give me the real numbers.` },
    { label: "What's working in our niche?", text: "What's working in our niche right now? Give me 3 trends I can actually use." },
  ];
  return (
    <div className="mt-5 grid w-full max-w-[420px] grid-cols-2 gap-2">
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          disabled={disabled}
          onClick={() => onPick(c.text)}
          className="pressable rounded-2xl border border-line bg-ink-2 px-3.5 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-molten/50 disabled:opacity-40"
        >
          <p className="text-[13px] font-semibold text-paper">{c.label}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-mist">Forge runs it end-to-end</p>
        </button>
      ))}
    </div>
  );
}

function SuggestionChips({
  brandName,
  onPick,
  disabled,
}: {
  brandName: string;
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  const chips = [
    `How's ${brandName} doing?`,
    "Draft 3 hooks for the drop",
    "What's working in our niche?",
    "Score this headline: \"Your current pair is lying to you.\"",
  ];
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {chips.map((c) => (
        <button
          key={c}
          type="button"
          disabled={disabled}
          onClick={() => onPick(c)}
          className="pressable shrink-0 rounded-full border border-line bg-ink-2 px-3.5 py-1.5 text-xs font-medium text-fog transition-colors hover:border-molten/50 hover:text-paper disabled:opacity-40"
        >
          {c}
        </button>
      ))}
    </div>
  );
}

/* ================================ panel ================================ */

export function CopilotPanel({
  variant = "panel",
  defaultThreadId,
  bare = false,
}: {
  variant?: "panel" | "full";
  /** Load an existing thread on mount (used by the full-page view). */
  defaultThreadId?: string | null;
  /** Chromeless mode for the /app home — no card border, minimal header. */
  bare?: boolean;
}) {
  const { activeBrand, profile, pushActivity } = useForge();
  const [threadId, setThreadId] = useState<string | null>(defaultThreadId ?? null);
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  // When an existing thread is opened (full view), load its messages.
  useEffect(() => {
    if (!defaultThreadId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/copilot/threads/${defaultThreadId}`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          messages?: { id: string; role: string; content: string; cards: unknown }[];
        };
        if (cancelled) return;
        const loaded: ChatMessageData[] = (data.messages ?? []).map(
          (m: { id: string; role: string; content: string; cards: unknown }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            cards: (m.cards as ChatCard[]) ?? [],
          })
        );
        setMessages(loaded);
      } catch {
        /* keep empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [defaultThreadId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const upsertWorking = useCallback((patch: Partial<ChatMessageData>) => {
    setMessages((prev) => {
      const i = prev.findIndex((m) => m.id === WORK_ID);
      const base: ChatMessageData = {
        id: WORK_ID,
        role: "assistant",
        content: "",
        workingLabel: "Thinking…",
      };
      if (i < 0) return [...prev, { ...base, ...patch }];
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }, []);

  const runSSE = useCallback(
    async (payload: Record<string, unknown>) => {
      busyRef.current = true;
      setBusy(true);
      upsertWorking({ workingLabel: "Thinking…" });
      let confirmedTitle: string | null = null;
      try {
        const res = await fetch("/api/copilot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brandId: activeBrand.id,
            brandName: activeBrand.name,
            userName: profile.name,
            ...payload,
          }),
        });
        for await (const ev of readSSE(res)) {
          if (ev.type === "tool") {
            upsertWorking({ workingLabel: ev.label });
          } else if (ev.type === "card") {
            setMessages((prev) => {
              const i = prev.findIndex((m) => m.id === WORK_ID);
              if (i < 0) return prev;
              const next = [...prev];
              next[i] = { ...next[i], cards: [...(next[i].cards ?? []), ev.card] };
              return next;
            });
          } else if (ev.type === "confirm") {
            setMessages((prev) => {
              const i = prev.findIndex((m) => m.id === WORK_ID);
              if (i < 0) return prev;
              const next = [...prev];
              const confirm: ChatConfirm = {
                id: ev.id,
                title: ev.title,
                summary: ev.summary,
                details: ev.details,
              };
              next[i] = { ...next[i], confirm };
              return next;
            });
          } else if (ev.type === "message") {
            upsertWorking({ content: ev.text, workingLabel: undefined });
          } else if (ev.type === "done") {
            setThreadId(ev.threadId);
            confirmedTitle = ev.title ?? null;
            setMessages((prev) =>
              prev.map((m) => (m.id === WORK_ID ? { ...m, id: newId() } : m))
            );
          } else if (ev.type === "error") {
            upsertWorking({ content: `Something tripped me up: ${ev.message}`, workingLabel: undefined });
            setMessages((prev) =>
              prev.map((m) => (m.id === WORK_ID ? { ...m, id: newId() } : m))
            );
          }
        }
      } catch (e) {
        upsertWorking({
          content: `Couldn't reach the copilot service — ${e instanceof Error ? e.message : "network error"}. Try again in a moment.`,
          workingLabel: undefined,
        });
        setMessages((prev) =>
          prev.map((m) => (m.id === WORK_ID ? { ...m, id: newId() } : m))
        );
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
      return confirmedTitle;
    },
    [activeBrand.id, activeBrand.name, profile.name, upsertWorking]
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busyRef.current) return;
      setMessages((prev) => [...prev, { id: newId(), role: "user", content: trimmed }]);
      setInput("");
      void runSSE({ threadId, message: trimmed });
    },
    [runSSE, threadId]
  );

  const handleConfirm = useCallback(
    async (confirm: ChatConfirm, confirmed: boolean) => {
      if (busyRef.current) return;
      setMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "user",
          content: confirmed ? "Yes — go ahead." : "No, cancel that.",
        },
      ]);
      await runSSE({ threadId, confirmed, confirmId: confirm.id });
      if (confirmed) pushActivity("Copilot: schedule confirmed in chat", "post");
    },
    [runSSE, threadId, pushActivity]
  );

  const newThread = useCallback(() => {
    if (busyRef.current) return;
    setThreadId(null);
    setMessages([]);
  }, []);

  const empty = messages.length === 0;

  return (
    <div
      className={
        bare
          ? "flex h-full min-h-0 flex-col overflow-hidden bg-ink text-paper"
          : "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-ink text-paper shadow-2xl"
      }
    >
      {/* header */}
      <div
        className={
          bare
            ? "flex items-center gap-3 px-1 py-2"
            : "flex items-center gap-3 border-b border-line bg-ink-2/60 px-4 py-3"
        }
      >
        {!bare && (
          <span
            aria-hidden="true"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-molten font-display text-base font-bold text-ink"
          >
            F
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold leading-tight">Forge</p>
          <p className="text-[11px] text-fog">Your ad agent · {activeBrand.name}</p>
        </div>
        {variant === "panel" && (
          <Link
            href="/app"
            className="pressable rounded-lg p-2 text-fog transition-colors hover:bg-ink-3 hover:text-paper"
            aria-label="Open Forge full view"
            title="Open full view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
          </Link>
        )}
        <button
          type="button"
          onClick={newThread}
          disabled={busy}
          className="pressable rounded-lg p-2 text-fog transition-colors hover:bg-ink-3 hover:text-paper disabled:opacity-40"
          aria-label="New chat"
          title="New chat"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {empty && (
          <div className="flex h-full flex-col items-center justify-center px-2 py-6 text-center">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-molten font-display text-2xl font-bold text-ink"
            >
              F
            </span>
            <p className="mt-4 font-display text-base font-bold">I&apos;m Forge — your ad agent.</p>
            <p className="mt-1.5 max-w-[300px] text-sm leading-relaxed text-fog">
              Brief me once. I draft the concepts, score the hooks, write the
              captions and queue the posts. You just approve.
            </p>
            <WorkflowChips brandName={activeBrand.name} onPick={send} disabled={busy} />
          </div>
        )}
        {messages.map((m) => (
          <ChatMessage key={m.id} msg={m} threadId={threadId ?? undefined} onConfirm={handleConfirm} />
        ))}
      </div>

      {/* suggestions */}
      {!empty && (
        <SuggestionChips brandName={activeBrand.name} onPick={send} disabled={busy} />
      )}

      {/* input */}
      <form
        className={bare ? "p-3" : "border-t border-line bg-ink-2/60 p-3"}
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask Forge anything…"
            aria-label="Message Forge Copilot"
            className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-line bg-ink-3 px-3.5 py-2.5 text-sm text-paper placeholder:text-mist outline-none transition-colors focus:border-molten/60"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send message"
            className="pressable flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-molten text-ink transition-all hover:bg-molten-soft disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}

/* =============================== launcher =============================== */

export function CopilotLauncher() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* floating button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close Forge Copilot" : "Open Forge Copilot"}
        aria-expanded={open}
        className="pressable fixed bottom-24 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-molten text-ink shadow-2xl transition-all hover:scale-105 hover:bg-molten-soft sm:bottom-6 sm:right-6"
      >
        {/* subtle pulse ring */}
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ping rounded-full bg-molten/30 [animation-duration:2.4s]"
        />
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />
            <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
            <path d="M5 2l.7 1.8L7.5 4.5l-1.8.7L5 7l-.7-1.8L2.5 4.5l1.8-.7z" />
          </svg>
        )}
      </button>

      {/* panel: floating card on desktop, bottom sheet on mobile */}
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 h-[85vh] rounded-t-3xl sm:inset-x-auto sm:bottom-24 sm:right-6 sm:h-[640px] sm:max-h-[80vh] sm:w-[400px] sm:rounded-2xl"
          role="dialog"
          aria-label="Forge Copilot chat"
        >
          {/* drag handle (mobile) */}
          <div className="absolute -top-0 left-1/2 z-10 -translate-x-1/2 pt-2 sm:hidden" aria-hidden="true">
            <span className="block h-1 w-10 rounded-full bg-mist/60" />
          </div>
          <div className="h-full pt-3 sm:pt-0">
            <CopilotPanel variant="panel" />
          </div>
        </div>
      )}
    </>
  );
}
