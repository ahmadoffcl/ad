"use client";

import React, { useState } from "react";
import { Btn } from "../ui";
import type { ChatConfirm } from "./ChatMessage";

export default function ConfirmCard({
  confirm,
  onResolve,
}: {
  confirm: ChatConfirm;
  onResolve: (confirmed: boolean) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [resolved, setResolved] = useState<"confirmed" | "cancelled" | null>(null);

  const act = async (confirmed: boolean) => {
    setPending(true);
    try {
      await onResolve(confirmed);
      setResolved(confirmed ? "confirmed" : "cancelled");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-molten/30 bg-molten-wash/40">
      <div className="p-3.5">
        <p className="font-display text-sm font-bold text-paper">{confirm.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-fog">{confirm.summary}</p>
        <ul className="mt-2.5 space-y-1.5">
          {confirm.details.map((d, i) => (
            <li
              key={i}
              className="flex items-start gap-2 rounded-lg bg-ink-2/70 px-2.5 py-1.5 text-xs text-paper"
            >
              <span className="mt-0.5 text-molten" aria-hidden="true">
                →
              </span>
              {d}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2 border-t border-molten/20 px-3.5 py-2.5">
        {resolved ? (
          <span className="text-xs font-semibold text-fog">
            {resolved === "confirmed" ? "✓ Confirming — watch the chat below." : "Cancelled. No changes made."}
          </span>
        ) : (
          <>
            <Btn size="sm" onClick={() => act(true)} disabled={pending}>
              {pending ? "Working…" : "Confirm"}
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => act(false)} disabled={pending}>
              Cancel
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}
