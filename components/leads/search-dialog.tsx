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

// Ordem = prioridade de quem mais precisa/se beneficia de um site, do maior
// pro menor. Importa de verdade: é a mesma ordem usada por "Buscar todas as
// categorias" — parar no meio deixa os melhores prospects já processados.
const SUGESTOES_TIPO = [
  // 1) Serviços profissionais de ticket alto — cliente pesquisa e compara
  // antes de contratar; um site pesa na decisão.
  "Imobiliária", "Advogado", "Contador", "Corretor de seguros", "Arquiteto",
  "Consultoria", "Construtora",

  // 2) Saúde agendada — cliente busca no Google antes de marcar consulta.
  "Dentista", "Clínica", "Fisioterapia", "Psicólogo", "Nutricionista",
  "Clínica veterinária",

  // 3) Vitrine visual/portfólio — o site é parte do produto de vendas.
  "Estúdio de fotografia", "Hotel", "Pousada", "Espaço de eventos", "Buffet infantil",

  // 4) Beleza e bem-estar agendados — hoje vivem só de Instagram/WhatsApp,
  // um site profissionaliza e facilita agendamento.
  "Salão de beleza", "Barbearia", "Estética", "Design de sobrancelhas", "Depilação",
  "Estúdio de tatuagem", "Academia", "Estúdio de pilates", "Escola de dança",

  // 5) Comida com encomenda/cardápio — cardápio e delivery no site ajudam.
  "Restaurante", "Pizzaria", "Hamburgueria", "Marmitaria", "Confeitaria", "Padaria",

  // 6) Varejo com potencial de catálogo/e-commerce.
  "Joalheria", "Relojoaria", "Loja de móveis", "Loja de decoração", "Loja de colchões",
  "Floricultura", "Loja de festas", "Loja de roupas", "Loja infantil", "Lingerie",
  "Loja de calçados", "Loja de bijuterias", "Loja de celular", "Loja de informática",
  "Loja de games", "Loja de instrumentos musicais", "Livraria", "Petshop", "Ótica",

  // 7) Obras e serviços por orçamento — portfólio no site ajuda a fechar.
  "Comunicação visual", "Gráfica", "Marcenaria", "Ar condicionado", "Empresa de limpeza",
  "Loja de material de construção", "Loja de tintas",

  // 8) Ofícios técnicos e cursos — meio-termo, ainda vivem de indicação.
  "Marmoraria", "Vidraçaria", "Serralheria", "Assistência técnica", "Escola de idiomas",
  "Cursinho", "Autoescola",

  // 9) Comida do dia a dia — cliente passa na frente ou usa iFood, site pesa pouco.
  "Lanchonete", "Pastelaria", "Sorveteria", "Cafeteria", "Bar",

  // 10) Automotivo — decisão por Google Maps/indicação, raramente visita site.
  "Oficina mecânica", "Auto elétrica", "Funilaria", "Oficina de motos", "Borracharia",
  "Lava rápido", "Estética automotiva", "Loja de autopeças",

  // 11) Urgência/emergência — cliente quer telefone na hora, não navega site.
  "Desentupidora", "Dedetizadora", "Chaveiro",

  // 12) Commodity/abastecimento — compra por proximidade, site quase não pesa.
  "Mercado", "Hortifruti", "Açougue", "Agropecuária", "Farmácia", "Lavanderia",
  "Papelaria", "Brechó", "Sapataria",

  // 13) Já tende a ter site próprio — não é bom lead pra vender site.
  "Agência de marketing digital",
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
