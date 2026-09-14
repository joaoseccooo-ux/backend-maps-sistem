"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ESTADOS } from "@/data/estados";
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

const SUGESTOES_TIPO = [
  "Restaurante", "Pizzaria", "Lanchonete", "Hamburgueria", "Pastelaria", "Marmitaria",
  "Padaria", "Confeitaria", "Sorveteria", "Cafeteria", "Bar", "Mercado", "Hortifruti",
  "Açougue", "Petshop", "Clínica veterinária", "Agropecuária", "Salão de beleza",
  "Barbearia", "Estética", "Design de sobrancelhas", "Depilação", "Estúdio de tatuagem",
  "Academia", "Estúdio de pilates", "Escola de dança", "Farmácia", "Dentista", "Clínica",
  "Fisioterapia", "Psicólogo", "Nutricionista", "Ótica", "Oficina mecânica", "Auto elétrica",
  "Funilaria", "Oficina de motos", "Borracharia", "Lava rápido", "Estética automotiva",
  "Loja de autopeças", "Advogado", "Contador", "Imobiliária", "Corretor de seguros",
  "Arquiteto", "Consultoria", "Agência de marketing digital", "Loja de roupas", "Loja infantil",
  "Lingerie", "Brechó", "Loja de calçados", "Sapataria", "Joalheria", "Relojoaria",
  "Loja de bijuterias", "Loja de móveis", "Loja de colchões", "Loja de decoração",
  "Loja de celular", "Assistência técnica", "Loja de informática", "Loja de games",
  "Loja de instrumentos musicais", "Papelaria", "Livraria", "Loja de festas", "Floricultura",
  "Loja de material de construção", "Loja de tintas", "Marmoraria", "Vidraçaria",
  "Serralheria", "Marcenaria", "Gráfica", "Comunicação visual", "Estúdio de fotografia",
  "Construtora", "Ar condicionado", "Desentupidora", "Dedetizadora", "Empresa de limpeza",
  "Chaveiro", "Lavanderia", "Hotel", "Pousada", "Espaço de eventos", "Buffet infantil",
  "Escola de idiomas", "Cursinho", "Autoescola",
];

