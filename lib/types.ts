import type { Canal, EmailStatus, LeadStatus } from "@/lib/lead-status";

export type InteractionDTO = {
  id: string;
  canal: Canal;
  descricao: string;
  createdAt: string;
};

export type LeadDTO = {
  id: string;
  osmId: string;
  nome: string;
  endereco: string;
  telefone: string;
  site: string;
  googleMapsUrl: string;
  lat: number | null;
  lon: number | null;
  cidade: string;
  estado: string;
  categoria: string;
  escopo: "NACIONAL" | "INTERNACIONAL";
  rating: number | null;
  totalAvaliacoes: number | null;
  temSite: boolean;
  temWhatsApp: boolean;
  email: string | null;
  emailStatus: EmailStatus;
  status: LeadStatus;
  favorito: boolean;
  notas: string;
  contatadoEm: string | null;
  createdAt: string;
  updatedAt: string;
  interactions?: InteractionDTO[];
  _count?: { interactions: number };
};

export type LeadListResponse = {
  leads: LeadDTO[];
  total: number;
  nextCursor: string | null;
};

export type StatsResponse = {
  total: number;
  comSite: number;
  semSite: number;
  comWhats: number;
  semWhats: number;
  semContato: number;
  status: Partial<Record<LeadStatus, number>>;
  facetas: { cidades: string[]; categorias: string[]; estados: string[] };
};
