/**
 * Metadados do funil — compartilhado entre client e server.
 * NÃO importa o Prisma aqui (isto roda no navegador). Os valores string
 * batem 1:1 com os enums em prisma/schema.prisma.
 */

export const LEAD_STATUSES = [
  "NOVO",
  "CONTATADO",
  "RESPONDEU",
  "NEGOCIANDO",
  "FECHADO",
  "PERDIDO",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

type StatusMeta = {
  label: string;
  ordem: number;
  /** Badge preenchido (fundo forte + texto). */
  badge: string;
  /** Barra lateral de 3px na linha/card. */
  bar: string;
  /** Pontinho colorido. */
  dot: string;
};

export const STATUS_META: Record<LeadStatus, StatusMeta> = {
  NOVO: {
    label: "Novo",
    ordem: 0,
    badge: "bg-slate-200 text-slate-700",
    bar: "bg-slate-300",
    dot: "bg-slate-400",
  },
  CONTATADO: {
    label: "Contatado",
    ordem: 1,
    badge: "bg-blue-600 text-white",
    bar: "bg-blue-500",
    dot: "bg-blue-500",
  },
  RESPONDEU: {
    label: "Respondeu",
    ordem: 2,
    badge: "bg-violet-600 text-white",
    bar: "bg-violet-500",
    dot: "bg-violet-500",
  },
  NEGOCIANDO: {
    label: "Negociando",
    ordem: 3,
    badge: "bg-amber-500 text-white",
    bar: "bg-amber-500",
    dot: "bg-amber-500",
  },
  FECHADO: {
    label: "Fechado",
    ordem: 4,
    badge: "bg-green-600 text-white",
    bar: "bg-green-600",
    dot: "bg-green-600",
  },
  PERDIDO: {
    label: "Perdido",
    ordem: 5,
    badge: "bg-rose-200 text-rose-700",
    bar: "bg-rose-300",
    dot: "bg-rose-400",
  },
};

export function statusLabel(s: string): string {
  return STATUS_META[s as LeadStatus]?.label ?? s;
}

export const CANAIS = ["WHATSAPP", "EMAIL", "TELEFONE", "OUTRO"] as const;
export type Canal = (typeof CANAIS)[number];

export const CANAL_META: Record<Canal, { label: string; icon: string }> = {
  WHATSAPP: { label: "WhatsApp", icon: "💬" },
  EMAIL: { label: "E-mail", icon: "✉️" },
  TELEFONE: { label: "Telefone", icon: "📞" },
  OUTRO: { label: "Outro", icon: "•" },
};

export const EMAIL_STATUSES = [
  "NAO_BUSCADO",
  "BUSCANDO",
  "ENCONTRADO",
  "NAO_ENCONTRADO",
] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];
