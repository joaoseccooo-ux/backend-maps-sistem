import type { Canal, Escopo, LeadStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Linha crua vinda da busca do OpenStreetMap (app/api/search/route.ts). */
export type SearchRow = {
  osmId: string;
  nome: string;
  endereco: string;
  telefone: string;
  site: string;
  /** E-mail já vindo de tag do próprio OSM (email/contact:email) — pode vir vazio. */
  email: string;
  googleMapsUrl: string;
  lat: number | null;
  lon: number | null;
  cidade: string;
  rating: number | null;
  totalAvaliacoes: number | null;
  temSite: boolean;
  temWhatsApp: boolean;
};

type SearchMeta = { cidade: string; estado: string; categoria: string; escopo: Escopo };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Grava os resultados de uma busca. Cria os leads novos e atualiza só os
 * campos de dados (nome/telefone/site/...) dos que já existem — nunca mexe em
 * status, notas ou favorito. O e-mail é exceção parcial: se o OSM já trouxe
 * um e-mail e o lead (novo ou existente) ainda não tinha nenhum, preenche
 * (poupa uma busca de enriquecimento); se já tinha e-mail, não sobrescreve.
 */
export async function upsertLeadsFromSearch(rows: SearchRow[], meta: SearchMeta) {
  if (rows.length === 0) return { criados: 0, atualizados: 0 };

  const ids = rows.map((r) => r.osmId);
  const existentes = new Map(
    (
      await prisma.lead.findMany({
        where: { osmId: { in: ids } },
        select: { osmId: true, email: true },
      })
    ).map((l) => [l.osmId, l.email])
  );

  const novos = rows.filter((r) => !existentes.has(r.osmId));
  const atualizar = rows.filter((r) => existentes.has(r.osmId));

  if (novos.length > 0) {
    await prisma.lead.createMany({
      data: novos.map((r) => ({
        osmId: r.osmId,
        nome: r.nome,
        endereco: r.endereco,
        telefone: r.telefone,
        site: r.site,
        ...(r.email ? { email: r.email, emailStatus: "ENCONTRADO" as const } : {}),
        googleMapsUrl: r.googleMapsUrl,
        lat: r.lat,
        lon: r.lon,
        rating: r.rating,
        totalAvaliacoes: r.totalAvaliacoes,
        temSite: r.temSite,
        temWhatsApp: r.temWhatsApp,
        cidade: r.cidade || meta.cidade,
        estado: meta.estado,
        categoria: meta.categoria,
        escopo: meta.escopo,
      })),
      skipDuplicates: true,
    });
  }

  for (const grupo of chunk(atualizar, 50)) {
    await Promise.all(
      grupo.map((r) => {
        const jaTinhaEmail = Boolean(existentes.get(r.osmId));
        return prisma.lead.update({
          where: { osmId: r.osmId },
          data: {
            nome: r.nome,
            endereco: r.endereco,
            telefone: r.telefone,
            site: r.site,
            ...(r.email && !jaTinhaEmail ? { email: r.email, emailStatus: "ENCONTRADO" as const } : {}),
            googleMapsUrl: r.googleMapsUrl,
            lat: r.lat,
            lon: r.lon,
            rating: r.rating,
            totalAvaliacoes: r.totalAvaliacoes,
            temSite: r.temSite,
            temWhatsApp: r.temWhatsApp,
            ...(r.cidade ? { cidade: r.cidade } : {}),
          },
        });
      })
    );
  }

  return { criados: novos.length, atualizados: atualizar.length };
}

export type ListFilter = {
  status?: LeadStatus[];
  cidade?: string;
  estado?: string;
  categoria?: string;
  temSite?: boolean;
  temWhatsApp?: boolean;
  favorito?: boolean;
  q?: string;
  /** true = só leads sem telefone e sem e-mail (nenhum contato direto). */
  semContato?: boolean;
  cursor?: string;
  limit?: number;
  /** Nacional (Brasil) x internacional — as duas listas nunca se misturam. */
  escopo?: Escopo;
};

// Ter só site não conta como contato: sem telefone e sem e-mail, ainda falta
// achar o e-mail (via enriquecimento) ou o número — o site sozinho não abre
// WhatsApp nem manda mensagem.
/** Nenhum telefone nem e-mail: não há como abrir WhatsApp ou mandar e-mail direto. */
const SEM_CONTATO_WHERE: Prisma.LeadWhereInput = {
  telefone: "",
  OR: [{ email: null }, { email: "" }],
};

export async function listLeads(filtro: ListFilter) {
  const limit = Math.min(Math.max(filtro.limit ?? 50, 1), 200);

  const where: Prisma.LeadWhereInput = {};
  if (filtro.escopo) where.escopo = filtro.escopo;
  if (filtro.status && filtro.status.length > 0) where.status = { in: filtro.status };
  if (filtro.cidade) where.cidade = filtro.cidade;
  if (filtro.estado) where.estado = filtro.estado;
  if (filtro.categoria) where.categoria = filtro.categoria;
  if (typeof filtro.temSite === "boolean") where.temSite = filtro.temSite;
  if (typeof filtro.temWhatsApp === "boolean") where.temWhatsApp = filtro.temWhatsApp;
  if (typeof filtro.favorito === "boolean") where.favorito = filtro.favorito;
  if (filtro.q) where.nome = { contains: filtro.q, mode: "insensitive" };
  if (filtro.semContato) {
    Object.assign(where, SEM_CONTATO_WHERE);
  } else {
    where.NOT = SEM_CONTATO_WHERE;
  }

  const [total, rows] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(filtro.cursor ? { cursor: { id: filtro.cursor }, skip: 1 } : {}),
      include: {
        interactions: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { interactions: true } },
      },
    }),
  ]);

  const temMais = rows.length > limit;
  const leads = temMais ? rows.slice(0, limit) : rows;

  return {
    leads,
    total,
    nextCursor: temMais ? leads[leads.length - 1].id : null,
  };
}

