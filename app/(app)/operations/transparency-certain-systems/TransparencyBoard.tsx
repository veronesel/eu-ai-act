"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { useBaseline } from "@/lib/context/BaselineProvider";
import { formatDate } from "@/lib/utils";
import { isArt50InScope, watermarkStatusAgainstBaseline } from "@/lib/domain/operations";
import { MessageSquareWarning, Fingerprint, ClipboardCheck, Loader2, ScanEye, PlusCircle } from "lucide-react";

interface Props {
  systems: any[];
  disclosures: any[];
  detBySystem: Record<string, any>;
}

export function TransparencyBoard({ systems, disclosures, detBySystem }: Props) {
  const router = useRouter();
  const { active } = useBaseline();
  const [localDisclosures, setLocalDisclosures] = useState<any[]>(disclosures);

  const aiInteraction = localDisclosures.filter((d) => d.disclosure_type === "ai_interaction");
  const watermarking = localDisclosures.filter((d) => d.disclosure_type === "watermarking");
  const systemById = Object.fromEntries(systems.map((s) => [s.id, s]));

  function upsertLocal(row: any) {
    setLocalDisclosures((prev) => {
      const exists = prev.some((d) => d.id === row.id);
      return exists ? prev.map((d) => (d.id === row.id ? row : d)) : [row, ...prev];
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex items-center gap-2 mb-1">
          <MessageSquareWarning className="h-4 w-4 text-aegis-emerald" />
          <h3 className="font-heading font-semibold">Art. 50(1) — AI-interaction disclosures</h3>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Every AI system intended to interact directly with natural persons must make clear, in a timely and accessible way, that the person is interacting with an AI
          system — unless it would be obvious to a reasonably well-informed person. Below is the disclosure record plus a simulated render of the customer-facing
          surface and a verification log entry.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {aiInteraction.length === 0 && <p className="text-sm text-[var(--text-muted)]">No AI-interaction disclosure records on file.</p>}
          {aiInteraction.map((d) => (
            <AiInteractionCard key={d.id} disclosure={d} system={systemById[d.system_id]} onSaved={upsertLocal} />
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-2 mb-1">
          <Fingerprint className="h-4 w-4 text-aegis-teal" />
          <h3 className="font-heading font-semibold">Art. 50(2) — Machine-readable watermarking of generative output</h3>
        </div>
        <p className="text-xs text-[var(--text-secondary)] mb-4">
          Providers of AI systems generating synthetic content must mark output as machine-generated. Status below is computed live against the{" "}
          <span className="text-[var(--text-primary)] font-medium">active regulatory baseline&apos;s</span> Art. 50(2) deadline for existing systems —{" "}
          <span className="text-[var(--text-primary)] font-medium">{formatDate(active.art50_2_watermark_existing_date)}</span> under{" "}
          <span className="italic">{active.label}</span>. Toggle the baseline in the header banner to see this move.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {watermarking.length === 0 && <p className="text-sm text-[var(--text-muted)]">No watermarking disclosure records on file.</p>}
          {watermarking.map((d) => (
            <WatermarkCard key={d.id} disclosure={d} system={systemById[d.system_id]} baselineDeadline={active.art50_2_watermark_existing_date} onSaved={upsertLocal} />
          ))}
        </div>
        <div className="mt-4 border-t border-[var(--panel-border)] pt-3">
          <p className="text-xs text-[var(--text-secondary)]">
            <span className="text-[var(--text-primary)] font-medium">Conceptual note — chatbot generative output.</span> The Customer Service Virtual Assistant
            (sys_chatbot) can also generate free-text conversational replies that are conceptually within scope of Art. 50(2). No separate watermarking disclosure
            row is tracked for it: the content is delivered inline inside the labelled AI-interaction chat surface (see the disclosure above), not as a downloadable
            or shareable generated artefact, so the AI-interaction notice is treated as the operative Art. 50 control for that surface rather than a duplicate
            watermarking record.
          </p>
        </div>
      </GlassCard>

      <ScanPanel systems={systems} disclosures={localDisclosures} onCreated={upsertLocal} />
    </div>
  );
}

function AiInteractionCard({ disclosure, system, onSaved }: { disclosure: any; system: any; onSaved: (row: any) => void }) {
  const [text, setText] = useState(disclosure.disclosure_text ?? "");
  const [log, setLog] = useState(disclosure.verification_log ?? "");
  const [saving, setSaving] = useState<string | null>(null);
  const isVideoKyc = system?.demo_seed_key === "sys_video_kyc";

  async function save(patch: any) {
    setSaving("save");
    const res = await fetch(`/api/operations/transparency/${disclosure.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(null);
    if (res.ok) onSaved(await res.json());
  }

  return (
    <div className="border border-[var(--panel-border)] rounded-lg p-3 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{system?.name ?? disclosure.system_id}</span>
        <Badge tone={toneForStatus(disclosure.status)}>{disclosure.status}</Badge>
      </div>

      {isVideoKyc && (
        <div className="rounded-md border border-sky-500/30 bg-sky-500/5 px-3 py-2 text-[11px] text-sky-200 leading-snug">
          <span className="font-semibold">Not the Art. 50(3) biometric-categorisation notice.</span> This system performs remote biometric{" "}
          <span className="italic">identification</span> (1:many watchlist matching), not categorisation or emotion recognition. The Art. 50(3) disclosure
          obligation attaches only to categorisation/emotion-recognition systems, so it does not apply here — this system instead carries the general Art. 50(1)
          AI-interaction notice below, covering the fact that an automated system is used during onboarding.
        </div>
      )}

      <div>
        <label className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Disclosure text</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-xs"
        />
        <button onClick={() => save({ disclosure_text: text })} disabled={!!saving} className="mt-1 text-[10px] text-aegis-emerald hover:underline">
          {saving ? "saving…" : "save text"}
        </button>
      </div>

      <div className="rounded-md border border-[var(--panel-border)] bg-black/30 p-3">
        <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)] mb-1 flex items-center gap-1">
          <ScanEye className="h-3 w-3" /> Simulated customer surface render
        </div>
        <div className="rounded-md bg-[var(--panel-bg,rgba(255,255,255,0.04))] border border-dashed border-[var(--panel-border)] px-3 py-2 text-xs italic text-[var(--text-secondary)]">
          {text || "— no disclosure text configured —"}
        </div>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Verification log</label>
        <textarea
          value={log}
          onChange={(e) => setLog(e.target.value)}
          rows={2}
          className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-xs"
        />
        <button onClick={() => save({ verification_log: log })} disabled={!!saving} className="mt-1 text-[10px] text-aegis-emerald hover:underline">
          {saving ? "saving…" : "save log"}
        </button>
      </div>

      <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--panel-border)]">
        {(["present", "stale", "missing"] as const).map((s) => (
          <button
            key={s}
            onClick={() => save({ status: s })}
            disabled={!!saving}
            className={`px-2 py-1 rounded-md text-[10px] font-medium border ${
              disclosure.status === s ? "bg-aegis-emerald/20 border-aegis-emerald/50 text-aegis-emerald" : "border-[var(--panel-border)] text-[var(--text-muted)] hover:bg-white/5"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function WatermarkCard({
  disclosure,
  system,
  baselineDeadline,
  onSaved,
}: {
  disclosure: any;
  system: any;
  baselineDeadline: string;
  onSaved: (row: any) => void;
}) {
  const [saving, setSaving] = useState<string | null>(null);
  const status = watermarkStatusAgainstBaseline(disclosure, baselineDeadline);

  async function setStatus(s: string) {
    setSaving(s);
    const res = await fetch(`/api/operations/transparency/${disclosure.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    setSaving(null);
    if (res.ok) onSaved(await res.json());
  }

  return (
    <div className="border border-[var(--panel-border)] rounded-lg p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium">{system?.name ?? disclosure.system_id}</span>
        <Badge tone={toneForStatus(disclosure.status)}>{disclosure.status}</Badge>
      </div>
      <p className="text-xs text-[var(--text-secondary)]">{disclosure.disclosure_text}</p>
      <Badge tone={status.tone} className="w-fit">
        {status.label}
      </Badge>
      <div className="flex items-center gap-1.5 pt-1 border-t border-[var(--panel-border)]">
        {(["present", "stale", "missing"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            disabled={!!saving}
            className={`px-2 py-1 rounded-md text-[10px] font-medium border ${
              disclosure.status === s ? "bg-aegis-teal/20 border-aegis-teal/50 text-aegis-teal" : "border-[var(--panel-border)] text-[var(--text-muted)] hover:bg-white/5"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ScanPanel({ systems, disclosures, onCreated }: { systems: any[]; disclosures: any[]; onCreated: (row: any) => void }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{ gaps: any[]; inScopeCount: number } | null>(null);
  const [creating, setCreating] = useState<string | null>(null);

  async function runScan() {
    setRunning(true);
    const res = await fetch("/api/operations/transparency/scan", { method: "POST" });
    setRunning(false);
    if (res.ok) setResult(await res.json());
  }

  async function createDisclosure(systemId: string, disclosureType: string) {
    setCreating(systemId);
    const res = await fetch("/api/operations/transparency/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system_id: systemId, disclosure_type: disclosureType }),
    });
    setCreating(null);
    if (res.ok) {
      onCreated(await res.json());
      setResult((prev) => (prev ? { ...prev, gaps: prev.gaps.filter((g) => g.system_id !== systemId) } : prev));
    }
  }

  return (
    <GlassCard>
      <div className="flex items-center gap-2 mb-1">
        <ClipboardCheck className="h-4 w-4 text-aegis-violet" />
        <h3 className="font-heading font-semibold">Transparency Compliance Scan</h3>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-4">
        A simple, deterministic, rule-based check — not an AI feature. It flags any system that looks in-scope of Art. 50 (GPAI-integrated, a biometric-related
        Annex III category, or a conversational/assistant surface) but has no transparency_disclosures row at all. The real AI-powered Transparency Compliance
        Scanning Agent lives separately under Agentic Layer → Agent Runs &amp; Proposals.
      </p>
      <button
        onClick={runScan}
        disabled={running}
        className="inline-flex items-center gap-2 rounded-xl border border-[var(--panel-border)] px-4 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
      >
        {running && <Loader2 className="h-4 w-4 animate-spin" />} Run Transparency Compliance Scan
      </button>

      {result && (
        <div className="mt-4 border-t border-[var(--panel-border)] pt-4">
          <p className="text-xs text-[var(--text-secondary)] mb-2">
            {result.inScopeCount} system(s) matched the in-scope rule. {result.gaps.length === 0 ? "All of them have a disclosure record on file — no gaps found." : `${result.gaps.length} gap(s) found:`}
          </p>
          <div className="space-y-2">
            {result.gaps.map((g) => (
              <div key={g.system_id} className="flex items-center justify-between gap-3 border border-amber-500/30 bg-amber-500/5 rounded-lg px-3 py-2">
                <div>
                  <span className="text-sm font-medium">{g.system_name}</span>
                  <p className="text-[11px] text-[var(--text-secondary)]">{g.reason}</p>
                </div>
                <button
                  onClick={() => createDisclosure(g.system_id, "ai_interaction")}
                  disabled={creating === g.system_id}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs rounded-md border border-amber-500/40 text-amber-300 px-2 py-1 hover:bg-amber-500/10 disabled:opacity-50"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Create disclosure record
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
