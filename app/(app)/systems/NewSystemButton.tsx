"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";

export function NewSystemButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", business_function: "", provider_role_applies: false, deployer_role_applies: false });

  async function submit() {
    setSaving(true);
    const res = await fetch("/api/systems", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) {
      const { id } = await res.json();
      setOpen(false);
      router.push(`/systems/${id}`);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white text-sm font-medium px-4 py-2">
        <Plus className="h-4 w-4" /> New system
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="glass-panel w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-lg font-semibold">New AI system</h3>
          <button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--text-muted)]">Name</label>
            <input className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Description</label>
            <textarea className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Business function</label>
            <input className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={form.business_function} onChange={(e) => setForm({ ...form, business_function: e.target.value })} />
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.provider_role_applies} onChange={(e) => setForm({ ...form, provider_role_applies: e.target.checked })} /> Provider role applies</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.deployer_role_applies} onChange={(e) => setForm({ ...form, deployer_role_applies: e.target.checked })} /> Deployer role applies</label>
          </div>
        </div>
        <button onClick={submit} disabled={saving || !form.name || !form.description || !form.business_function} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white font-medium py-2.5 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create &amp; start screening
        </button>
      </div>
    </div>
  );
}
