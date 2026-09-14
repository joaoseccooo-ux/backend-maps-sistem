import { useSyncExternalStore } from "react";
import { toast } from "sonner";

// Fila de buscas em background. Vive fora de qualquer componente para que
// disparar uma busca não fique preso ao ciclo de vida do <SearchDialog>: o
// diálogo fecha na hora, e cada busca corre até o fim (ou até ser cancelada)
// como um job independente, permitindo várias em paralelo.

export type BuscaParams = {
  estado: string;
  cidade: string;
  quantidade: number;
  estadoInteiro: boolean;
};

export type BuscaJob = {
  id: string;
  label: string;
  atual: number;
  total: number;
  categoriaAtual: string;
  criados: number;
  atualizados: number;
  status: "rodando" | "concluido" | "erro" | "cancelado";
  erro?: string;
};

type Listener = () => void;

let jobs: BuscaJob[] = [];
const canceladas = new Map<string, { current: boolean }>();
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function patch(id: string, campos: Partial<BuscaJob>) {
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...campos } : j));
  emit();
}

function remover(id: string) {
  jobs = jobs.filter((j) => j.id !== id);
  canceladas.delete(id);
  emit();
}

/** Dispensa um card já concluído/com erro/cancelado — some da tela na hora. */
export function removerJob(id: string) {
  remover(id);
}

/** Sinaliza pro loop de "todas categorias" parar após a categoria atual. */
export function cancelarJob(id: string) {
  const ref = canceladas.get(id);
  if (ref) ref.current = true;
}

export function useBuscaJobs(): BuscaJob[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => jobs,
    () => jobs
  );
}

async function buscarUmaCategoria(tipo: string, params: BuscaParams) {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, ...params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ao buscar "${tipo}".`);
  return data as { criados?: number; atualizados?: number };
}

/** Dispara uma busca de uma categoria só. Não bloqueia — roda em background. */
export function iniciarBusca(tipo: string, params: BuscaParams, onDone: () => void) {
  const id = crypto.randomUUID();
  const label = `${tipo} em ${params.estadoInteiro ? params.estado : `${params.cidade}, ${params.estado}`}`;
  jobs = [
    ...jobs,
    { id, label, atual: 1, total: 1, categoriaAtual: tipo, criados: 0, atualizados: 0, status: "rodando" },
  ];
  emit();

  (async () => {
    try {
      const r = await buscarUmaCategoria(tipo, params);
      const criados = r.criados || 0;
      const atualizados = r.atualizados || 0;
      patch(id, { criados, atualizados, status: "concluido" });
      onDone();
      toast[criados > 0 ? "success" : "info"](
        criados > 0
          ? `${label}: ${criados} ${criados === 1 ? "lead novo" : "leads novos"}`
          : atualizados > 0
            ? `${label}: nenhum lead novo (${atualizados} já estavam na lista)`
            : `${label}: nenhum resultado encontrado`
      );
    } catch (err: any) {
      patch(id, { status: "erro", erro: err?.message || "Erro na busca." });
      toast.error(`${label}: ${err?.message || "erro na busca"}`);
    } finally {
      setTimeout(() => remover(id), 6000);
    }
  })();

  return id;
}

/** Dispara a varredura de todas as categorias. Também roda em background. */
export function iniciarBuscaTodasCategorias(
  categorias: string[],
  params: BuscaParams,
  onDone: () => void
) {
  const id = crypto.randomUUID();
  const canceladoRef = { current: false };
  canceladas.set(id, canceladoRef);
  const label = `Todas categorias em ${params.estadoInteiro ? params.estado : `${params.cidade}, ${params.estado}`}`;
  jobs = [
    ...jobs,
    {
      id,
      label,
      atual: 0,
      total: categorias.length,
      categoriaAtual: "",
      criados: 0,
      atualizados: 0,
      status: "rodando",
    },
  ];
  emit();

  (async () => {
    let totalCriados = 0;
    let totalAtualizados = 0;
    for (let i = 0; i < categorias.length; i++) {
      if (canceladoRef.current) break;
      const categoria = categorias[i];
      patch(id, { atual: i + 1, categoriaAtual: categoria });
      try {
        const r = await buscarUmaCategoria(categoria, params);
        totalCriados += r.criados || 0;
        totalAtualizados += r.atualizados || 0;
        patch(id, { criados: totalCriados, atualizados: totalAtualizados });
        onDone();
      } catch {
        // uma categoria falhando não trava o loop inteiro — segue pra próxima.
      }
    }
    const cancelado = canceladoRef.current;
    patch(id, { status: cancelado ? "cancelado" : "concluido" });
    toast[totalCriados > 0 ? "success" : "info"](
      cancelado
        ? `${label} (interrompida): ${totalCriados} ${totalCriados === 1 ? "lead novo" : "leads novos"}`
        : `${label}: ${totalCriados} ${totalCriados === 1 ? "lead novo" : "leads novos"}` +
            (totalAtualizados > 0 ? ` (${totalAtualizados} já estavam na lista)` : "")
    );
    setTimeout(() => remover(id), 6000);
  })();

  return id;
}
