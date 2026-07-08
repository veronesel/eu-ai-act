"use client";

import { createContext, useContext, useEffect, useState } from "react";

export interface RegulatoryBaseline {
  id: string;
  label: string;
  description: string;
  annex_iii_standalone_date: string;
  annex_i_embedded_date: string;
  art5_ncii_csam_date: string | null;
  art50_2_watermark_existing_date: string;
  sandboxes_date: string;
  art50_general_transparency_date: string;
  art51_55_gpai_date: string;
  is_default: number;
}

interface BaselineContextValue {
  baselines: RegulatoryBaseline[];
  activeId: string;
  active: RegulatoryBaseline;
  setActiveId: (id: string) => void;
}

const BaselineContext = createContext<BaselineContextValue | null>(null);

export function BaselineProvider({ children, baselines, initialId }: { children: React.ReactNode; baselines: RegulatoryBaseline[]; initialId: string }) {
  const [activeId, setActiveId] = useState(initialId);

  useEffect(() => {
    document.cookie = `aegis_baseline=${activeId}; path=/; max-age=31536000`;
  }, [activeId]);

  const active = baselines.find((b) => b.id === activeId) ?? baselines[0];

  return (
    <BaselineContext.Provider value={{ baselines, activeId, active, setActiveId }}>
      {children}
    </BaselineContext.Provider>
  );
}

export function useBaseline() {
  const ctx = useContext(BaselineContext);
  if (!ctx) throw new Error("useBaseline must be used within BaselineProvider");
  return ctx;
}
