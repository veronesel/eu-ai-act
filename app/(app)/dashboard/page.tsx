import { getCurrentUser } from "@/lib/auth/session";
import { GlassCard } from "@/components/ui/Glass";

export default function DashboardPage() {
  const user = getCurrentUser()!;
  return (
    <div>
      <GlassCard>
        <h1 className="font-heading text-2xl font-semibold">Welcome, {user.name}</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">{user.mission}</p>
      </GlassCard>
    </div>
  );
}
