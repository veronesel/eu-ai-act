"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, LogIn, Loader2 } from "lucide-react";

interface DemoUser {
  id: string;
  role_code: string;
  name: string;
  title: string;
  mission: string;
}

const SEED_STEPS = ["systems", "classification records", "provider suite records", "deployer suite records", "incidents & monitoring events"];

export function LoginPanel({ users }: { users: DemoUser[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(users[0]?.id ?? "");
  const [loggingIn, setLoggingIn] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedStep, setSeedStep] = useState(0);

  async function enterAs(userId: string) {
    setLoggingIn(true);
    await fetch("/api/auth/login", { method: "POST", body: JSON.stringify({ userId }), headers: { "Content-Type": "application/json" } });
    router.push("/dashboard");
    router.refresh();
  }

  async function regenerate() {
    setSeeding(true);
    setSeedStep(0);
    const interval = setInterval(() => setSeedStep((s) => Math.min(s + 1, SEED_STEPS.length - 1)), 350);
    await fetch("/api/demo/seed", { method: "POST" });
    clearInterval(interval);
    setSeeding(false);
    router.refresh();
  }

  return (
    <div className="glass-panel p-6 space-y-5">
      <div>
        <label className="text-xs uppercase tracking-wide text-[var(--text-muted)] font-medium">Enter as…</label>
        <div className="mt-2 space-y-2 max-h-80 overflow-y-auto pr-1">
          {users.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelected(u.id)}
              className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
                selected === u.id ? "border-aegis-emerald/60 bg-aegis-emerald/10" : "border-[var(--panel-border)] hover:bg-white/5"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{u.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{u.role_code.replace(/_/g, " ")}</span>
              </div>
              <div className="text-xs text-[var(--text-secondary)]">{u.title}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{u.mission}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--panel-border)]">
        <button
          onClick={() => enterAs(selected)}
          disabled={loggingIn || !selected}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white font-medium py-2.5 disabled:opacity-60"
        >
          {loggingIn ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Fast login
        </button>
        <button
          onClick={regenerate}
          disabled={seeding}
          title="Wipes and re-seeds the 10-system demo portfolio"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${seeding ? "animate-spin" : ""}`} />
          Regenerate demo data
        </button>
      </div>
      {seeding && (
        <div className="text-xs text-[var(--text-muted)]">Generating {SEED_STEPS[seedStep]}…</div>
      )}
    </div>
  );
}