export function getLead(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: { interactions: { orderBy: { createdAt: "desc" } } },
  });
}

export function updateLead(id: string, patch: Prisma.LeadUpdateInput) {
  return prisma.lead.update({ where: { id }, data: patch });
}

export function deleteLead(id: string) {
  return prisma.lead.delete({ where: { id } });
}

/** Registra um contato. Se o lead ainda está em NOVO, promove para CONTATADO. */
export async function addInteraction(leadId: string, canal: Canal, descricao: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { status: true, contatadoEm: true },
  });
  if (!lead) throw new Error("Lead não encontrado");

  const data: Prisma.LeadUpdateInput = {};
  if (lead.status === "NOVO") data.status = "CONTATADO";
  if (!lead.contatadoEm) data.contatadoEm = new Date();

  const [interaction] = await prisma.$transaction([
    prisma.interaction.create({ data: { leadId, canal, descricao } }),
    prisma.lead.update({ where: { id: leadId }, data }),
  ]);

  return interaction;
}

export async function leadStats(escopo: Escopo = "NACIONAL") {
  const [total, comSite, comWhats, semContato, porStatus] = await Promise.all([
    prisma.lead.count({ where: { escopo } }),
    prisma.lead.count({ where: { escopo, temSite: true } }),
    prisma.lead.count({ where: { escopo, temWhatsApp: true } }),
    prisma.lead.count({ where: { escopo, ...SEM_CONTATO_WHERE } }),
    prisma.lead.groupBy({ by: ["status"], where: { escopo }, _count: { _all: true } }),
  ]);

  const status = Object.fromEntries(
    porStatus.map((r) => [r.status, r._count._all])
  ) as Record<LeadStatus, number>;

  return {
    total,
    comSite,
    semSite: total - comSite,
    comWhats,
    semWhats: total - comWhats,
    semContato,
    status,
  };
}

/** Cidades que já têm lead salvo pra essa categoria+estado — usado pra pular
 * cidade repetida num "percorrer todas as cidades" (não adianta buscar de
 * novo onde já tem resultado). */
export async function cidadesComCategoria(
  estado: string,
  categoria: string,
  escopo: Escopo = "NACIONAL"
): Promise<string[]> {
  const rows = await prisma.lead.findMany({
    where: { estado, categoria, escopo, cidade: { not: "" } },
    distinct: ["cidade"],
    select: { cidade: true },
  });
  return rows.map((r) => r.cidade);
}

/** Cidades e categorias já presentes no banco, para popular os selects de filtro. */
export async function facetas(escopo: Escopo = "NACIONAL") {
  const [cidades, categorias, estados] = await Promise.all([
    prisma.lead.findMany({
      where: { escopo, cidade: { not: "" } },
      distinct: ["cidade"],
      select: { cidade: true },
      orderBy: { cidade: "asc" },
    }),
    prisma.lead.findMany({
      where: { escopo, categoria: { not: "" } },
      distinct: ["categoria"],
      select: { categoria: true },
      orderBy: { categoria: "asc" },
    }),
    prisma.lead.findMany({
      where: { escopo, estado: { not: "" } },
      distinct: ["estado"],
      select: { estado: true },
      orderBy: { estado: "asc" },
    }),
  ]);
  return {
    cidades: cidades.map((c) => c.cidade),
    categorias: categorias.map((c) => c.categoria),
    estados: estados.map((e) => e.estado),
  };
}
