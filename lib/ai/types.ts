// Shared types for the agentic layer. One AgentDefinition per agent (lib/ai/agents/*.ts),
// aggregated into a registry (lib/ai/agents/registry.ts) that the runner and API routes consume.

export interface AgentToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface AgentRunContext {
  systemId: string | null;
  agentRunId: string;
  extraInput?: Record<string, unknown>;
}

export interface AgentDefinition {
  key: string;
  label: string;
  description: string;
  /** Whether the UI should require the caller to pick an ai_systems.id before running. */
  needsSystem: boolean;
  /** Whether the UI should require a free-form ID (e.g. an incident or explanation-request id). */
  extraInputKey?: string;
  extraInputLabel?: string;
  /** post_market_monitoring / regulatory_change_monitoring: never produce agent_proposals rows. */
  informationalOnly?: boolean;
  systemPrompt: string;
  tools: AgentToolDefinition[];
  buildInitialMessage: (ctx: AgentRunContext) => string;
  executeTool: (name: string, input: any, ctx: AgentRunContext) => Promise<unknown>;
}
