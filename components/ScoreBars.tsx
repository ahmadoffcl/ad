import type { HookResult } from "@/lib/types";
import { Bar, ScoreRing } from "./ui";

function toneFor(ratio: number): "green" | "amber" | "red" {
  if (ratio >= 0.7) return "green";
  if (ratio >= 0.45) return "amber";
  return "red";
}

export default function ScoreBars({ hook, compact }: { hook: HookResult; compact?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <ScoreRing score={hook.score} size={compact ? 56 : 72} />
        <div>
          <p className="font-display text-lg font-bold text-paper">{hook.grade}</p>
          <p className="text-xs text-fog">Deterministic heuristic — every point explained below.</p>
        </div>
      </div>
      <div className={`mt-4 space-y-3 ${compact ? "hidden" : ""}`}>
        {hook.parts.map((p) => (
          <div key={p.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-xs font-semibold text-paper">{p.label}</span>
              <span className="font-display text-xs font-bold text-fog">
                {p.points}<span className="text-mist">/{p.max}</span>
              </span>
            </div>
            <Bar value={p.points} max={p.max} tone={toneFor(p.points / p.max)} />
            <p className="mt-1 text-[11px] leading-snug text-mist">{p.note}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
