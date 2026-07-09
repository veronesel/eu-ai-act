// The real Anthropic tool-use loop: stop_reason === "tool_use" -> execute -> return tool_result -> repeat
// until stop_reason === "end_turn" (or a safety cap is hit). Every trace step is pushed through onStep so
// the API route can forward it to the browser as an SSE event — this streams step-by-step (per model call
// and per tool execution) rather than token-by-token, which keeps the loop simple and reliable while still
// giving the UI a live, non-fake progress trace.
import { getAnthropicClient, isAnthropicConfigured, MODEL_NAME } from "./client";
import { getDb, newId, nowIso } from "@/lib/db/client";
import { AGENT_REGISTRY } from "./agents/registry";
import type { AgentRunContext } from "./types";

export type TraceStep =
  | { type: "text"; text: string }
  | { type: "tool_call"; name: string; input: unknown }
  | { type: "tool_result"; name: string; output: unknown }
  | { type: "error"; message: string }
  | { type: "done"; runId: string; status: "completed" | "failed" };

const MAX_ITERATIONS = 8;

export async function runAgent(
  agentKey: string,
  opts: { systemId?: string | null; extraInput?: Record<string, unknown> },
  onStep: (step: TraceStep) => void
): Promise<{ runId: string; status: "completed" | "failed" }> {
  const agent = AGENT_REGISTRY[agentKey];
  if (!agent) throw new Error(`Unknown agent: ${agentKey}`);
  if (!isAnthropicConfigured()) throw new Error("ANTHROPIC_API_KEY is not configured");

  const db = getDb();
  const runId = newId("run");
  db.prepare(
    `INSERT INTO agent_runs (id, agent_key, trigger_context, system_id, started_at, status, tool_calls_json, trace_json, input_tokens, output_tokens)
     VALUES (?, ?, ?, ?, ?, 'running', '[]', '[]', 0, 0)`
  ).run(runId, agentKey, opts.extraInput ? JSON.stringify(opts.extraInput) : null, opts.systemId ?? null, nowIso());

  const ctx: AgentRunContext = { systemId: opts.systemId ?? null, agentRunId: runId, extraInput: opts.extraInput };
  const client = getAnthropicClient();
  const trace: TraceStep[] = [];
  const toolCalls: Array<{ name: string; input: unknown; output: unknown }> = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const tools = agent.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema as any }));
  const messages: any[] = [{ role: "user", content: agent.buildInitialMessage(ctx) }];

  function emit(step: TraceStep) {
    trace.push(step);
    onStep(step);
  }

  try {
    let iterations = 0;
    const finalStatus: "completed" | "failed" = "completed";

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const response = await client.messages.create({
        model: MODEL_NAME,
        max_tokens: 4096,
        system: agent.systemPrompt,
        messages,
        tools,
      });

      totalInputTokens += response.usage?.input_tokens ?? 0;
      totalOutputTokens += response.usage?.output_tokens ?? 0;

      const textBlocks = response.content.filter((b: any) => b.type === "text") as any[];
      for (const b of textBlocks) {
        if (b.text?.trim()) emit({ type: "text", text: b.text });
      }

      messages.push({ role: "assistant", content: response.content });

      if (response.stop_reason !== "tool_use") {
        break;
      }

      const toolUseBlocks = response.content.filter((b: any) => b.type === "tool_use") as any[];
      const toolResults: any[] = [];
      for (const block of toolUseBlocks) {
        emit({ type: "tool_call", name: block.name, input: block.input });
        let output: unknown;
        try {
          output = await agent.executeTool(block.name, block.input, ctx);
        } catch (err: any) {
          output = { error: err?.message ?? String(err) };
        }
        toolCalls.push({ name: block.name, input: block.input, output });
        emit({ type: "tool_result", name: block.name, output });
        toolResults.push({ type: "tool_result", tool_use_id: block.id, content: JSON.stringify(output) });
      }
      messages.push({ role: "user", content: toolResults });
    }

    db.prepare(
      `UPDATE agent_runs SET status = ?, finished_at = ?, trace_json = ?, tool_calls_json = ?, input_tokens = ?, output_tokens = ? WHERE id = ?`
    ).run(finalStatus, nowIso(), JSON.stringify(trace), JSON.stringify(toolCalls), totalInputTokens, totalOutputTokens, runId);

    emit({ type: "done", runId, status: finalStatus });
    return { runId, status: finalStatus };
  } catch (err: any) {
    const message = err?.message ?? String(err);
    db.prepare(`UPDATE agent_runs SET status = 'failed', finished_at = ?, trace_json = ?, tool_calls_json = ?, error_text = ? WHERE id = ?`)
      .run(nowIso(), JSON.stringify(trace), JSON.stringify(toolCalls), message, runId);
    emit({ type: "error", message });
    emit({ type: "done", runId, status: "failed" });
    return { runId, status: "failed" };
  }
}
