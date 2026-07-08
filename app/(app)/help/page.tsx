import Link from "next/link";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Map, BookOpen, GitBranch, Workflow, Network, Users, Scale, Rocket, FileStack } from "lucide-react";

const PAGES = [
  { href: "/help/structure", title: "How Aegis is structured", desc: "Module constellation map — A-E clusters, clickable.", icon: Map },
  { href: "/help/act-at-a-glance", title: "The Act at a glance", desc: "Title-by-title orientation to Regulation (EU) 2024/1689.", icon: BookOpen },
  { href: "/help/dual-timeline", title: "The dual-timeline explainer", desc: "Original AI Act vs. Digital Omnibus dates, side by side, live-toggled.", icon: GitBranch },
  { href: "/help/workflows", title: "Workflows", desc: "State machines for classification, conformity, FRIA, incidents, agent approval.", icon: Workflow },
  { href: "/help/entity-map", title: "Entity map", desc: "ER-style map of the core data aggregates.", icon: Network },
  { href: "/help/role-guides", title: "Role guides", desc: "Mission, dashboard tour, and MUST/CAN actions per persona.", icon: Users },
  { href: "/help/regulatory-context", title: "Regulatory context", desc: "Plain-language orientation, Digital Omnibus status, GPAI Code of Practice, and scope disclaimer.", icon: Scale },
  { href: "/help/getting-started", title: "Getting started", desc: "A 5-step guided tour, each step deep-linking into the live app.", icon: Rocket },
  { href: "/help/archer-portability", title: "Archer portability appendix", desc: "How Aegis's aggregates map onto Archer IRM for later porting.", icon: FileStack },
];

export default function HelpHubPage() {
  return (
    <div>
      <SectionHeading
        title="Help Center"
        subtitle="Aegis is a reference / demo implementation of Regulation (EU) 2024/1689 compliance workflows for a fictional bank. It is not a certified compliance tool and not legal advice."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {PAGES.map((p) => (
          <Link key={p.href} href={p.href}>
            <GlassCard className="h-full hover:border-aegis-emerald/40 transition-colors cursor-pointer">
              <p.icon className="h-5 w-5 text-aegis-teal mb-2" />
              <h3 className="font-heading font-semibold text-sm">{p.title}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{p.desc}</p>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
