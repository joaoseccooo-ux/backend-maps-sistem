"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Search } from "lucide-react";
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
import { iniciarBusca, iniciarBuscaTodasCategorias } from "@/lib/search-queue";
import { BuscaQueuePanel } from "@/components/leads/busca-queue-panel";

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
  const [erro, setErro] = useState<string | null>(null);
  const [todasCategorias, setTodasCategorias] = useState(false);

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

  // Só valida e dispara — não espera a busca terminar. O job roda em segundo
  // plano na fila compartilhada (lib/search-queue.ts), então o diálogo fecha
  // na hora e já dá pra abrir de novo e mandar outra busca em paralelo.
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!estado) return setErro("Selecione o estado.");
    if (!estadoInteiro && !cidade.trim())
      return setErro('Escolha a cidade ou marque "estado inteiro".');
    if (!todasCategorias && !tipo.trim())
      return setErro("Preencha o tipo de negócio.");

    setErro(null);
    const params = { estado, cidade, quantidade, estadoInteiro };

    if (todasCategorias) {
      iniciarBuscaTodasCategorias(SUGESTOES_TIPO, params, onDone);
    } else {
      iniciarBusca(tipo, params, onDone);
    }

    setOpen(false);
    setTipo("");
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
              Os resultados entram na sua lista. Buscar de novo não apaga o que já existe. Você
              pode fechar essa tela e abrir outra busca enquanto esta roda — elas não se esperam.
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
                onCheckedChange={(v) => setTodasCategorias(v === true)}
                className="mt-0.5"
              />
              <span>
                Buscar todas as categorias
                <span className="block text-xs text-muted-foreground">
                  Passa por {SUGESTOES_TIPO.length} categorias conhecidas
                  {estadoInteiro ? " no estado inteiro" : " nessa cidade"}, uma de cada vez. Pode
                  levar {estadoInteiro ? "bastante tempo (até horas)" : "vários minutos"} — dá pra
                  parar no meio pelo card de progresso.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="estado">Estado</Label>
                <select
                  id="estado"
                  value={estado}
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
                    disabled={!estado || estadoInteiro}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder={estado ? "Digite a cidade" : "Escolha o estado"}
                  />
                ) : (
                  <select
                    id="cidade"
                    value={cidade}
                    disabled={estadoInteiro}
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
                  onChange={(e) =>
                    setQuantidade(Math.min(40, Math.max(1, Number(e.target.value) || 1)))
                  }
                  className="w-28"
                />
              </div>
            )}

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <Button type="submit" className="w-full gap-2">
              <Search className="h-4 w-4" />
              {todasCategorias ? "Buscar todas as categorias" : "Buscar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BuscaQueuePanel />
    </>
  );
}
