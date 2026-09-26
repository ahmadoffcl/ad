"use client";

import { useState } from "react";
import type { QCCheck } from "@/lib/types";
import { Btn, Pill } from "./ui";

const statusIcon = {
  pass: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  warn: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
    </svg>
  ),
  fail: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  ),
};

const bannerTone = {
  pass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  fail: "border-red-500/30 bg-red-500/10 text-red-300",
} as const;

const bannerCopy = {
  pass: "Shield green — this creative clears every check.",
  warn: "Shield amber — fix the warnings or override with a note.",
  fail: "Shield red — blocked until checks pass or you override.",
} as const;

export default function SlopPanel({
  checks,
  status,
  overridden,
  onOverride,
}: {
  checks: QCCheck[];
  status: "pass" | "warn" | "fail";
  overridden?: boolean;
  onOverride?: (note: string) => void;
}) {
  const [note, setNote] = useState("");
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${bannerTone[status]}`}>
        {statusIcon[status]}
        <p className="text-sm font-semibold">{overridden ? "Overridden — your note is on the record." : bannerCopy[status]}</p>
        <Pill tone={status === "pass" ? "green" : status === "warn" ? "amber" : "red"} className="ml-auto">
          Slop Shield · {status.toUpperCase()}
        </Pill>
      </div>

      <ul className="mt-3 space-y-2">
        {checks.map((c) => (
          <li key={c.id} className="flex items-start gap-3 rounded-xl border border-line bg-ink-3 px-3.5 py-2.5">
            <span className="mt-0.5 shrink-0">{statusIcon[c.status]}</span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-paper">{c.label}</p>
              <p className="text-xs leading-snug text-fog">{c.note}</p>
            </div>
          </li>
        ))}
      </ul>

      {onOverride && !overridden && status !== "pass" && (
        <div className="mt-3">
          {!showForm ? (
            <Btn variant="ghost" size="sm" onClick={() => setShowForm(true)}>
              Override with note
            </Btn>
          ) : (
            <div className="rounded-xl border border-line bg-ink-3 p-3">
              <input
                className="input"
                placeholder="Why is this acceptable? (goes on the record)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <Btn size="sm" disabled={!note.trim()} onClick={() => { onOverride(note.trim()); setShowForm(false); }}>
                  Confirm override
                </Btn>
                <Btn variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                  Cancel
                </Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
