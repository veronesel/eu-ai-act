"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/Glass";
import { Badge, toneForStatus } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { ChevronDown, ChevronRight, FileClock, History, Loader2, ShieldCheck } from "lucide-react";

export function TechDocClient({ system, sections, versionsBySection, users }: { system: any; sections: any[]; versionsBySection: Record<string, any[]>; users: any[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(sections[0]?.annex_iv_point ?? null);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const retainUntil = sections.find((s) => s.retain_until)?.retain_until;
  const approvedCount = sections.filter((s) => s.status === "approved").length;

  return (
    <div className="space-y-4">
      <GlassCard className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge tone={approvedCount === sections.length ? "success" : "warning"}>{approvedCount}/{sections.length} sections approved</Badge>
        </div>
        {retainUntil && (
          <div className="inline-flex items-center gap-2 rounded-full border border-aegis-indigo/40 bg-aegis-indigo/10 text-aegis-indigo px-3 py-1.5 text-xs font-medium">
            <FileClock className="h-3.5 w-3.5" />
            Art. 18 · 10-year retention · retain until {formatDate(retainUntil)}
          </div>
        )}
      </GlassCard>

      <div className="space-y-3">
        {sections.map((section) => (
          <SectionCard
            key={section.id}
            section={section}
            versions={versionsBySection[section.id] ?? []}
            userMap={userMap}
            expanded={expanded === section.annex_iv_point}
            onToggle={() => setExpanded(expanded === section.annex_iv_point ? null : section.annex_iv_point)}
            onChanged={() => router.refresh()}
          />
        ))}
      </div>
    </div>
  );
}

function SectionCard({ section, versions, userMap, expanded, onToggle, onChanged }: any) {
  const [content, setContent] = useState(section.content ?? "");
  const [saving, setSaving] = useState<"save" | "approve" | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const dirty = content !== (section.content ?? "");

  async function save(action: "save" | "approve") {
    setSaving(action);
    await fetch(`/api/provider/technical-documentation/${section.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, content }),
    });
    setSaving(null);
    onChanged();
  }

  return (
    <GlassCard>
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <div>
            <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">Annex IV point {section.annex_iv_point}</span>
            <h3 className="font-heading font-semibold text-sm">{section.title}</h3>
          </div>
        </div>
        <Badge tone={toneForStatus(section.status)}>{section.status.replace(/_/g, " ")}</Badge>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3">
          <textarea
            className="w-full rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm"
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => save("save")} disabled={!dirty || !!saving} className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-[var(--panel-border)] px-3 py-1.5 hover:bg-white/5 disabled:opacity-50">
              {saving === "save" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save draft
            </button>
            {section.status !== "approved" && (
              <button onClick={() => save("approve")} disabled={!!saving || dirty} title={dirty ? "Save your changes first" : "A human must explicitly approve — editing never auto-approves"} className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-gradient-to-r from-aegis-emerald to-aegis-teal text-white px-3 py-1.5 disabled:opacity-50">
                {saving === "approve" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} <ShieldCheck className="h-3.5 w-3.5" /> Approve (human sign-off)
              </button>
            )}
            <button onClick={() => setShowHistory((v) => !v)} className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--foreground)] ml-auto">
              <History className="h-3.5 w-3.5" /> v{section.version} · {versions.length} version{versions.length === 1 ? "" : "s"}
            </button>
          </div>
          {section.status === "agent_drafted_pending_review" && (
            <p className="text-[11px] text-amber-400">Agent-drafted content pending human review. Editing content keeps it in this status — approval is a separate, explicit action.</p>
          )}
          <p className="text-[10px] text-[var(--text-muted)]">Last updated {formatDate(section.updated_at)} by {userMap[section.updated_by] ?? section.updated_by ?? "—"}</p>

          {showHistory && (
            <div className="border-t border-[var(--panel-border)] pt-2 space-y-1.5">
              {versions.map((v: any) => (
                <div key={v.id} className="text-[11px] text-[var(--text-secondary)] flex justify-between">
                  <span>v{v.version} · {v.status.replace(/_/g, " ")} · {userMap[v.saved_by] ?? v.saved_by ?? "—"}</span>
                  <span className="text-[var(--text-muted)]">{formatDate(v.saved_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
