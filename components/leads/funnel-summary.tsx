"use client";

import { LEAD_STATUSES, STATUS_META } from "@/lib/lead-status";
import type { Filtro } from "@/lib/lead-filter";
import type { StatsResponse } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FunnelSummary({
  stats,
  filtro,
  onChange,
}: {
  stats?: StatsResponse;
  filtro: Filtro;
  onChange: (f: Filtro) => void;
}) {
  if (!stats) {
    return <div className="mb-4 h-[68px] animate-pulse rounded-xl border bg-card" />;
  }

  function toggleStatus(s: (typeof LEAD_STATUSES)[number]) {
    const has = filtro.status.includes(s);
    onChange({
      ...filtro,
      status: has ? filtro.status.filter((x) => x !== s) : [...filtro.status, s],
    });
  }

  return (
    <div className="mb-4 rounded-xl border bg-card p-3">
      <div className="flex flex-wrap items-stretch gap-2">
        <Tile
          label="Total"
          valor={stats.total}
          active={false}
          onClick={() => onChange({ ...filtro, status: [] })}
        />
        <div className="w-px bg-border" />
        {LEAD_STATUSES.map((s) => (
          <Tile
            key={s}
            label={STATUS_META[s].label}
            valor={stats.status[s] ?? 0}
            dot={STATUS_META[s].dot}
            active={filtro.status.includes(s)}
            onClick={() => toggleStatus(s)}
          />
        ))}
        <div className="w-px bg-border" />
        <Tile
          label="Sem site"
          valor={stats.semSite}
          active={filtro.site === "sem"}
          onClick={() =>
            onChange({ ...filtro, site: filtro.site === "sem" ? "" : "sem" })
          }
        />
        <Tile
          label="Sem WhatsApp"
          valor={stats.semWhats}
          active={filtro.whatsapp === "sem"}
          onClick={() =>
            onChange({ ...filtro, whatsapp: filtro.whatsapp === "sem" ? "" : "sem" })
          }
        />
      </div>
    </div>
  );
}

function Tile({
  label,
  valor,
  active,
  onClick,
  dot,
}: {
  label: string;
  valor: number;
  active: boolean;
  onClick: () => void;
  dot?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-w-[76px] flex-col items-start rounded-lg border px-2.5 py-1.5 text-left transition-colors",
        active
          ? "border-primary bg-primary/5"
          : "border-transparent hover:border-border hover:bg-muted/60"
      )}
    >
      <span className="text-lg font-semibold tabular-nums leading-tight">{valor}</span>
      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
        {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />}
        {label}
      </span>
    </button>
  );
}
