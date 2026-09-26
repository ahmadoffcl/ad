"use client";

import React from "react";
import { Markdown } from "./markdown";
import ConceptCard, { ConceptCardItem } from "./ConceptCard";
import ConfirmCard from "./ConfirmCard";

export interface ChatCard {
  kind: "concepts";
  items: ConceptCardItem[];
}

export interface ChatConfirm {
  id: string;
  title: string;
  summary: string;
  details: string[];
}

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards?: ChatCard[];
  confirm?: ChatConfirm;
  workingLabel?: string;
}

function WorkingDots({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2.5 px-1 py-1">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-molten"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
      <span className="text-xs font-medium text-fog">{label}</span>
    </div>
  );
}

export default function ChatMessage({
  msg,
  threadId,
  onConfirm,
}: {
  msg: ChatMessageData;
  threadId?: string;
  onConfirm?: (confirm: ChatConfirm, confirmed: boolean) => Promise<void>;
}) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-molten px-4 py-2.5 text-sm leading-relaxed text-ink">
          <Markdown text={msg.content} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-molten font-display text-sm font-bold text-ink"
      >
        F
      </span>
      <div className="min-w-0 max-w-[88%] space-y-2.5">
        <p className="text-[11px] font-semibold tracking-wide text-fog">Forge Copilot</p>
        {msg.workingLabel ? (
          <div className="rounded-2xl rounded-tl-md border border-line bg-ink-2 px-4 py-3">
            <WorkingDots label={msg.workingLabel} />
          </div>
        ) : (
          <>
            {msg.content && (
              <div className="rounded-2xl rounded-tl-md border border-line bg-ink-2 px-4 py-3">
                <Markdown text={msg.content} />
              </div>
            )}
            {msg.cards?.map((card, i) =>
              card.kind === "concepts" ? (
                <div key={i} className="space-y-2">
                  {card.items.map((item, j) => (
                    <ConceptCard key={j} item={item} />
                  ))}
                </div>
              ) : null
            )}
            {msg.confirm && onConfirm && (
              <ConfirmCard
                confirm={msg.confirm}
                onResolve={(confirmed) => onConfirm(msg.confirm!, confirmed)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
