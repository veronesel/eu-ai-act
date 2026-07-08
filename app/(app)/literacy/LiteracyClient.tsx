"use client";

import { useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/Glass";
import { Info, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList, ResponsiveContainer } from "recharts";

interface LiteracyRecord {
  id: string;
  department: string;
  role_code: string;
  training_name: string;
  completion_pct: number;
  updated_at: string;
}

const STATUS_COLORS = { good: "#10B981", warning: "#F59E0B", critical: "#F43F5E" };

function statusFor(pct: number): keyof typeof STATUS_COLORS {
  if (pct >= 90) return "good";
  if (pct >= 70) return "warning";
  return "critical";
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-[var(--panel-border)] bg-[var(--background)] px-3 py-2 text-xs shadow-lg">
      <div className="font-medium">{d.department}</div>
      <div className="text-[var(--text-secondary)]">{d.completion_pct}% complete</div>
    </div>
  );
}

export function LiteracyClient({ records, canWrite }: { records: LiteracyRecord[]; canWrite: boolean }) {
  const [rows, setRows] = useState(records);
  const today = useMemo(() => new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }), []);

  const chartData = rows.map((r) => ({ department: r.department, completion_pct: r.completion_pct }))
    .sort((a, b) => b.completion_pct - a.completion_pct);

  return (
    <div className="space-y-6">
      <GlassCard className="border-sky-500/30 bg-sky-500/5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-sky-300">As of {today} — Art. 4 is no longer a rigid pass/fail mandate</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              The Digital Omnibus reframed Art. 4 from a strict compliance checkbox into a duty on providers and deployers to <em>promote and encourage</em> AI literacy among staff and other people dealing with AI systems on their behalf, using measures proportionate to each person&apos;s technical knowledge, experience, and the context in which the system is used. Aegis still tracks completion by department below because a documented, proportionate programme is the clearest evidence that duty is being met — not because a single completion threshold is itself the statutory bar.
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-heading font-semibold text-sm">Completion by department</h3>
          <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
            <LegendDot color={STATUS_COLORS.good} label="≥90%" />
            <LegendDot color={STATUS_COLORS.warning} label="70-89%" />
            <LegendDot color={STATUS_COLORS.critical} label="<70%" />
          </div>
        </div>
        <div className="h-72 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 32, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--panel-border)" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={{ stroke: "var(--panel-border)" }} tickLine={false} />
              <YAxis type="category" dataKey="department" width={170} tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={{ stroke: "var(--panel-border)" }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="completion_pct" radius={[0, 4, 4, 0]} maxBarSize={18}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={STATUS_COLORS[statusFor(d.completion_pct)]} />
                ))}
                <LabelList dataKey="completion_pct" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: "var(--text-secondary)" }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard className="overflow-x-auto p-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--panel-border)]">
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Training</th>
              <th className="px-4 py-3 font-medium">Completion</th>
              <th className="px-4 py-3 font-medium">Updated</th>
              {canWrite && <th className="px-4 py-3 font-medium"></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <LiteracyRow key={r.id} record={r} canWrite={canWrite} onSaved={(pct) => setRows((prev) => prev.map((p) => (p.id === r.id ? { ...p, completion_pct: pct } : p)))} />
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function LiteracyRow({ record, canWrite, onSaved }: { record: LiteracyRecord; canWrite: boolean; onSaved: (pct: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(record.completion_pct);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/literacy/${record.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completion_pct: value }),
    });
    setSaving(false);
    if (res.ok) {
      onSaved(value);
      setEditing(false);
    }
  }

  return (
    <tr className="border-b border-[var(--panel-border)] last:border-0">
      <td className="px-4 py-3">{record.department}</td>
      <td className="px-4 py-3 text-[var(--text-secondary)]">{record.role_code.replace(/_/g, " ")}</td>
      <td className="px-4 py-3 text-[var(--text-secondary)]">{record.training_name}</td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-2">
            <input type="number" min={0} max={100} className="w-16 rounded-md bg-black/20 border border-[var(--panel-border)] px-2 py-1 text-xs" value={value} onChange={(e) => setValue(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))} />
            <button onClick={save} disabled={saving} className="text-[10px] rounded-md bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-2 py-1 disabled:opacity-50">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
            </button>
          </div>
        ) : (
          <span style={{ color: STATUS_COLORS[statusFor(record.completion_pct)] }} className="font-medium">{record.completion_pct}%</span>
        )}
      </td>
      <td className="px-4 py-3 text-[var(--text-muted)]">{new Date(record.updated_at).toLocaleDateString("en-GB")}</td>
      {canWrite && (
        <td className="px-4 py-3 text-right">
          {!editing && <button onClick={() => setEditing(true)} className="text-[10px] text-aegis-emerald hover:underline">edit</button>}
        </td>
      )}
    </tr>
  );
}
