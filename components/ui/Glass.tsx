import { cn } from "@/lib/utils";

export function GlassCard({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("glass-panel p-5", className)} {...props}>
      {children}
    </div>
  );
}

export function SectionHeading({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
