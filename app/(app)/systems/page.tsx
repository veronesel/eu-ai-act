import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { GlassCard, SectionHeading } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { Boxes } from "lucide-react";
import { NewSystemButton } from "./NewSystemButton";

export default function SystemsPage() {
  const db = getDb();
  const systems = db.prepare(`SELECT * FROM ai_systems ORDER BY name`).all() as any[];
  const users = db.prepare(`SELECT id, name FROM users`).all() as any[];
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  return (
    <div>
      <SectionHeading
        title="AI System Inventory & Registry"
        subtitle="The hub every classification, obligation, and evidence record deep-links into. Eurobank Capital SpA is modeled as both Provider and Deployer, sometimes for the same system."
        action={<NewSystemButton />}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {systems.map((s) => (
          <Link key={s.id} href={`/systems/${s.id}`}>
            <GlassCard className="h-full hover:border-aegis-emerald/40 transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-2 mb-2">
                <Boxes className="h-5 w-5 text-aegis-teal shrink-0 mt-0.5" />
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {!!s.provider_role_applies && <Badge tone="info">Provider</Badge>}
                  {!!s.deployer_role_applies && <Badge tone="info">Deployer</Badge>}
                </div>
              </div>
              <h3 className="font-heading font-semibold text-base leading-snug">{s.name}</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2">{s.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <Badge tone={toneForStatus(s.classification_status)}>{s.classification_status.replace(/_/g, " ")}</Badge>
                <span className="text-[10px] text-[var(--text-muted)] capitalize">{s.lifecycle_stage.replace(/_/g, " ")}</span>
              </div>
              {s.annex_iii_category && <div className="mt-2 text-[10px] text-[var(--text-muted)]">Annex III: {s.annex_iii_category}</div>}
              <div className="mt-2 text-[10px] text-[var(--text-muted)]">Owner: {userMap[s.owner_persona_id]}</div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
