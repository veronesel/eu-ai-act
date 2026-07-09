import { NextRequest } from "next/server";
import { isAnthropicConfigured } from "@/lib/ai/client";
import { AGENT_REGISTRY } from "@/lib/ai/agents/registry";
import { runAgent, type TraceStep } from "@/lib/ai/runner";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(req: NextRequest, { params }: { params: { agentKey: string } }) {
  const user = getCurrentUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthenticated" }), { status: 401 });

  const agent = AGENT_REGISTRY[params.agentKey];
  if (!agent) return new Response(JSON.stringify({ error: `Unknown agent: ${params.agentKey}` }), { status: 404 });

  if (!isAnthropicConfigured()) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not configured in this environment. Set it in .env.local to run agents." }),
      { status: 412, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await req.json().catch(() => ({}));
  const systemId: string | undefined = body.systemId;
  const extraInput: Record<string, unknown> | undefined = body.extraInput;
  if (agent.needsSystem && !systemId) {
    return new Response(JSON.stringify({ error: `${agent.label} requires a system to be selected.` }), { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(step: TraceStep) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(step)}\n\n`));
      }
      try {
        await runAgent(params.agentKey, { systemId, extraInput }, send);
      } catch (err: any) {
        send({ type: "error", message: err?.message ?? String(err) });
        send({ type: "done", runId: "", status: "failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
