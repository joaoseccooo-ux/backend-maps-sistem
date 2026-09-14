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
  falhas?: string[];
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

async function buscarUmaCategoria(tipo: string, params: BuscaParams, loc?: unknown) {
  const res = await fetch("/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tipo, ...params, ...(loc ? { loc } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erro ao buscar "${tipo}".`);
  return data as { criados?: number; atualizados?: number };
}

/**
 * Geocodifica a cidade/estado uma vez só. Usado antes de rodar várias
 * categorias em sequência: sem isso, cada categoria bateria de novo na
 * Nominatim pra resolver a MESMA área, estourando o limite de 1 req/s dela
 * (era isso que fazia buscas de várias categorias voltarem cheias de erro).
 */
async function geocodarUmaVez(params: BuscaParams) {
  const res = await fetch("/api/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erro ao localizar a região.");
  return data.loc;
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

/**
 * Dispara uma varredura por várias categorias em sequência (uma de cada vez,
 * pra não sobrecarregar o Overpass) — usado tanto por "todas as categorias"
 * quanto por uma seleção manual de 2+ categorias. Roda em background.
 */
export function iniciarBuscaTodasCategorias(
  categorias: string[],
  params: BuscaParams,
  onDone: () => void,
  label: string
) {
  const id = crypto.randomUUID();
  const canceladoRef = { current: false };
  canceladas.set(id, canceladoRef);
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
      falhas: [],
    },
  ];
  emit();

  (async () => {
    let loc: unknown;
    try {
      loc = await geocodarUmaVez(params);
    } catch (err: any) {
      const erro = err?.message || "Erro ao localizar a região.";
      patch(id, { status: "erro", erro });
      toast.error(`${label}: ${erro}`);
      setTimeout(() => remover(id), 6000);
      return;
    }

    let totalCriados = 0;
    let totalAtualizados = 0;
    const falhas: string[] = [];
    for (let i = 0; i < categorias.length; i++) {
      if (canceladoRef.current) break;
      const categoria = categorias[i];
      patch(id, { atual: i + 1, categoriaAtual: categoria });
      try {
        const r = await buscarUmaCategoria(categoria, params, loc);
        totalCriados += r.criados || 0;
        totalAtualizados += r.atualizados || 0;
        patch(id, { criados: totalCriados, atualizados: totalAtualizados });
        onDone();
      } catch (err: any) {
        // uma categoria falhando não trava o loop inteiro — segue pra próxima,
        // mas a falha precisa aparecer no fim, senão "0 leads" parece busca
        // vazia quando na verdade deu erro (ex.: Nominatim/Overpass fora do ar).
        falhas.push(`${categoria}: ${err?.message || "erro na busca"}`);
        patch(id, { falhas: [...falhas] });
      }
    }
    const cancelado = canceladoRef.current;
    patch(id, { status: cancelado ? "cancelado" : "concluido" });
    const resumoCriados = `${totalCriados} ${totalCriados === 1 ? "lead novo" : "leads novos"}`;
    if (falhas.length > 0) {
      toast.error(
        `${label}: ${resumoCriados}, mas ${falhas.length} ${
          falhas.length === 1 ? "categoria falhou" : "categorias falharam"
        } — ${falhas.join("; ")}`
      );
    } else {
      toast[totalCriados > 0 ? "success" : "info"](
        cancelado
          ? `${label} (interrompida): ${resumoCriados}`
          : `${label}: ${resumoCriados}` +
              (totalAtualizados > 0 ? ` (${totalAtualizados} já estavam na lista)` : "")
      );
    }
    setTimeout(() => remover(id), falhas.length > 0 ? 12000 : 6000);
  })();

  return id;
}
