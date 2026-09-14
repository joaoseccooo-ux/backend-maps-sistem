"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import {
  Globe,
  MapPin,
  MessageCircle,
  Mail,
  Star,
  Trash2,
  Phone,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildEmailBody,
  buildEmailSubject,
  buildWhatsAppMessage,
} from "@/lib/message";
import { toWhatsAppLink } from "@/lib/phone";
import {
  CANAIS,
  CANAL_META,
  LEAD_STATUSES,
  STATUS_META,
  type Canal,
  type LeadStatus,
} from "@/lib/lead-status";
import { fetcher } from "@/lib/fetcher";
import { tempoRelativo } from "@/lib/tempo";
import type { LeadDTO } from "@/lib/types";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LeadDetailSheet({
  leadId,
  onClose,
  onChanged,
}: {
  leadId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data: settings } = useSWR<{ seuNome: string }>("/api/settings", fetcher);
  const key = leadId ? `/api/leads/${leadId}` : null;
  const { data: lead, mutate, isLoading } = useSWR<LeadDTO>(key, fetcher);

  const seuNome = settings?.seuNome ?? "";

  return (
    <Sheet open={!!leadId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {isLoading || !lead ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <LeadDetail
            lead={lead}
            seuNome={seuNome}
            onMutate={() => {
              mutate();
              onChanged();
            }}
            onClose={onClose}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function LeadDetail({
  lead,
  seuNome,
  onMutate,
  onClose,
}: {
  lead: LeadDTO;
  seuNome: string;
  onMutate: () => void;
  onClose: () => void;
}) {
  const [notas, setNotas] = useState(lead.notas);
  const [buscandoEmail, setBuscandoEmail] = useState(false);
  const notasTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => setNotas(lead.notas), [lead.id, lead.notas]);

  async function patch(body: Record<string, unknown>, msg?: string) {
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      onMutate();
      if (msg) toast.success(msg);
    } else {
      toast.error("Não foi possível salvar");
    }
  }

  async function registrarContato(canal: Canal, descricao: string) {
    await fetch(`/api/leads/${lead.id}/interactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canal, descricao }),
    });
    onMutate();
  }

  function abrirWhatsApp() {
    const msg = buildWhatsAppMessage(lead.nome, lead.temSite, seuNome);
    const link = toWhatsAppLink(lead.telefone, msg);
    if (!link) return;
    window.open(link, "_blank", "noopener");
    registrarContato("WHATSAPP", "Mensagem de WhatsApp aberta");
  }

  function abrirEmail() {
    if (!lead.email) return;
    const href = `mailto:${lead.email}?subject=${encodeURIComponent(
      buildEmailSubject(lead.nome)
    )}&body=${encodeURIComponent(buildEmailBody(lead.nome, lead.temSite, seuNome))}`;
    window.location.href = href;
    registrarContato("EMAIL", "E-mail aberto");
  }

  async function buscarEmail() {
    if (!lead.site) return;
    setBuscandoEmail(true);
    try {
      await fetch(
        `/api/enrich-email?leadId=${lead.id}&url=${encodeURIComponent(lead.site)}`
      );
      onMutate();
    } finally {
      setBuscandoEmail(false);
    }
  }

  function onNotasChange(v: string) {
    setNotas(v);
    clearTimeout(notasTimer.current);
    notasTimer.current = setTimeout(() => {
      fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notas: v }),
      }).then(() => onMutate());
    }, 700);
  }

  async function excluir() {
    if (!confirm(`Excluir "${lead.nome}" da lista?`)) return;
    await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    toast.success("Lead excluído");
    onClose();
    onMutate();
  }

  // WhatsApp assume DDI 55 (lib/phone.ts) — não confiável pra número
  // internacional, então nem oferece o botão nesse caso (foco em e-mail).
  const waLink = lead.escopo === "INTERNACIONAL" ? null : toWhatsAppLink(lead.telefone, "");

  return (
    <div className="flex flex-col gap-5 pb-4">
      <SheetHeader className="pr-8">
        <div className="flex items-start gap-2">
          <SheetTitle className="flex-1">{lead.nome}</SheetTitle>
          <button
            onClick={() => patch({ favorito: !lead.favorito })}
            className="mt-0.5 text-muted-foreground hover:text-amber-500"
            title="Favoritar"
          >
            <Star
              className={cn(
                "h-5 w-5",
                lead.favorito && "fill-amber-400 text-amber-400"
              )}
            />
          </button>
        </div>
        {lead.endereco && (
          <p className="text-sm text-muted-foreground">{lead.endereco}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 pt-1 text-sm">
          {lead.telefone && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {lead.telefone}
            </span>
          )}
          {lead.rating != null && (
            <span className="flex items-center gap-1 text-amber-600">
              <Star className="h-3.5 w-3.5 fill-amber-400" />
              {lead.rating}
            </span>
          )}
          {lead.site && (
            <a
              href={lead.site}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              <Globe className="h-3.5 w-3.5" />
              Site
            </a>
          )}
          {lead.googleMapsUrl && (
            <a
              href={lead.googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              <MapPin className="h-3.5 w-3.5" />
              Maps
            </a>
          )}
        </div>
      </SheetHeader>

      {/* Etapa do funil */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Etapa do funil
        </p>
        <div className="flex flex-wrap gap-1.5">
          {LEAD_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => patch({ status: s })}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                lead.status === s
                  ? STATUS_META[s].badge
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Ações */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="success"
          className="gap-2"
          disabled={!waLink}
          onClick={abrirWhatsApp}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </Button>
        {lead.email ? (
          <Button variant="secondary" className="gap-2" onClick={abrirEmail}>
            <Mail className="h-4 w-4" />
            E-mail
          </Button>
        ) : (
          <Button
            variant="outline"
            className="gap-2"
            disabled={!lead.site || buscandoEmail}
            onClick={buscarEmail}
          >
            {buscandoEmail ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {lead.emailStatus === "NAO_ENCONTRADO"
              ? "Sem e-mail"
              : "Buscar e-mail"}
          </Button>
        )}
      </div>
      {lead.email && (
        <p className="-mt-3 text-xs text-muted-foreground">
          E-mail encontrado: <span className="text-foreground">{lead.email}</span>
        </p>
      )}

      <Separator />

      {/* Notas */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Notas
        </p>
        <Textarea
          value={notas}
          onChange={(e) => onNotasChange(e.target.value)}
          placeholder="Anotações sobre esse lead…"
          className="min-h-[90px]"
        />
      </div>

      <Separator />

      {/* Histórico */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Histórico
          </p>
          <RegistrarContato onSubmit={registrarContato} />
        </div>
        {lead.interactions && lead.interactions.length > 0 ? (
          <ul className="space-y-2">
            {lead.interactions.map((it) => (
              <li key={it.id} className="flex gap-2 text-sm">
                <span>{CANAL_META[it.canal]?.icon ?? "•"}</span>
                <div>
                  <p>{it.descricao || CANAL_META[it.canal]?.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {tempoRelativo(it.createdAt)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum contato registrado.</p>
        )}
      </div>

      <Separator />

      <Button
        variant="ghost"
        size="sm"
        onClick={excluir}
        className="w-fit gap-2 text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        Excluir lead
      </Button>
    </div>
  );
}

function RegistrarContato({
  onSubmit,
}: {
  onSubmit: (canal: Canal, descricao: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [canal, setCanal] = useState<Canal>("TELEFONE");
  const [descricao, setDescricao] = useState("");

  if (!aberto) {
    return (
      <Button variant="outline" size="sm" onClick={() => setAberto(true)}>
        + Registrar contato
      </Button>
    );
  }

  return (
    <div className="w-full rounded-lg border p-2">
      <div className="mb-2 flex gap-1.5">
        {CANAIS.map((c) => (
          <button
            key={c}
            onClick={() => setCanal(c)}
            className={cn(
              "rounded px-2 py-1 text-xs",
              canal === c ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            {CANAL_META[c].label}
          </button>
        ))}
      </div>
      <Textarea
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
        placeholder="O que rolou nesse contato?"
        className="mb-2 min-h-[60px] text-sm"
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={() => setAberto(false)}>
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={() => {
            onSubmit(canal, descricao);
            setDescricao("");
            setAberto(false);
          }}
        >
          Salvar
        </Button>
      </div>
    </div>
  );
}
