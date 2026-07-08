import Link from "next/link";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { ArrowRight } from "lucide-react";

const STEPS = [
  { n: 1, title: "Regenerate demo data", desc: "Wipe and re-seed the 10-system portfolio with varied specifics. The shape is always preserved: one blocked system, one out-of-scope system, five high-risk, and so on.", href: "/login", cta: "Go to login screen" },
  { n: 2, title: "Pick a persona", desc: "Fast-login as any of the 8 demo users — no password. Each lands on a role-specific dashboard.", href: "/login", cta: "Choose a persona" },
  { n: 3, title: "Read your posture", desc: "The Posture Header at the top of your dashboard answers 'what's my situation' in under 5 seconds: headline metrics plus a MUST/CAN action inbox.", href: "/dashboard", cta: "Open dashboard" },
  { n: 4, title: "Clear a MUST action", desc: "Open an item from your Action Inbox — an overdue risk review, an open incident, an unanswered explanation request — and resolve it.", href: "/systems", cta: "Browse systems" },
  { n: 5, title: "Run an agent", desc: "Open the Agentic Layer, pick an agent, run it against a real system, watch the tool-use trace stream in, then approve or reject the resulting proposal.", href: "/agents", cta: "Open agents" },
];

export default function GettingStartedPage() {
  return (
    <div>
      <SectionHeading title="Getting started" subtitle="A 5-step guided tour. Each step deep-links into the live app." />
      <div className="space-y-3">
        {STEPS.map((s) => (
          <GlassCard key={s.n} className="flex items-start gap-4">
            <div className="h-8 w-8 rounded-full bg-aegis-emerald/15 text-aegis-emerald flex items-center justify-center font-heading font-semibold shrink-0">{s.n}</div>
            <div className="flex-1">
              <h3 className="font-heading font-semibold">{s.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">{s.desc}</p>
              <Link href={s.href} className="inline-flex items-center gap-1 text-sm text-aegis-emerald hover:underline mt-2">{s.cta} <ArrowRight className="h-3.5 w-3.5" /></Link>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
