import type { LeadStatus } from "@/lib/lead-status";

export type Filtro = {
  status: LeadStatus[];
  cidade: string;
  categoria: string;
  estado: string;
  site: "" | "com" | "sem";
  whatsapp: "" | "com" | "sem";
  favorito: boolean;
  q: string;
  /** Aba "Sem contato": mostra só leads sem telefone e sem e-mail (site sozinho não conta). */
  semContato: boolean;
};

export const FILTRO_VAZIO: Filtro = {
  status: [],
  cidade: "",
  categoria: "",
  estado: "",
  site: "",
  whatsapp: "",
  favorito: false,
  q: "",
  semContato: false,
};

export function filtroToQuery(f: Filtro, cursor?: string | null): string {
  const p = new URLSearchParams();
  if (f.status.length) p.set("status", f.status.join(","));
  if (f.cidade) p.set("cidade", f.cidade);
  if (f.categoria) p.set("categoria", f.categoria);
  if (f.estado) p.set("estado", f.estado);
  if (f.site) p.set("site", f.site);
  if (f.whatsapp) p.set("whatsapp", f.whatsapp);
  if (f.favorito) p.set("favorito", "1");
  if (f.q) p.set("q", f.q);
  if (f.semContato) p.set("semContato", "1");
  if (cursor) p.set("cursor", cursor);
  return p.toString();
}

export function filtroAtivo(f: Filtro): boolean {
  return (
    f.status.length > 0 ||
    !!f.cidade ||
    !!f.categoria ||
    !!f.estado ||
    !!f.site ||
    !!f.whatsapp ||
    f.favorito ||
    !!f.q
  );
}
