"use client";

import { useMemo, useState } from "react";
import { GlassCard } from "@/components/ui/Glass";
import { AlertTriangle, Calculator } from "lucide-react";

interface Tier {
  key: string;
  label: string;
  article: string;
  flatFeeEUR: number;
  pctOfTurnover: number;
  description: string;
}

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function PenaltyCalculatorClient({ tiers, defaultTurnover }: { tiers: Tier[]; defaultTurnover: number }) {
  const [tierKey, setTierKey] = useState(tiers[1].key);
  const [turnoverBillions, setTurnoverBillions] = useState(defaultTurnover / 1_000_000_000);

  const tier = tiers.find((t) => t.key === tierKey) ?? tiers[0];
  const turnoverEUR = Math.max(0, turnoverBillions) * 1_000_000_000;

  const { pctAmount, flatAmount, higher, higherIsPct } = useMemo(() => {
    const pctAmount = turnoverEUR * (tier.pctOfTurnover / 100);
    const flatAmount = tier.flatFeeEUR;
    const higherIsPct = pctAmount >= flatAmount;
    return { pctAmount, flatAmount, higher: Math.max(pctAmount, flatAmount), higherIsPct };
  }, [turnoverEUR, tier]);

  return (
    <div className="space-y-6">
      <GlassCard className="border-amber-500/40 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-300 text-sm">Illustrative modelling only — not legal or supervisory guidance</p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              This reference and calculator exist to build intuition for how Art. 99 penalty tiers work. They do not predict, estimate, or represent any actual or threatened enforcement action against Eurobank Capital SpA, and must never be relied on as legal advice or as a substitute for supervisory dialogue with Banca d&apos;Italia.
            </p>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiers.map((t) => (
          <GlassCard key={t.key} className={t.key === tierKey ? "border-aegis-emerald/50" : ""}>
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{t.article}</div>
            <h3 className="font-heading font-semibold text-sm mt-1">{t.label}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-2">{t.description}</p>
            <div className="mt-3 text-sm">
              <span className="font-heading font-semibold text-aegis-emerald">{eur.format(t.flatFeeEUR)}</span>
              <span className="text-[var(--text-muted)]"> or </span>
              <span className="font-heading font-semibold text-aegis-emerald">{t.pctOfTurnover}%</span>
              <span className="text-[var(--text-muted)]"> of worldwide annual turnover — whichever is higher</span>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-4 w-4 text-aegis-teal" />
          <h3 className="font-heading font-semibold text-sm">Calculator</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-[var(--text-muted)]">Hypothetical finding type</label>
            <select className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm" value={tierKey} onChange={(e) => setTierKey(e.target.value)}>
              {tiers.map((t) => <option key={t.key} value={t.key}>{t.label} ({t.article})</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--text-muted)]">Eurobank worldwide annual turnover (€ billions)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              className="w-full mt-1 rounded-lg bg-black/20 border border-[var(--panel-border)] px-3 py-2 text-sm"
              value={turnoverBillions}
              onChange={(e) => setTurnoverBillions(parseFloat(e.target.value) || 0)}
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Defaults to a fictional €4.2bn figure seeded for this demo — not Eurobank Capital SpA&apos;s real financials.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          <div className={`rounded-xl border p-4 ${!higherIsPct ? "border-aegis-emerald/50 bg-aegis-emerald/5" : "border-[var(--panel-border)]"}`}>
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Fixed amount</div>
            <div className="text-xl font-heading font-semibold mt-1">{eur.format(flatAmount)}</div>
          </div>
          <div className={`rounded-xl border p-4 ${higherIsPct ? "border-aegis-emerald/50 bg-aegis-emerald/5" : "border-[var(--panel-border)]"}`}>
            <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{tier.pctOfTurnover}% of turnover</div>
            <div className="text-xl font-heading font-semibold mt-1">{eur.format(pctAmount)}</div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-aegis-emerald/40 bg-aegis-emerald/10 p-4">
          <div className="text-[10px] uppercase tracking-wide text-emerald-300">Applicable maximum (greater of the two, per Art. 99)</div>
          <div className="text-2xl font-heading font-semibold text-emerald-300 mt-1">{eur.format(higher)}</div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Driven by the {higherIsPct ? `${tier.pctOfTurnover}% turnover figure` : "fixed amount"} at this turnover level.
          </p>
        </div>
      </GlassCard>
    </div>
  );
}