export function SearchDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [cidades, setCidades] = useState<string[]>([]);
  const [cidadeManual, setCidadeManual] = useState(false);
  const [estadoInteiro, setEstadoInteiro] = useState(false);
  const [quantidade, setQuantidade] = useState(20);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [todasCategorias, setTodasCategorias] = useState(false);
  const [progresso, setProgresso] = useState<{
    atual: number;
    total: number;
    categoria: string;
    criados: number;
  } | null>(null);
  const canceladoRef = useRef(false);

  useEffect(() => {
    if (!estado) {
      setCidades([]);
      setCidadeManual(false);
      return;
    }
    setCidade("");
    let cancel = false;
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Array<{ nome: string }>) => {
        if (cancel) return;
        setCidades(data.map((m) => m.nome).sort((a, b) => a.localeCompare(b, "pt-BR")));
        setCidadeManual(false);
      })
      .catch(() => {
        if (!cancel) {
          setCidades([]);
          setCidadeManual(true);
        }
      });
    return () => {
      cancel = true;
    };
  }, [estado]);

  async function buscarUmaCategoria(tipoCategoria: string) {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo: tipoCategoria, estado, cidade, quantidade, estadoInteiro }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Erro ao buscar "${tipoCategoria}".`);
    return data as { criados?: number; atualizados?: number };
  }

  // Cada categoria é uma chamada separada a /api/search — feita uma de cada vez
  // (nunca em paralelo, pra não sobrecarregar os servidores do Overpass) e
  // sequencialmente no navegador, não numa única função de servidor: assim
  // cada chamada fica dentro do próprio limite de tempo da rota em vez de uma
  // busca gigante estourar o timeout da function.
  async function handleBuscarTodas() {
    if (!estado) return setErro("Selecione o estado.");
    if (!estadoInteiro && !cidade.trim())
      return setErro('Escolha a cidade ou marque "estado inteiro".');
    setErro(null);
    setLoading(true);
    canceladoRef.current = false;
    // Roda em segundo plano: fecha o diálogo e libera a tela. O indicador
    // flutuante (fora do <Dialog>) continua mostrando o progresso.
    setOpen(false);
    toast.info("Buscando todas as categorias em segundo plano", {
      description:
        "Pode continuar usando o app normalmente — o indicador no canto da tela mostra o progresso.",
      duration: 6000,
    });

    const categorias = SUGESTOES_TIPO;
    let totalCriados = 0;
    let totalAtualizados = 0;

    for (let i = 0; i < categorias.length; i++) {
      if (canceladoRef.current) break;
      const categoria = categorias[i];
      setProgresso({ atual: i + 1, total: categorias.length, categoria, criados: totalCriados });
      try {
        const r = await buscarUmaCategoria(categoria);
        totalCriados += r.criados || 0;
        totalAtualizados += r.atualizados || 0;
        onDone();
      } catch {
        // uma categoria falhando (ex.: Overpass fora do ar num instante) não
        // deve travar o loop inteiro — segue pra próxima.
      }
    }

    const interrompido = canceladoRef.current;
    setProgresso(null);
    setLoading(false);
    toast[totalCriados > 0 ? "success" : "info"](
      interrompido
        ? `Busca interrompida: ${totalCriados} ${totalCriados === 1 ? "lead novo" : "leads novos"}.`
        : `Todas as categorias buscadas: ${totalCriados} ${totalCriados === 1 ? "lead novo" : "leads novos"}` +
            (totalAtualizados > 0 ? ` (${totalAtualizados} já estavam na lista).` : ".")
    );
    if (!interrompido) setOpen(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (todasCategorias) return handleBuscarTodas();

    if (!tipo.trim() || !estado) return setErro("Preencha o tipo de negócio e o estado.");
    if (!estadoInteiro && !cidade.trim())
      return setErro('Escolha a cidade ou marque "estado inteiro".');
    setErro(null);
    setLoading(true);
    const t = toast.loading(
      estadoInteiro ? "Varrendo o estado inteiro (pode levar minutos)…" : "Buscando…"
    );
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, estado, cidade, quantidade, estadoInteiro }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na busca.");
      toast.dismiss(t);
      const { criados = 0, atualizados = 0, truncado } = data;
      if (criados === 0) {
        toast.info(
          atualizados > 0
            ? `Nenhum lead novo (${atualizados} já estavam na lista).`
            : "Nenhum resultado encontrado."
        );
      } else {
        toast.success(
          `${criados} ${criados === 1 ? "lead novo" : "leads novos"}` +
            (truncado ? " (resultado grande, pode não ser exaustivo)" : "")
        );
      }
      onDone();
      setOpen(false);
    } catch (err: any) {
      toast.dismiss(t);
      setErro(err?.message || "Erro na busca.");
    } finally {
      setLoading(false);
    }
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
          <DialogTitle>Buscar leads no OpenStreetMap</DialogTitle>
          <DialogDescription>
            Os resultados entram na sua lista. Buscar de novo não apaga o que já existe.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="tipo">Tipo de negócio</Label>
            <Input
              id="tipo"
              list="sugestoes-tipo"
              value={tipo}
              disabled={todasCategorias}
              onChange={(e) => setTipo(e.target.value)}
              placeholder="Ex: restaurante, petshop, marmoraria…"
            />
            <datalist id="sugestoes-tipo">
              {SUGESTOES_TIPO.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={todasCategorias}
              disabled={loading}
              onCheckedChange={(v) => setTodasCategorias(v === true)}
              className="mt-0.5"
            />
            <span>
              Buscar todas as categorias
              <span className="block text-xs text-muted-foreground">
                Passa por {SUGESTOES_TIPO.length} categorias conhecidas
                {estadoInteiro ? " no estado inteiro" : " nessa cidade"}, uma de cada vez. Pode
                levar {estadoInteiro ? "bastante tempo (até horas)" : "vários minutos"} — dá pra
                parar no meio.
              </span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="estado">Estado</Label>
              <select
                id="estado"
                value={estado}
                disabled={loading}
                onChange={(e) => setEstado(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="">Selecione…</option>
                {ESTADOS.map((uf) => (
                  <option key={uf.sigla} value={uf.sigla}>
                    {uf.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cidade">Cidade</Label>
              {cidadeManual || cidades.length === 0 ? (
                <Input
                  id="cidade"
                  value={cidade}
                  disabled={!estado || estadoInteiro || loading}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder={estado ? "Digite a cidade" : "Escolha o estado"}
                />
              ) : (
                <select
                  id="cidade"
                  value={cidade}
                  disabled={estadoInteiro || loading}
                  onChange={(e) => setCidade(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  <option value="">Selecione…</option>
                  {cidades.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={estadoInteiro}
              disabled={loading}
              onCheckedChange={(v) => setEstadoInteiro(v === true)}
              className="mt-0.5"
            />
            <span>
              Buscar no estado inteiro (ignora a cidade)
              <span className="block text-xs text-muted-foreground">
                Só categorias conhecidas.{" "}
                {todasCategorias
                  ? "Junto com \"todas as categorias\", cada uma varre o estado inteiro — pode demorar bastante."
                  : "Pode levar até ~2 minutos."}
              </span>
            </span>
          </label>

          {!estadoInteiro && (
            <div className="space-y-1.5">
              <Label htmlFor="qtd">Quantidade (até 40)</Label>
              <Input
                id="qtd"
                type="number"
                min={1}
                max={40}
                value={quantidade}
                disabled={loading}
                onChange={(e) =>
                  setQuantidade(Math.min(40, Math.max(1, Number(e.target.value) || 1)))
                }
                className="w-28"
              />
            </div>
          )}

          {progresso && (
            <div className="space-y-1.5 rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{progresso.categoria}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {progresso.atual}/{progresso.total}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(progresso.atual / progresso.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {progresso.criados} {progresso.criados === 1 ? "lead novo" : "leads novos"} até
                agora
              </p>
            </div>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={loading} className="flex-1 gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading
                ? "Buscando…"
                : todasCategorias
                  ? "Buscar todas as categorias"
                  : "Buscar"}
            </Button>
            {loading && todasCategorias && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  canceladoRef.current = true;
                }}
              >
                Parar
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>

    {progresso && !open && (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => e.key === "Enter" && setOpen(true)}
        className="fixed bottom-4 right-4 z-50 w-72 cursor-pointer space-y-1.5 rounded-lg border bg-card p-3 text-sm shadow-lg"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-medium">Buscando: {progresso.categoria}</span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {progresso.atual}/{progresso.total}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(progresso.atual / progresso.total) * 100}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {progresso.criados} {progresso.criados === 1 ? "lead novo" : "leads novos"} até agora
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 shrink-0 px-2 text-xs text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              canceladoRef.current = true;
            }}
          >
            Parar
          </Button>
        </div>
      </div>
    )}
    </>
  );
}
