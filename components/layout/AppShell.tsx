"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV_GROUPS } from "./nav-config";
import { useTheme } from "@/lib/context/ThemeProvider";
import { BaselineBanner } from "./BaselineBanner";
import { ChevronLeft, ChevronRight, Moon, Sun, LogOut, Bell, Search } from "lucide-react";

interface CurrentUser {
  id: string;
  role_code: string;
  name: string;
  title: string;
}

export function AppShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      <aside className={`${collapsed ? "w-16" : "w-72"} shrink-0 transition-all duration-200 border-r border-[var(--panel-border)] glass-panel !rounded-none flex flex-col`}>
        <div className="flex items-center gap-2 px-4 h-16 shrink-0">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-aegis-emerald to-aegis-indigo flex items-center justify-center font-heading font-bold text-white text-sm shrink-0">A</div>
          {!collapsed && <span className="font-heading font-semibold text-lg">Aegis</span>}
          <button onClick={() => setCollapsed((c) => !c)} className="ml-auto text-[var(--text-muted)] hover:text-[var(--foreground)]">
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              {!collapsed && <div className="px-3 text-[10px] uppercase tracking-wider text-[var(--text-muted)] mb-1">{group.label}</div>}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        active ? "bg-aegis-emerald/15 text-aegis-emerald font-medium" : "text-[var(--text-secondary)] hover:bg-white/5 hover:text-[var(--foreground)]"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 border-b border-[var(--panel-border)] glass-panel !rounded-none flex items-center gap-4 px-6">
          <div className="flex items-center gap-2 text-[var(--text-muted)] text-sm max-w-xs">
            <Search className="h-4 w-4" />
            <input placeholder="Search systems, obligations…" className="bg-transparent outline-none text-sm w-full placeholder:text-[var(--text-muted)]" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={toggle} className="p-2 rounded-lg hover:bg-white/5" title="Toggle theme">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button className="p-2 rounded-lg hover:bg-white/5 relative" title="Notifications">
              <Bell className="h-4 w-4" />
            </button>
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium leading-tight">{user.name}</div>
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{user.role_code.replace(/_/g, " ")}</div>
            </div>
            <button onClick={logout} className="p-2 rounded-lg hover:bg-white/5" title="Switch user">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <BaselineBanner />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
