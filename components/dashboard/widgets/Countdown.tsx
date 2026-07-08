"use client";

import { useEffect, useState } from "react";
import { toneForDaysRemaining, TONE_TEXT, TONE_BORDER, TONE_BG } from "../tone";

function computeDays(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

/**
 * Live countdown to a deadline. Recomputes on an interval so it reads as "live"
 * without requiring a page refresh. Falls back to a static render if no deadline.
 */
export function Countdown({ deadline, size = "md" }: { deadline: string | null | undefined; size?: "sm" | "md" | "lg" }) {
  const [days, setDays] = useState<number | null>(() => computeDays(deadline));

  useEffect(() => {
    setDays(computeDays(deadline));
    const id = setInterval(() => setDays(computeDays(deadline)), 60_000);
    return () => clearInterval(id);
  }, [deadline]);

  if (days === null) {
    return <span className="text-xs text-[var(--text-muted)]">No deadline set</span>;
  }

  const tone = toneForDaysRemaining(days);
  const overdue = days < 0;
  const text = overdue ? `Overdue by ${Math.abs(days)}d` : days === 0 ? "Due today" : `${days}d remaining`;
  const sizeClass = size === "lg" ? "text-2xl" : size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold ${sizeClass} ${TONE_BORDER[tone]} ${TONE_BG[tone]} ${TONE_TEXT[tone]}`}>
      {text}
    </span>
  );
}
