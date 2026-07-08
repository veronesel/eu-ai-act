// Single point of contact with the Anthropic SDK. Per the build spec: if a newer
// generally-available model is preferred at build time, swap this one constant —
// nothing else in the agentic layer references the model string directly.
import Anthropic from "@anthropic-ai/sdk";

export const MODEL_NAME = "claude-sonnet-4-6";

export function getAnthropicClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export function isAnthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
