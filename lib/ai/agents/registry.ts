import type { AgentDefinition } from "../types";
import { classificationAgent } from "./classification";
import { technicalDocumentationAgent } from "./technical-documentation";
import { friaAgent } from "./fria";
import { conformityReadinessAgent } from "./conformity-readiness";
import { seriousIncidentAgent } from "./serious-incident";
import { postMarketMonitoringAgent } from "./post-market-monitoring";
import { regulatoryChangeMonitoringAgent } from "./regulatory-change-monitoring";
import { transparencyScanningAgent } from "./transparency-scanning";
import { individualExplanationAgent } from "./individual-explanation";

export const AGENT_REGISTRY: Record<string, AgentDefinition> = {
  [classificationAgent.key]: classificationAgent,
  [technicalDocumentationAgent.key]: technicalDocumentationAgent,
  [friaAgent.key]: friaAgent,
  [conformityReadinessAgent.key]: conformityReadinessAgent,
  [seriousIncidentAgent.key]: seriousIncidentAgent,
  [postMarketMonitoringAgent.key]: postMarketMonitoringAgent,
  [regulatoryChangeMonitoringAgent.key]: regulatoryChangeMonitoringAgent,
  [transparencyScanningAgent.key]: transparencyScanningAgent,
  [individualExplanationAgent.key]: individualExplanationAgent,
};

export const AGENT_LIST: AgentDefinition[] = Object.values(AGENT_REGISTRY);
