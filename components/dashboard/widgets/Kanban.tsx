import Link from "next/link";
import type { Tone } from "../tone";
import { TONE_TEXT, TONE_BORDER } from "../tone";

export interface KanbanCard {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
}

export interface KanbanColumn {
  key: string;
  label: string;
  tone: Tone;
  cards: KanbanCard[];
}

/** Simple Kanban-style board — columns of cards, hand-rolled with flex/grid. */
export function Kanban({ columns }: { columns: KanbanColumn[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {columns.map((col) => (
        <div key={col.key} className={`rounded-lg border ${TONE_BORDER[col.tone]} bg-white/[0.02] flex flex-col min-h-[120px]`}>
          <div className="px-3 py-2 border-b border-[var(--panel-border)] flex items-center justify-between">
            <span className={`text-xs font-semibold ${TONE_TEXT[col.tone]}`}>{col.label}</span>
            <span className="text-[10px] text-[var(--text-muted)]">{col.cards.length}</span>
          </div>
          <div className="p-2 space-y-1.5 flex-1">
            {col.cards.length === 0 ? (
              <p className="text-[11px] text-[var(--text-muted)] italic px-1">Empty</p>
            ) : (
              col.cards.map((card) => {
                const inner = (
                  <div className="rounded-md bg-white/[0.04] hover:bg-white/[0.08] transition-colors px-2 py-1.5">
                    <p className="text-[11px] font-medium leading-snug">{card.title}</p>
                    {card.subtitle && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{card.subtitle}</p>}
                  </div>
                );
                return card.href ? (
                  <Link key={card.id} href={card.href} className="block">
                    {inner}
                  </Link>
                ) : (
                  <div key={card.id}>{inner}</div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
