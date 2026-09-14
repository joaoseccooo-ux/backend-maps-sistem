"use client";

import { Search, X } from "lucide-react";
import { ESTADOS } from "@/data/estados";
import { LEAD_STATUSES, STATUS_META } from "@/lib/lead-status";
import { FILTRO_VAZIO, filtroAtivo, type Filtro } from "@/lib/lead-filter";
import type { StatsResponse } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LeadFilters({
  filtro,
  onChange,
  facetas,
  estadoLabel = "Estado",
  traduzirEstado = true,
}: {
  filtro: Filtro;
  onChange: (f: Filtro) => void;
  facetas?: StatsResponse["facetas"];
  /** Rótulo do filtro de "estado" — "País" na aba internacional. */
  estadoLabel?: string;
  /** Traduz sigla de UF pro nome completo — não faz sentido pra país (já vem por extenso). */
  traduzirEstado?: boolean;
}) {
  const set = (patch: Partial<Filtro>) => onChange({ ...filtro, ...patch });

  return (
    <div className="space-y-5 text-sm">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filtro.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder="Buscar por nome…"
          className="pl-8"
        />
      </div>

      <Grupo titulo="Etapa do funil">
        {LEAD_STATUSES.map((s) => (
          <label key={s} className="flex cursor-pointer items-center gap-2 py-0.5">
            <Checkbox
              checked={filtro.status.includes(s)}
              onCheckedChange={(v) =>
                set({
                  status: v
                    ? [...filtro.status, s]
                    : filtro.status.filter((x) => x !== s),
                })
              }
            />
            <span className={cn("h-2 w-2 rounded-full", STATUS_META[s].dot)} />
            {STATUS_META[s].label}
          </label>
        ))}
      </Grupo>

      <Grupo titulo="Site">
        <SegRadio
          value={filtro.site}
          onChange={(v) => set({ site: v as Filtro["site"] })}
          opcoes={[
            ["", "Todos"],
            ["sem", "Sem site"],
            ["com", "Com site"],
          ]}
        />
      </Grupo>

      <Grupo titulo="WhatsApp">
        <SegRadio
          value={filtro.whatsapp}
          onChange={(v) => set({ whatsapp: v as Filtro["whatsapp"] })}
          opcoes={[
            ["", "Todos"],
            ["com", "Com"],
            ["sem", "Sem"],
          ]}
        />
      </Grupo>

      <Grupo titulo="E-mail">
        <SegRadio
          value={filtro.email}
          onChange={(v) => set({ email: v as Filtro["email"] })}
          opcoes={[
            ["", "Todos"],
            ["com", "Com"],
            ["sem", "Sem"],
          ]}
        />
      </Grupo>

      {facetas && facetas.estados.length > 0 && (
        <Grupo titulo={estadoLabel}>
          <select
            value={filtro.estado}
            onChange={(e) => set({ estado: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todos</option>
            {facetas.estados.map((uf) => (
              <option key={uf} value={uf}>
                {traduzirEstado ? ESTADOS.find((e) => e.sigla === uf)?.nome ?? uf : uf}
              </option>
            ))}
          </select>
        </Grupo>
      )}

      {facetas && facetas.categorias.length > 0 && (
        <Grupo titulo="Categoria">
          <SelectNativo
            value={filtro.categoria}
            onChange={(v) => set({ categoria: v })}
            opcoes={facetas.categorias}
          />
        </Grupo>
      )}

      {facetas && facetas.cidades.length > 0 && (
        <Grupo titulo="Cidade">
          <SelectNativo
            value={filtro.cidade}
            onChange={(v) => set({ cidade: v })}
            opcoes={facetas.cidades}
          />
        </Grupo>
      )}

      <label className="flex cursor-pointer items-center gap-2">
        <Checkbox
          checked={filtro.favorito}
          onCheckedChange={(v) => set({ favorito: v === true })}
        />
        Só favoritos
      </label>

      {filtroAtivo(filtro) && (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={() => onChange({ ...FILTRO_VAZIO, semContato: filtro.semContato })}
        >
          <X className="h-3.5 w-3.5" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      {children}
    </div>
  );
}

function SegRadio({
  value,
  onChange,
  opcoes,
}: {
  value: string;
  onChange: (v: string) => void;
  opcoes: [string, string][];
}) {
  return (
    <div className="flex rounded-md border p-0.5">
      {opcoes.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
            value === v
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function SelectNativo({
  value,
  onChange,
  opcoes,
}: {
  value: string;
  onChange: (v: string) => void;
  opcoes: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <option value="">Todas</option>
      {opcoes.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
