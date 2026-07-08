"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { IncidentCountdown } from "@/components/records/IncidentCountdown";
import { SEVERITY_TIER_LABELS, nextIncidentStatus } from "@/lib/domain/operations";
import { formatDate } from "@/lib/utils";
import { AlertTriangle, Loader2, PlusCircle, ChevronRight } from "lucide-react";

export function IncidentsBoard({ incidents, systemById, eligibleSystems }: { incidents: any[]; systemById: Record<string, any>; eligibleSystems: any[] }) {
  const router = useRouter();
  const [showIntake, setShowIntake] = useState(false);

  const open = incidents.filter((i) => i.status !== "reported" && i.status !== "closed");
  const closedOut = incidents.filter((i) => i.status === "reported" || i.status === "closed");

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400" />
            <h3 className="font-heading font-semibold">Report a new serious incident</h3>
          </div>
          <button onClick={() => setShowIntake((v) => !v)} className="inline-flex items-center gap-1.5 text-xs rounded-md border border-rose-500/40 text-rose-300 px-2 py-1 hover:bg-rose-500/10">
            <PlusCircle className="h-3.5 w-3.5" /> {showIntake ? "close" : "new incident"}
          </button>
        </div>
        {showIntake && (
          <IntakeForm
            systems={eligibleSystems}
            onCreated={() => {
              setShowIntake(false);
              router.refresh();
            }}
          />
        )}
      </GlassCard>

      <div>
        <h3 className="font-heading font-semibold mb-2 text-sm text-[var(--text-secondary)]">Open incidents ({open.length})</h3>
        <div className="space-y-3">
          {open.length === 0 && (
            <GlassCard>
              <p className="text-sm text-[var(--text-muted)]">No open serious incidents.</p>
            </GlassCard>
          )}
          {open.map((inc) => (
            <IncidentCard key={inc.id} incident={inc} system={systemById[inc.system_id]} onChanged={() => router.refresh()} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-heading font-semibold mb-2 text-sm text-[var(--text-secondary)]">Reported / closed ({closedOut.length})</h3>
        <div className="space-y-3">
          {closedOut.map((inc) => (
            <IncidentCard key={inc.id} incident={inc} system={systemById[inc.system_id]} onChanged={() => router.refresh()} />
          ))}
        </div>
      </div>
    </div>
  );
}

function IntakeForm({ systems, onCreated }: { systems: any[]; onCreated: () => void }) {
  const [systemId, setSystemId] = useState(systems[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [detectedAt, setDetectedAt] = useState(new Date().toISOString().slice(0, 10));
  const [severityTier, setSeverityTier] = useState<string>("other_serious");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!systemId || !description.trim()) {
      setError("Select a system and enter a description.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/operations/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_id: systemId,
        description,
        incident_detected_at: new Date(detectedAt).toISOString(),
        severity_tier: severityTier,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setDescription("");
      onCreated();
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to create incident.");
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs text-[var(--text-secondary)]">
        The reporting deadline is computed automatically from the detection date and severity tier — it is never entered manually.
      </p>
      <div>
        <label className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">System</label>
        <select value={systemId} onChange={(e) => setSystemId(e.target.value)} className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm">
          {systems.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {systems.length === 0 && <p className="text-[10px] text-amber-400 mt-1">No deployer-role high-risk systems available.</p>}
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Incident detected on</label>
          <input type="date" value={detectedAt} onChange={(e) => setDetectedAt(e.target.value)} className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Severity tier</label>
          <select value={severityTier} onChange={(e) => setSeverityTier(e.target.value)} className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm">
            {Object.entries(SEVERITY_TIER_LABELS).map(([code, label]) => (
              <option key={code} value={code}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-sm font-medium px-4 py-2 disabled:opacity-50">
        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Log serious incident
      </button>
    </div>
  );
}

function IncidentCard({ incident, system, onChanged }: { incident: any; system: any; onChanged: () => void }) {
  const [reportText, setReportText] = useState(incident.report_text ?? "");
  const [saving, setSaving] = useState<string | null>(null);
  const next = nextIncidentStatus(incident.status);

  async function patch(body: any, key: string) {
    setSaving(key);
    await fetch(`/api/operations/incidents/${incident.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(null);
    onChanged();
  }

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{system?.name ?? incident.system_id}</span>
            <Badge tone={toneForStatus(incident.status)}>{incident.status.replace(/_/g, " ")}</Badge>
            {incident.severity_tier && <Badge tone="neutral">{SEVERITY_TIER_LABELS[incident.severity_tier]?.split(" (")[0] ?? incident.severity_tier}</Badge>}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1.5">{incident.description}</p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Detected {formatDate(incident.incident_detected_at)} · deadline {formatDate(incident.deadline_at)}
            {incident.reported_at && <> · reported {formatDate(incident.reported_at)}</>}
          </p>
        </div>
        <IncidentCountdown incident={incident} />
      </div>

      {incident.status === "reporting_drafted" && (
        <div className="mt-3">
          <label className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Draft report text</label>
          <textarea value={reportText} onChange={(e) => setReportText(e.target.value)} rows={3} className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-xs" />
          <button onClick={() => patch({ report_text: reportText }, "text")} disabled={!!saving} className="mt-1 text-[10px] text-aegis-emerald hover:underline">
            {saving === "text" ? "saving…" : "save draft text"}
          </button>
        </div>
      )}
      {incident.report_text && incident.status !== "reporting_drafted" && (
        <p className="mt-3 text-xs text-[var(--text-secondary)] bg-black/20 rounded p-2">{incident.report_text}</p>
      )}

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {incident.status !== "closed" && (
          <>
            <Badge tone={incident.authority_notified ? "success" : "neutral"}>authority notified: {incident.authority_notified ? "yes" : "no"}</Badge>
            <Badge tone={incident.provider_notified ? "success" : "neutral"}>provider notified: {incident.provider_notified ? "yes" : "no"}</Badge>
          </>
        )}
        {next && (
          <button
            onClick={() => {
              const body: any = { status: next };
              if (next === "reporting_drafted" && !incident.report_text) body.report_text = `Draft notification prepared for Banca d'Italia per Art. 73 (${SEVERITY_TIER_LABELS[incident.severity_tier] ?? incident.severity_tier}).`;
              if (next === "reported") {
                body.authority_notified = 1;
                body.provider_notified = 1;
              }
              patch(body, "advance");
            }}
            disabled={!!saving}
            className="ml-auto inline-flex items-center gap-1 text-xs rounded-md border border-aegis-emerald/40 text-aegis-emerald px-2 py-1 hover:bg-aegis-emerald/10 disabled:opacity-50"
          >
            {saving === "advance" && <Loader2 className="h-3 w-3 animate-spin" />} advance to &quot;{next.replace(/_/g, " ")}&quot; <ChevronRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </GlassCard>
  );
}
