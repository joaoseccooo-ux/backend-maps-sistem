"use client";

import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { ESTADOS, UF_CODIGO_IBGE } from "@/data/estados";
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
import {
  iniciarBusca,
  iniciarBuscaTodasCategorias,
  iniciarBuscaPorCidades,
  retomarLoopCidadesSeExistir,
} from "@/lib/search-queue";
import { BuscaQueuePanel } from "@/components/leads/busca-queue-panel";
import { SUGESTOES_TIPO } from "@/data/sugestoes-tipo";

const QUANTIDADE_MAX = 500;

export function SearchDialog({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("");
  const [categorias, setCategorias] = useState<string[]>([]);
  const [estado, setEstado] = useState("");
  const [cidade, setCidade] = useState("");
  const [cidades, setCidades] = useState<string[]>([]);
  const [cidadeManual, setCidadeManual] = useState(false);
  const [estadoInteiro, setEstadoInteiro] = useState(false);
  const [quantidade, setQuantidade] = useState(20);
  const [erro, setErro] = useState<string | null>(null);
  const [todasCategorias, setTodasCategorias] = useState(false);
  const [percorrerCidades, setPercorrerCidades] = useState(false);

  // Um "percorrer cidades" em andamento sobrevive a um refresh (fica salvo
  // no localStorage) — ao carregar a página, retoma de onde parou em vez de
  // simplesmente desaparecer. Só some de fato ao terminar ou clicar "Parar".
  useEffect(() => {
    retomarLoopCidadesSeExistir(onDone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!estado) {
      setCidades([]);
      setCidadeManual(false);
      return;
    }
    setCidade("");
    let cancel = false;
    const codigoUf = UF_CODIGO_IBGE[estado];

    // Cidades e população vêm de dois endpoints do IBGE, buscados em
    // paralelo. Se o de população falhar, cai pra ordem alfabética — não
    // trava a seleção de cidade por causa disso.
    Promise.all([
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${estado}/municipios`).then(
        (r) => {
          if (!r.ok) throw new Error();
          return r.json() as Promise<Array<{ id: number; nome: string }>>;
        }
      ),
      fetch(
        `https://servicodados.ibge.gov.br/api/v3/agregados/6579/periodos/-1/variaveis/9324?localidades=N6%5BN3%5B${codigoUf}%5D%5D`
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([municipios, dadosPop]) => {
        if (cancel) return;

        const populacaoPorId = new Map<number, number>();
        const serie = dadosPop?.[0]?.resultados?.[0]?.series as
          | Array<{ localidade: { id: string }; serie: Record<string, string> }>
          | undefined;
        for (const s of serie || []) {
          const ano = Object.keys(s.serie)[0];
          populacaoPorId.set(Number(s.localidade.id), Number(s.serie[ano]) || 0);
        }

        const nomes =
          populacaoPorId.size > 0
            ? [...municipios]
                .sort((a, b) => (populacaoPorId.get(b.id) ?? 0) - (populacaoPorId.get(a.id) ?? 0))
                .map((m) => m.nome)
            : municipios.map((m) => m.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));

        setCidades(nomes);
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

  // Adiciona o texto digitado como mais uma categoria (chip), sem apagar as
  // que já foram adicionadas — é o que permite juntar "psicologia" +
  // "cardiologia" + "advogado" numa busca só.
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

  // Só valida e dispara — não espera a busca terminar. O job roda em segundo
  // plano na fila compartilhada (lib/search-queue.ts), então o diálogo fecha
  // na hora e já dá pra abrir de novo e mandar outra busca em paralelo.
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!estado) return setErro("Selecione o estado.");

    // O que ainda está no campo de texto (não confirmado com Enter/+) entra
    // na busca também — não obriga a clicar em "+" pra um tipo só.
    const pendente = tipo.trim();
    const todas = pendente && !categorias.some((c) => c.toLowerCase() === pendente.toLowerCase())
      ? [...categorias, pendente]
      : categorias;

    if (percorrerCidades) {
      if (todas.length !== 1) return setErro('"Percorrer todas as cidades" só funciona com uma categoria só.');
      if (cidades.length === 0) return setErro("Escolha o estado e espere a lista de cidades carregar.");
      setErro(null);
      iniciarBuscaPorCidades(todas[0], estado, quantidade, cidades, onDone);
      setOpen(false);
      setTipo("");
      setCategorias([]);
      return;
    }

    if (!estadoInteiro && !cidade.trim())
      return setErro('Escolha a cidade ou marque "estado inteiro".');

    setErro(null);
    const params = { estado, cidade, quantidade, estadoInteiro };
    const local = estadoInteiro ? estado : `${cidade}, ${estado}`;

    if (todasCategorias) {
      iniciarBuscaTodasCategorias(SUGESTOES_TIPO, params, onDone, `Todas as categorias em ${local}`);
    } else {
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
            <DialogTitle>Buscar leads no OpenStreetMap</DialogTitle>
            <DialogDescription>
              Os resultados entram na sua lista. Buscar de novo não apaga o que já existe. Você
              pode fechar essa tela e abrir outra busca enquanto esta roda — elas não se esperam.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo de negócio</Label>
              <div className="flex gap-2">
                <Input
                  id="tipo"
                  list="sugestoes-tipo"
                  value={tipo}
                  disabled={todasCategorias}
                  onChange={(e) => setTipo(e.target.value)}
                  onKeyDown={handleTipoKeyDown}
                  placeholder="Ex: psicólogo, cardiologista, advogado…"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={todasCategorias || percorrerCidades || !tipo.trim()}
                  onClick={adicionarCategoria}
                >
                  Adicionar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Dá pra buscar várias categorias de uma vez: digite uma, aperte Enter ou
                &quot;Adicionar&quot;, e repita. Cada uma roda em sequência.
              </p>
              <datalist id="sugestoes-tipo">
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
                disabled={percorrerCidades}
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

            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={percorrerCidades}
                disabled={!estado || todasCategorias}
                onCheckedChange={(v) => {
                  const checado = v === true;
                  setPercorrerCidades(checado);
                  if (checado) setEstadoInteiro(false);
                }}
                className="mt-0.5"
              />
              <span>
                Percorrer todas as cidades do estado (sem repetir)
                <span className="block text-xs text-muted-foreground">
                  Só com uma categoria. Passa cidade por cidade dentro do estado escolhido, pulando
                  as que já têm lead dessa categoria salvo. Sem pressa: espera um pouco entre cada
                  cidade pra não sobrecarregar o OpenStreetMap. Dá pra parar no meio.
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
                    disabled={!estado || estadoInteiro || percorrerCidades}
                    onChange={(e) => setCidade(e.target.value)}
                    placeholder={estado ? "Digite a cidade" : "Escolha o estado"}
                  />
                ) : (
                  <select
                    id="cidade"
                    value={cidade}
                    disabled={estadoInteiro || percorrerCidades}
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
                disabled={percorrerCidades}
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
                <Label htmlFor="qtd">Quantidade (até {QUANTIDADE_MAX})</Label>
                <Input
                  id="qtd"
                  type="number"
                  min={1}
                  max={QUANTIDADE_MAX}
                  value={quantidade}
                  onChange={(e) =>
                    setQuantidade(Math.min(QUANTIDADE_MAX, Math.max(1, Number(e.target.value) || 1)))
                  }
                  className="w-28"
                />
                {percorrerCidades ? (
                  <p className="text-xs text-muted-foreground">Esse teto vale por cidade, não no total.</p>
                ) : (
                  quantidade > 40 && (
                    <p className="text-xs text-muted-foreground">
                      Pedidos grandes trazem mais elementos do Overpass e podem demorar mais.
                    </p>
                  )
                )}
              </div>
            )}

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <Button type="submit" className="w-full gap-2">
              <Search className="h-4 w-4" />
              {percorrerCidades
                ? "Percorrer cidades"
                : todasCategorias
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
