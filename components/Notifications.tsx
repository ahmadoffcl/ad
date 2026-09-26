"use client";

import { useEffect, useState } from "react";
import { useForge } from "@/lib/store";
import { Btn, EmptyState, Skeleton } from "@/components/ui";
import type { AppNotification } from "@/lib/types";

export const NOTIFICATIONS_EVENT = "adforge:open-notifications";

/* ---------- bell ---------- */

export function NotificationsBell() {
  const { unreadCount } = useForge();

  const open = () => window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT));

  return (
    <button
      onClick={open}
      aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink-3 text-fog transition-colors hover:border-mist/70 hover:text-paper"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 003.4 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-molten px-1 font-display text-[10px] font-bold text-onaccent">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}

/* ---------- panel ---------- */

const KIND_DOT: Record<AppNotification["kind"], string> = {
  info: "bg-molten",
  success: "bg-emerald-400",
  warn: "bg-amber-400",
};

export function NotificationsPanel() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useForge();
  const [open, setOpen] = useState(false);
  const [shimmer, setShimmer] = useState(false);

  useEffect(() => {
    const onEvent = () => {
      setOpen((o) => {
        if (!o) {
          // first open per toggle: 300ms shimmer to demonstrate the skeleton
          setShimmer(true);
          setTimeout(() => setShimmer(false), 300);
        }
        return !o;
      });
    };
    window.addEventListener(NOTIFICATIONS_EVENT, onEvent);
    return () => window.removeEventListener(NOTIFICATIONS_EVENT, onEvent);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  const unread = notifications.filter((n) => !n.read);
  const unreadIds = new Set(unread.map((n) => n.id));
  const sorted = [...notifications].sort(
    (a, b) => Number(unreadIds.has(a.id)) - Number(unreadIds.has(b.id))
  );

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Notifications">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] animate-fade-in" onClick={() => setOpen(false)} />
      <div className="absolute inset-x-0 bottom-0 top-auto max-h-[78vh] card animate-fade-up overflow-hidden rounded-b-none sm:inset-x-auto sm:bottom-auto sm:right-5 sm:top-16 sm:w-96 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h3 className="h-display text-base">Notifications</h3>
          <div className="flex items-center gap-2">
            {unread.length > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="text-xs font-semibold text-molten-soft transition-colors hover:text-molten"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              aria-label="Close notifications"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-fog transition-colors hover:bg-ink-3 hover:text-paper"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 sm:max-h-[52vh]">
          {shimmer ? (
            <div className="space-y-2 p-1" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex gap-3 rounded-xl p-2">
                  <Skeleton className="mt-1.5 h-2 w-2 shrink-0 !rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-1">
              <EmptyState
                title="Nothing here yet"
                body="When the forge has news — posts going live, gate decisions, trend spikes — it'll land here."
              />
            </div>
          ) : (
            <>
              {unread.length === 0 && (
                <p className="mb-2 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-300">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  All caught up — nothing unread.
                </p>
              )}
              {sorted.map((n) => {
                const isUnread = unreadIds.has(n.id);
                return (
                  <button
                    key={n.id}
                    onClick={() => markNotificationRead(n.id)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3.5 py-3 text-left transition-colors ${
                      isUnread ? "bg-molten-wash/60 hover:bg-molten-wash" : "hover:bg-ink-3"
                    }`}
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_DOT[n.kind]}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`text-sm ${isUnread ? "font-bold text-paper" : "font-semibold text-fog"}`}>
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-mist">{n.time}</span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-fog">{n.body}</span>
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationsBell;
