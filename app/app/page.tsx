"use client";

import { CopilotPanel } from "@/components/copilot/CopilotPanel";

/** Forge home — just the agent. No dashboard, no cards, no chrome. */
export default function AgentHome() {
  return (
    <div className="flex h-[calc(100dvh-130px)] min-h-[480px] flex-col">
      <div className="min-h-0 flex-1">
        <CopilotPanel variant="full" bare />
      </div>
    </div>
  );
}
