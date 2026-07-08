import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const user = getCurrentUser();
  if (!user) redirect("/login");
  return <AppShell user={user}>{children}</AppShell>;
}
