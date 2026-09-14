"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { PAISES_EUROPA } from "@/data/paises-europa";
import { CIDADES_EUROPA } from "@/data/cidades-europa";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { iniciarBusca, iniciarBuscaTodasCategorias } from "@/lib/search-queue";
import { BuscaQueuePanel } from "@/components/leads/busca-queue-panel";
import { SUGESTOES_TIPO } from "@/data/sugestoes-tipo";

const QUANTIDADE_MAX = 500;

export function SearchDialogInternacional({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [pais, setPais] = useState("");
  const [cidade, setCidade] = useState("");
  const [cidadeManual, setCidadeManual] = useState(false);
  const [quantidade, setQuantidade] = useState(20);
  const [erro, setErro] = useState<string | null>(null);
  const [todasCategorias, setTodasCategorias] = useState(false);

  const cidadesDoPais = CIDADES_EUROPA[pais] || [];

  function trocarPais(novoPais: string) {
    setPais(novoPais);
    setCidade("");
    setCidadeManual(false);
  }

  function adicionarCategoria() {
    const v = tipo.trim();
    if (!v) return;
    setCategorias((prev) => (prev.some((c) => c.toLowerCase() === v.toLowerCase()) ? prev : [...prev, v]));
    setTipo("");
  }

  function removerCategoria(c: string) {
    setCategorias((prev) => prev.filter((x) => x !== c));
  }

  function handleTipoKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      adicionarCategoria();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pais) return setErro("Selecione o país.");
    if (!cidade.trim()) return setErro("Digite a cidade.");

    setErro(null);
    const params = {
      estado: "",
      cidade: cidade.trim(),
      quantidade,
      estadoInteiro: false,
      pais,
      escopo: "INTERNACIONAL" as const,
    };
    const local = `${cidade.trim()}, ${pais}`;

    if (todasCategorias) {
      iniciarBuscaTodasCategorias(SUGESTOES_TIPO, params, onDone, `Todas as categorias em ${local}`);
    } else {
      const pendente = tipo.trim();
      const todas = pendente && !categorias.some((c) => c.toLowerCase() === pendente.toLowerCase())
        ? [...categorias, pendente]
        : categorias;

      if (todas.length === 0) return setErro("Preencha ao menos um tipo de negócio.");

      if (todas.length === 1) {
        iniciarBusca(todas[0], params, onDone);
      } else {
        const label = todas.length <= 4 ? `${todas.join(", ")} em ${local}` : `${todas.length} categorias em ${local}`;
        iniciarBuscaTodasCategorias(todas, params, onDone, label);
      }
    }

    setOpen(false);
    setTipo("");
    setCategorias([]);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Search className="h-4 w-4" />
            Buscar leads
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buscar leads internacionais no OpenStreetMap</DialogTitle>
            <DialogDescription>
              Estabelecimentos fora do Brasil. Entram numa lista separada da nacional — nunca se
              misturam. Você pode fechar essa tela e abrir outra busca enquanto esta roda.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tipo-intl">Tipo de negócio</Label>
              <div className="flex gap-2">
                <Input
                  id="tipo-intl"
                  list="sugestoes-tipo-intl"
                  value={tipo}
                  disabled={todasCategorias}
                  onChange={(e) => setTipo(e.target.value)}
                  onKeyDown={handleTipoKeyDown}
                  placeholder="Ex: restaurante, hotel, advogado…"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={todasCategorias || !tipo.trim()}
                  onClick={adicionarCategoria}
                >
                  Adicionar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Dá pra buscar várias categorias de uma vez: digite uma, aperte Enter ou
                &quot;Adicionar&quot;, e repita.
              </p>
              <datalist id="sugestoes-tipo-intl">
                {SUGESTOES_TIPO.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              {categorias.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {categorias.map((c) => (
                    <span
                      key={c}
                      className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => removerCategoria(c)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label={`Remover ${c}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={todasCategorias}
                onCheckedChange={(v) => setTodasCategorias(v === true)}
                className="mt-0.5"
              />
              <span>
                Buscar todas as categorias
                <span className="block text-xs text-muted-foreground">
                  Passa por {SUGESTOES_TIPO.length} categorias conhecidas nessa cidade, uma de cada
                  vez. Pode levar vários minutos — dá pra parar no meio pelo card de progresso.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="pais">País</Label>
                <select
                  id="pais"
                  value={pais}
                  onChange={(e) => trocarPais(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">Selecione…</option>
                  {PAISES_EUROPA.map((p) => (
                    <option key={p.codigo} value={p.nome}>
                      {p.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cidade-intl">Cidade</Label>
                {cidadeManual || cidadesDoPais.length === 0 ? (
                  <Input
                    id="cidade-intl"
                    value={cidade}
                    disabled={!pais}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder={pais ? "Digite a cidade" : "Escolha o país"}
                  />
                ) : (
                  <select
                    id="cidade-intl"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <option value="">Selecione…</option>
                    {cidadesDoPais.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}
                {pais && (
                  <button
                    type="button"
                    onClick={() => setCidadeManual((v) => !v)}
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                  >
                    {cidadeManual ? "Escolher da lista" : "Não achei minha cidade, digitar"}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qtd-intl">Quantidade (até {QUANTIDADE_MAX})</Label>
              <Input
                id="qtd-intl"
                type="number"
                min={1}
                max={QUANTIDADE_MAX}
                value={quantidade}
                onChange={(e) =>
                  setQuantidade(Math.min(QUANTIDADE_MAX, Math.max(1, Number(e.target.value) || 1)))
                }
                className="w-28"
              />
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <Button type="submit" className="w-full gap-2">
              <Search className="h-4 w-4" />
              {todasCategorias
                ? "Buscar todas as categorias"
                : categorias.length > 0
                  ? `Buscar ${categorias.length + (tipo.trim() ? 1 : 0)} categorias`
                  : "Buscar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BuscaQueuePanel />
    </>
  );
}
