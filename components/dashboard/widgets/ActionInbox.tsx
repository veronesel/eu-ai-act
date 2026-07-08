import Link from "next/link";
import { GlassCard } from "@/components/ui/Glass";
import { ArrowRight, AlertCircle, Sparkles, Inbox } from "lucide-react";

export interface ActionItem {
  id: string;
  label: string;
  detail?: string;
  href?: string;
  badge?: string;
}

/**
 * Action Inbox — split MUST (deadline-bound/blocking) vs CAN (optional/agent-assisted/FYI).
 * Always rendered prominently, never below the fold.
 */
export function ActionInbox({ must, can }: { must: ActionItem[]; can: ActionItem[] }) {
  return (
    <GlassCard className="flex flex-col gap-5 h-full">
      <div className="flex items-center gap-2">
        <Inbox className="h-4 w-4 text-[var(--text-secondary)]" />
        <h3 className="font-heading font-semibold text-sm">Action Inbox</h3>
      </div>

      <ActionSection
        title="MUST"
        description="Deadline-bound or blocking"
        items={must}
        icon={AlertCircle}
        borderClass="border-l-rose-500"
        badgeClass="bg-rose-500/10 text-rose-400"
        emptyText="Nothing blocking right now."
      />

      <ActionSection
        title="CAN"
        description="Optional, agent-assisted, or FYI"
        items={can}
        icon={Sparkles}
        borderClass="border-l-aegis-teal"
        badgeClass="bg-aegis-teal/10 text-aegis-teal"
        emptyText="No optional items queued."
      />
    </GlassCard>
  );
}

function ActionSection({
  title,
  description,
  items,
  icon: Icon,
  borderClass,
  badgeClass,
  emptyText,
}: {
  title: string;
  description: string;
  items: ActionItem[];
  icon: typeof AlertCircle;
  borderClass: string;
  badgeClass: string;
  emptyText: string;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-2">
        <span className={`text-[11px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${badgeClass}`}>{title}</span>
        <span className="text-[11px] text-[var(--text-muted)]">{description}</span>
        <span className="ml-auto text-[11px] text-[var(--text-muted)]">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] italic pl-2">{emptyText}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const content = (
              <div className={`border-l-4 ${borderClass} rounded-r-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors px-3 py-2`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium leading-snug">{item.label}</p>
                  {item.href && <ArrowRight className="h-3 w-3 shrink-0 text-[var(--text-muted)] mt-0.5" />}
                </div>
                {item.detail && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{item.detail}</p>}
                {item.badge && <span className="inline-block mt-1 text-[10px] text-[var(--text-muted)]">{item.badge}</span>}
              </div>
            );
            return (
              <li key={item.id}>
                {item.href ? (
                  <Link href={item.href} className="block">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
