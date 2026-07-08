import { SectionHeading } from "@/components/ui/Glass";
import { WorkflowsClient } from "./WorkflowsClient";

export default function WorkflowsPage() {
  return (
    <div>
      <SectionHeading title="Workflows" subtitle="State machines for the five core Aegis workflows. Click a state to see who can act on each transition." />
      <WorkflowsClient />
    </div>
  );
}
