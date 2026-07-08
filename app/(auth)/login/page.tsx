import { getDb } from "@/lib/db/client";
import { seedStatic } from "@/lib/db/seed-static";
import { LoginPanel } from "./LoginPanel";

export default function LoginPage() {
  seedStatic();
  const db = getDb();
  const users = db.prepare(`SELECT id, role_code, name, title, mission FROM users ORDER BY rowid`).all() as any[];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-aegis-emerald to-aegis-indigo flex items-center justify-center font-heading font-bold text-white">A</div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight">Aegis</h1>
          </div>
          <p className="text-[var(--text-secondary)] text-sm max-w-md mx-auto">
            EU AI Act Compliance &amp; Governance Platform — Eurobank Capital SpA reference build.
            Not a certified compliance tool; not legal advice.
          </p>
        </div>
        <LoginPanel users={users} />
      </div>
    </div>
  );
}
