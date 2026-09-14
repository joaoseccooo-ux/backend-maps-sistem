"use client";

import useSWR from "swr";
import { MessageCircle, Globe, Mail, Phone, Star, Search } from "lucide-react";
import { STATUS_META } from "@/lib/lead-status";
import { tempoRelativo } from "@/lib/tempo";
import { fetcher } from "@/lib/fetcher";
import { buildEmailBody, buildEmailSubject, buildWhatsAppMessage } from "@/lib/message";
import { toWhatsAppLink } from "@/lib/phone";
import type { LeadDTO } from "@/lib/types";
import { StatusBadge } from "@/components/leads/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function registrarContato(leadId: string, canal: "WHATSAPP" | "EMAIL", descricao: string) {
  return fetch(`/api/leads/${leadId}/interactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ canal, descricao }),
  });
}

export function LeadTable({
  leads,
  total,
  loading,
  hasMore,
  onLoadMore,
  loadingMore,
  onSelect,
  selectedId,
  temFiltro,
  onContactado,
}: {
  leads: LeadDTO[];
  total: number;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
  onSelect: (id: string) => void;
  selectedId: string | null;
  temFiltro: boolean;
  onContactado: () => void;
}) {
  const { data: settings } = useSWR<{ seuNome: string }>("/api/settings", fetcher);
  const seuNome = settings?.seuNome ?? "";

  function handleWhatsApp(e: React.MouseEvent, lead: LeadDTO) {
    e.stopPropagation();
    const link = toWhatsAppLink(lead.telefone, buildWhatsAppMessage(lead.nome, lead.temSite, seuNome));
    if (!link) return;
    window.open(link, "_blank", "noopener");
    registrarContato(lead.id, "WHATSAPP", "Mensagem de WhatsApp aberta").then(onContactado);
  }

  function handleEmail(e: React.MouseEvent, lead: LeadDTO) {
    e.stopPropagation();
    if (!lead.email) return;
    const href = `mailto:${lead.email}?subject=${encodeURIComponent(
      buildEmailSubject(lead.nome)
    )}&body=${encodeURIComponent(buildEmailBody(lead.nome, lead.temSite, seuNome))}`;
    window.location.href = href;
    registrarContato(lead.id, "EMAIL", "E-mail aberto").then(onContactado);
  }
  if (loading) {
    return (
      <div className="space-y-2 rounded-xl border bg-card p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="grid place-items-center rounded-xl border bg-card py-16 text-center">
        <Search className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium">
          {temFiltro ? "Nenhum lead neste filtro" : "Nenhum lead ainda"}
        </p>
        <p className="text-sm text-muted-foreground">
          {temFiltro
            ? "Ajuste os filtros à esquerda."
            : 'Clique em "Buscar leads" para começar a prospecção.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[32%] pl-4">Nome</TableHead>
            <TableHead>Cidade</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead className="whitespace-nowrap">Telefone</TableHead>
            <TableHead className="text-center">Contato</TableHead>
            <TableHead>Etapa</TableHead>
            <TableHead className="whitespace-nowrap">Últ. ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => {
            const ultima = lead.interactions?.[0]?.createdAt ?? lead.contatadoEm;
            // WhatsApp assume DDI 55 — não confiável pra lead internacional.
            const waLink = lead.escopo === "INTERNACIONAL" ? null : toWhatsAppLink(lead.telefone, "");
            return (
              <TableRow
                key={lead.id}
                onClick={() => onSelect(lead.id)}
                data-state={selectedId === lead.id ? "selected" : undefined}
                className="relative cursor-pointer"
              >
                <TableCell className="pl-4">
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 w-[3px]",
                      STATUS_META[lead.status].bar
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{lead.nome}</span>
                    {lead.favorito && (
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    )}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                        lead.temSite
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-800"
                      )}
                    >
                      {lead.temSite ? "com site" : "sem site"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {lead.cidade || lead.estado || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {lead.categoria || "—"}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {lead.telefone ? (
                    <a
                      href={`tel:${lead.telefone.replace(/\D/g, "")}`}
                      onClick={(e) => e.stopPropagation()}
                      title="Ligar"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {lead.telefone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1 text-muted-foreground">
                    {waLink && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Abrir WhatsApp"
                        className="h-7 w-7 text-green-600 hover:bg-green-50 hover:text-green-700"
                        onClick={(e) => handleWhatsApp(e, lead)}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                    {lead.email && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Enviar e-mail"
                        className="h-7 w-7 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                        onClick={(e) => handleEmail(e, lead)}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                    {!lead.email && lead.site && (
                      <a
                        href={lead.site}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Abrir site"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
                      >
                        <Globe className="h-4 w-4" />
                      </a>
                    )}
                    {!waLink && !lead.email && !lead.site && "—"}
                  </div>
                </TableCell>
                <TableCell>
                  <StatusBadge status={lead.status} />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                  {tempoRelativo(ultima)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
        <span>
          {leads.length} de {total}
        </span>
        {hasMore && (
          <Button variant="ghost" size="sm" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "Carregando…" : "Carregar mais"}
          </Button>
        )}
      </div>
    </div>
  );
}
