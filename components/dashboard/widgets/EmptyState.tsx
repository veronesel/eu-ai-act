import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export function EmptyState({ text, icon: Icon = Inbox }: { text: string; icon?: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      <Icon className="h-5 w-5 text-[var(--text-muted)]" />
      <p className="text-xs text-[var(--text-muted)]">{text}</p>
    </div>
  );
}
