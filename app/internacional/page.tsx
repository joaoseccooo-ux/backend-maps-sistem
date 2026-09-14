"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { SlidersHorizontal } from "lucide-react";
import { fetcher } from "@/lib/fetcher";
import { cn } from "@/lib/utils";
import { FILTRO_VAZIO, filtroAtivo, filtroToQuery, type Filtro } from "@/lib/lead-filter";
import type { LeadListResponse, StatsResponse } from "@/lib/types";
import { SearchDialogInternacional } from "@/components/leads/search-dialog-internacional";
import { LeadFilters } from "@/components/leads/lead-filters";
import { FunnelSummary } from "@/components/leads/funnel-summary";
import { LeadTable } from "@/components/leads/lead-table";
import { LeadDetailSheet } from "@/components/leads/lead-detail-sheet";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Espelha app/page.tsx, mas pra leads internacionais — mesma UI, base
// separada (?escopo=INTERNACIONAL em toda chamada), nunca mistura com a
// lista nacional.
export default function Internacional() {
  const [filtro, setFiltro] = useState<Filtro>(FILTRO_VAZIO);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filtrosMobile, setFiltrosMobile] = useState(false);

  const { data: stats, mutate: mutateStats } = useSWR<StatsResponse>(
    "/api/stats?escopo=INTERNACIONAL",
    fetcher
  );

  const getKey = (index: number, prev: LeadListResponse | null) => {
    if (prev && !prev.nextCursor) return null;
    const cursor = index === 0 ? null : prev?.nextCursor;
    return `/api/leads?${filtroToQuery(filtro, cursor)}&escopo=INTERNACIONAL`;
  };

  const { data, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<LeadListResponse>(getKey, fetcher, {
      revalidateFirstPage: false,
      revalidateOnFocus: false,
    });

  const leads = useMemo(() => (data ? data.flatMap((d) => d.leads) : []), [data]);
  const total = data?.[0]?.total ?? 0;
  const hasMore = data ? !!data[data.length - 1]?.nextCursor : false;
  const loadingMore = isValidating && !!data && data.length < size;

  function refetch() {
    mutate();
    mutateStats();
  }

  const temFiltro = filtroAtivo(filtro);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Leads internacionais</h1>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "lead" : "leads"}
            {filtro.semContato
              ? " sem contato aparente"
              : temFiltro
                ? " no filtro atual"
                : " na sua lista"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Sheet open={filtrosMobile} onOpenChange={setFiltrosMobile}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 lg:hidden">
                <SlidersHorizontal className="h-4 w-4" />
                Filtros
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
              </SheetHeader>
              <LeadFilters
                filtro={filtro}
                onChange={setFiltro}
                facetas={stats?.facetas}
                estadoLabel="País"
                traduzirEstado={false}
              />
            </SheetContent>
          </Sheet>
          <SearchDialogInternacional onDone={refetch} />
        </div>
      </div>

      <div className="mb-4 flex w-fit gap-1 rounded-lg border bg-card p-1">
        <button
          type="button"
          onClick={() => setFiltro({ ...filtro, semContato: false })}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            !filtro.semContato
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Leads
        </button>
        <button
          type="button"
          onClick={() => setFiltro({ ...filtro, semContato: true })}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            filtro.semContato
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Sem contato
          {stats?.semContato ? ` (${stats.semContato})` : ""}
        </button>
      </div>

      <div className="flex gap-6">
        <aside className="hidden w-[260px] shrink-0 lg:block">
          <div className="sticky top-[76px]">
            <LeadFilters
              filtro={filtro}
              onChange={setFiltro}
              facetas={stats?.facetas}
              estadoLabel="País"
              traduzirEstado={false}
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <FunnelSummary stats={stats} filtro={filtro} onChange={setFiltro} />
          <LeadTable
            leads={leads}
            total={total}
            loading={isLoading && !data}
            hasMore={hasMore}
            loadingMore={loadingMore}
            onLoadMore={() => setSize(size + 1)}
            onSelect={setSelectedId}
            selectedId={selectedId}
            temFiltro={temFiltro}
            onContactado={refetch}
          />
        </div>
      </div>

      <LeadDetailSheet
        leadId={selectedId}
        onClose={() => setSelectedId(null)}
        onChanged={refetch}
      />
    </main>
  );
}
