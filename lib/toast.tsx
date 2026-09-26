"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type ToastKind = "success" | "info" | "warn" | "error";

export interface Toast {
  id: string;
  title: string;
  body?: string;
  kind: ToastKind;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (title: string, opts?: { body?: string; kind?: ToastKind }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  push: () => {},
  dismiss: () => {},
});

const KIND_STYLES: Record<ToastKind, { dot: string; ring: string }> = {
  success: { dot: "bg-emerald-400", ring: "border-emerald-500/30" },
  info: { dot: "bg-molten", ring: "border-molten/30" },
  warn: { dot: "bg-amber-400", ring: "border-amber-500/30" },
  error: { dot: "bg-red-400", ring: "border-red-500/30" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (title: string, opts?: { body?: string; kind?: ToastKind }) => {
      const id = `t${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
      const toast: Toast = { id, title, body: opts?.body, kind: opts?.kind ?? "success" };
      setToasts((ts) => [...ts.slice(-3), toast]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), 4200)
      );
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* viewport */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-8 lg:bottom-8"
      >
        {toasts.map((t) => {
          const s = KIND_STYLES[t.kind];
          return (
            <div
              key={t.id}
              className={`card animate-toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 border ${s.ring} p-3.5 pr-10 shadow-lift`}
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-paper">{t.title}</p>
                {t.body && <p className="mt-0.5 text-xs text-fog">{t.body}</p>}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg text-mist transition-colors hover:bg-ink-3 hover:text-paper"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}
