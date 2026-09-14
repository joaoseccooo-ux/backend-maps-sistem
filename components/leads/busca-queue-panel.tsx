"use client";

import { Loader2, X } from "lucide-react";
import { cancelarJob, removerJob, useBuscaJobs } from "@/lib/search-queue";
import { Button } from "@/components/ui/button";

/**
 * Pilha de cards flutuantes, um por busca em andamento (ou recém-concluída).
 * Fica fora do <Dialog> de propósito: várias buscas podem rodar em paralelo,
 * cada uma independente da tela que a disparou.
 */
export function BuscaQueuePanel() {
  const jobs = useBuscaJobs();
  if (jobs.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex w-72 flex-col gap-2">
      {jobs.map((job) => (
        <div key={job.id} className="space-y-1.5 rounded-lg border bg-card p-3 text-sm shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5 truncate font-medium">
              {job.status === "rodando" && (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
              )}
              <span className="truncate">
                {job.total > 1 ? job.label : job.categoriaAtual || job.label}
              </span>
            </span>
            {job.total > 1 && (
              <span className="shrink-0 text-xs text-muted-foreground">
                {job.atual}/{job.total}
              </span>
            )}
          </div>

          {job.total > 1 && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(job.atual / job.total) * 100}%` }}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <p
              className="text-xs text-muted-foreground"
              title={job.falhas && job.falhas.length > 0 ? job.falhas.join("\n") : undefined}
            >
              {job.status === "erro"
                ? job.erro || "Erro na busca"
                : job.falhas && job.falhas.length > 0
                  ? `${job.criados} ${job.criados === 1 ? "lead novo" : "leads novos"} — ${
                      job.falhas.length
                    } ${job.falhas.length === 1 ? "categoria falhou" : "categorias falharam"}`
                  : job.status === "cancelado"
                    ? `Parada: ${job.criados} ${job.criados === 1 ? "lead novo" : "leads novos"}`
                    : job.status === "concluido"
                      ? `Concluída: ${job.criados} ${job.criados === 1 ? "lead novo" : "leads novos"}`
                      : `${job.criados} ${job.criados === 1 ? "lead novo" : "leads novos"} até agora`}
            </p>
            {job.status === "rodando" && job.total > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 shrink-0 px-2 text-xs text-destructive hover:text-destructive"
                onClick={() => cancelarJob(job.id)}
              >
                Parar
              </Button>
            )}
            {job.status !== "rodando" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 shrink-0 p-0 text-muted-foreground"
                onClick={() => removerJob(job.id)}
                aria-label="Dispensar"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
