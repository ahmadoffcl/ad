/**
 * Forge tool registry — 100+ real tools for the ad agent.
 *
 * Category files live in ./tools/ and export arrays of CopilotTool.
 * This index merges them, adds the meta tools (search_tools, describe_tool),
 * and builds the compact catalog that goes into the system prompt.
 *
 * Edge-safe: no Node imports.
 */
import {
  type CopilotCtx,
  type ToolResult,
  type CopilotTool,
  str,
} from "./toolutil";
import { coreTools, executeSchedulePost, type SchedulePostInput } from "./tools/core";
import { campaignTools } from "./tools/campaigns";
import { creativeTools } from "./tools/creative";
import { copyTools } from "./tools/copy";
import { brandTools } from "./tools/brands";
import { schedulingTools } from "./tools/scheduling";
import { analyticsTools } from "./tools/analytics";
import { trendTools } from "./tools/trends";
import { strategyTools } from "./tools/strategy";
import { accountTools } from "./tools/account";

export type { CopilotCtx, ToolResult, CopilotTool, SchedulePostInput };
export { executeSchedulePost };

/* ---------------- meta tools: discovery ---------------- */

const search_tools: CopilotTool = {
  name: "search_tools",
  description:
    "Search the full tool catalog by keyword. Use when the user needs something beyond the core tools — e.g. 'hashtag', 'budget', 'persona', 'api key'.",
  parameters: {
    query: { type: "string", description: "Keyword to search for.", required: true },
  },
  label: "Searching tools…",
  async run(args, ctx) {
    const q = str(args.query ?? args.q ?? args.keyword).toLowerCase();
    if (!q) return { ok: false, summary: "What should I search for?", data: {} };
    const words = q.split(/\s+/);
    const hits = COPILOT_TOOLS.filter(
      (t) =>
        t.name !== "search_tools" &&
        words.some((w) => t.name.includes(w) || t.description.toLowerCase().includes(w))
    ).slice(0, 8);
    void ctx;
    return {
      ok: true,
      summary: hits.length ? `${hits.length} tool(s) match "${q}". Call describe_tool for exact args.` : `Nothing matched "${q}".`,
      data: { tools: hits.map((t) => ({ name: t.name, description: t.description })) },
    };
  },
};

const describe_tool: CopilotTool = {
  name: "describe_tool",
  description: "Get the exact parameter schema for any tool before calling it.",
  parameters: {
    name: { type: "string", description: "Tool name.", required: true },
  },
  label: "Reading tool…",
  async run(args, ctx) {
    const name = str(args.name ?? args.tool);
    const t = COPILOT_TOOLS.find((x) => x.name === name);
    void ctx;
    if (!t) return { ok: false, summary: `No tool named "${name}".`, data: {} };
    return {
      ok: true,
      summary: `${t.name}: ${t.description}`,
      data: { name: t.name, description: t.description, parameters: t.parameters },
    };
  },
};

/* ---------------- registry ---------------- */

interface ToolCategory {
  title: string;
  tools: CopilotTool[];
}

const CATEGORIES: ToolCategory[] = [
  { title: "Essentials", tools: coreTools },
  { title: "Campaigns", tools: campaignTools },
  { title: "Creative & Hooks", tools: creativeTools },
  { title: "Copywriting", tools: copyTools },
  { title: "Brand Kit", tools: brandTools },
  { title: "Scheduling", tools: schedulingTools },
  { title: "Analytics", tools: analyticsTools },
  { title: "Trend Radar", tools: trendTools },
  { title: "Strategy", tools: strategyTools },
  { title: "Account", tools: accountTools },
  { title: "Meta", tools: [search_tools, describe_tool] },
];

export const COPILOT_TOOLS: CopilotTool[] = CATEGORIES.flatMap((c) => c.tools);

export const TOOL_COUNT = COPILOT_TOOLS.length;

/** Compact catalog for the system prompt: name + one-liner per tool, grouped. */
export function buildToolCatalog(): string {
  const out: string[] = [
    `FULL TOOL CATALOG — ${TOOL_COUNT} tools. Call any with {"tool":"<name>","args":{...}}.`,
    "Most tools accept sensible argument aliases; if unsure of exact args, call describe_tool once.",
    "",
  ];
  for (const c of CATEGORIES) {
    out.push(`### ${c.title}`);
    for (const t of c.tools) out.push(`- ${t.name}: ${t.description}`);
    out.push("");
  }
  return out.join("\n");
}

/** Dispatch helper: unknown tool names → clean error pointing at discovery. */
export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: CopilotCtx
): Promise<{ tool: CopilotTool; result: ToolResult }> {
  const tool = COPILOT_TOOLS.find((t) => t.name === name);
  if (!tool) {
    throw new Error(
      `Unknown tool "${name}". Call search_tools with a keyword to find the right tool.`
    );
  }
  const result = await tool.run(args ?? {}, ctx);
  return { tool, result };
}
