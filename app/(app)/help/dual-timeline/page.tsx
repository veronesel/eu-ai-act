import { SectionHeading } from "@/components/ui/Glass";
import { DualTimelineClient } from "./DualTimelineClient";

export default function DualTimelinePage() {
  return (
    <div>
      <SectionHeading title="The dual-timeline explainer" subtitle="This is the single biggest functional difference from a generic AI-governance app: two named regulatory baselines, not a hardcoded date." />
      <DualTimelineClient />
    </div>
  );
}
