"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetcher } from "@/lib/fetcher";
import { toast } from "sonner";

export function AppHeader() {
  const { data, mutate } = useSWR<{ seuNome: string }>("/api/settings", fetcher);
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState("");

  useEffect(() => {
    if (open) setValor(data?.seuNome ?? "");
  }, [open, data?.seuNome]);

  async function salvar() {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seuNome: valor }),
    });
    if (res.ok) {
      const novo = await res.json();
      mutate(novo, false);
      setOpen(false);
      toast.success("Assinatura salva");
    } else {
      toast.error("Não foi possível salvar");
    }
  }

  const nome = data?.seuNome?.trim();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-4">
        <div className="flex items-center gap-2 font-semibold">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-xs text-primary-foreground">
            BL
          </span>
          Buscador de Leads
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <UserRound className="h-4 w-4" />
              {nome ? nome : "Definir assinatura"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sua assinatura</DialogTitle>
              <DialogDescription>
                Nome ou empresa que assina as mensagens de WhatsApp e e-mail.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="seuNome">Nome / empresa</Label>
              <Input
                id="seuNome"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="Ex: João Secco — Criação de Sites"
                onKeyDown={(e) => e.key === "Enter" && salvar()}
              />
            </div>
            <DialogFooter>
              <Button onClick={salvar}>Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}
