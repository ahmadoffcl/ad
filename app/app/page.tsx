"use client";

import { useForge } from "@/lib/store";
import { CopilotPanel } from "@/components/copilot/CopilotPanel";
import { Pill } from "@/components/ui";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function AgentHome() {
  const { profile, activeBrand } = useForge();
  const firstName = profile.name?.split(" ")[0] || "founder";

  return (
    <div className="flex h-[calc(100dvh-188px)] min-h-[480px] flex-col sm:h-[calc(100dvh-160px)] lg:h-[calc(100dvh-128px)]">
      {/* greeting */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-xl font-bold tracking-tight text-paper sm:text-2xl">
            {greeting()}, {firstName}.
          </h1>
          <p className="mt-0.5 text-[13px] text-fog">
            Tell Forge what you need — it does the work, you approve.
          </p>
        </div>
        <Pill tone="accent" className="shrink-0">
          {activeBrand.name}
        </Pill>
      </div>

      {/* the agent */}
      <div className="min-h-0 flex-1">
        <CopilotPanel variant="full" />
      </div>
    </div>
  );
}
