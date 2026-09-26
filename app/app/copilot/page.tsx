"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CopilotPanel } from "@/components/copilot/CopilotPanel";
import { Btn } from "@/components/ui";

interface ThreadItem {
  id: string;
  title: string;
  updated_at: string;
}

export default function CopilotPage() {
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/copilot/threads");
      if (!res.ok) return;
      const data = (await res.json()) as { threads?: ThreadItem[] };
      setThreads(data.threads ?? []);
    } catch {
      /* demo mode — no threads */
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const newChat = async () => {
    try {
      const res = await fetch("/api/copilot/threads", { method: "POST" });
      const data = (await res.json()) as { thread?: { id: string } };
      setActiveId(data.thread?.id ?? null);
    } catch {
      setActiveId(null);
    }
    setSidebarOpen(false);
    void load();
  };

  const remove = async (id: string) => {
    try {
      await fetch(`/api/copilot/threads/${id}`, { method: "DELETE" });
    } catch {
      /* noop */
    }
    if (activeId === id) setActiveId(null);
    void load();
  };

  return (
    <div className="flex h-[calc(100dvh-140px)] min-h-[480px] gap-5 lg:h-[calc(100dvh-96px)]">
      {/* ---- thread sidebar (desktop) ---- */}
      <aside className="hidden w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-ink-2/60 md:flex">
        <div className="border-b border-line p-4">
          <Btn className="w-full" onClick={newChat}>
            + New chat
          </Btn>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {threads.length === 0 && (
            <p className="px-2 py-6 text-center text-xs leading-relaxed text-mist">
              No chats yet. Start one and I&apos;ll keep it here.
            </p>
          )}
          {threads.map((t) => (
            <div
              key={t.id}
              className={`group flex items-center gap-1 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                activeId === t.id ? "bg-ink-3 text-paper" : "text-fog hover:bg-ink-3/50 hover:text-paper"
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveId(t.id)}
                className="min-w-0 flex-1 truncate text-left font-medium"
              >
                {t.title || "Untitled chat"}
              </button>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label="Delete chat"
                className="pressable rounded-md p-1 text-mist opacity-0 transition-opacity hover:text-red-300 group-hover:opacity-100"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ---- mobile thread drawer ---- */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-ink/70"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute bottom-0 left-0 top-0 flex w-72 flex-col bg-ink-2 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line p-4">
              <p className="font-display text-sm font-bold">Chats</p>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close chats"
                className="pressable rounded-lg p-2 text-fog hover:bg-ink-3 hover:text-paper"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-3">
              <Btn className="w-full" onClick={newChat}>
                + New chat
              </Btn>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-3 pt-0">
              {threads.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setActiveId(t.id);
                    setSidebarOpen(false);
                  }}
                  className={`block w-full truncate rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                    activeId === t.id ? "bg-ink-3 text-paper" : "text-fog hover:bg-ink-3/50"
                  }`}
                >
                  {t.title || "Untitled chat"}
                </button>
              ))}
            </div>
          </aside>
        </div>
      )}

      {/* ---- chat ---- */}
      <div className="min-w-0 flex-1">
        <div className="mb-3 flex items-center gap-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="pressable flex items-center gap-2 rounded-xl border border-line bg-ink-2 px-3.5 py-2 text-sm font-medium text-fog hover:text-paper"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Chats
          </button>
        </div>
        <CopilotPanel key={activeId ?? "new"} variant="full" defaultThreadId={activeId} />
      </div>
    </div>
  );
}
