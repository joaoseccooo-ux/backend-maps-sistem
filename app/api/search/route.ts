import { NextResponse } from "next/server";
import { ESTADOS } from "@/data/estados";
import { resolveOsmFilters, normalizar } from "@/lib/osm-tags";
import { toWhatsAppLink } from "@/lib/phone";
import { upsertLeadsFromSearch, type SearchRow } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Fonte dos dados: OpenStreetMap.
// - Nominatim: transforma "cidade, estado, Brasil" na área geográfica.
// - Overpass: lista os estabelecimentos daquela área que batem com o tipo.
// Sem chave de API, sem cadastro, sem cartão. Só código.

const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
const USER_AGENT = "BuscadorDeLeads/1.0 (prospeccao local B2B)";

/** fetch com timeout — evita que um servidor lento trave a requisição inteira. */
async function fetchComTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

type Local = { osmType: string; osmId: number; bbox: number[] };

async function geocodar(q: string): Promise<Local | null> {
  const url = `${NOMINATIM}?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`;
  const res = await fetchComTimeout(
    url,
    { headers: { "User-Agent": USER_AGENT, "Accept-Language": "pt-BR" } },
    10000
  );
  if (!res.ok) throw new Error(`Nominatim respondeu ${res.status}`);
  const arr = (await res.json()) as any[];
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const hit = arr[0];
  return {
    osmType: String(hit.osm_type),
    osmId: Number(hit.osm_id),
    // boundingbox vem como [sul, norte, oeste, leste] em strings
    bbox: (hit.boundingbox as string[]).map(Number),
  };
}

function montarQuery(
  loc: Local,
  filters: string[],
  limite: number,
  timeoutSeg: number
): string {
  let areaDef = "";
  let escopo: string;
  if (loc.osmType === "relation") {
    areaDef = `area(${3600000000 + loc.osmId})->.a;\n`;
    escopo = "(area.a)";
  } else {
    const [s, n, w, e] = loc.bbox;
    escopo = `(${s},${w},${n},${e})`;
  }
  const corpo = filters.map((f) => `  nwr${f}${escopo};`).join("\n");
  return `[out:json][timeout:${timeoutSeg}];\n${areaDef}(\n${corpo}\n);\nout tags center ${limite};`;
}

async function tentarEndpoint(endpoint: string, query: string, timeoutMs: number): Promise<any[]> {
  const res = await fetchComTimeout(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
    },
    timeoutMs
  );
  if (!res.ok) {
    throw new Error(`${new URL(endpoint).host} respondeu ${res.status}`);
  }
  const json = (await res.json()) as { elements?: any[] };
  return json.elements || [];
}

async function rodarOverpass(query: string, timeoutMs: number): Promise<any[]> {
  let ultimoErro = "sem endpoints";
  // Duas rodadas, disparando os 3 espelhos em PARALELO em cada uma (em vez de
  // um de cada vez): o overpass-api.de é o mais usado e o que mais engasga, e
  // esperar ele até o timeout antes de sequer tentar os outros já fazia uma
  // busca de 20 resultados levar 2-3 minutos. Com Promise.any ficamos com o
  // primeiro espelho que responder.
  for (let rodada = 0; rodada < 2; rodada++) {
    try {
      return await Promise.any(
        OVERPASS_ENDPOINTS.map((endpoint) => tentarEndpoint(endpoint, query, timeoutMs))
      );
    } catch (err) {
      ultimoErro =
        err instanceof AggregateError
          ? err.errors.map((e: any) => e?.message || e).join("; ")
          : (err as any)?.message || String(err);
    }
    if (rodada === 0) await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error(`Servidores do OpenStreetMap indisponíveis no momento (${ultimoErro}). Tente de novo em alguns segundos.`);
}

function primeiro(valor?: string): string {
  return (valor || "").split(";")[0].trim();
}

function normalizarSite(site: string): string {
  if (!site) return "";
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
}

function pontos(l: { telefone: string; site: string }): number {
  return (l.telefone ? 2 : 0) + (l.site ? 1 : 0);
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const { tipo, cidade, estado, quantidade } = body || {};
  const estadoInteiro = Boolean(body?.estadoInteiro);
  if (!tipo || !estado || (!estadoInteiro && !cidade)) {
    return NextResponse.json(
      { error: "Informe tipo de negócio, estado e cidade (ou marque \"estado inteiro\")." },
      { status: 400 }
    );
  }

  const uf = ESTADOS.find((e) => e.sigla === estado);
  const estadoNome = uf?.nome || String(estado);
  // No modo "estado inteiro" ignoramos o campo quantidade e trazemos tudo até um teto.
  const qtd = estadoInteiro ? 1500 : Math.min(Math.max(Number(quantidade) || 20, 1), 500);

  const { filters, matched } = resolveOsmFilters(String(tipo));
  if (filters.length === 0) {
    return NextResponse.json({ error: "Tipo de negócio inválido." }, { status: 400 });
  }
  if (estadoInteiro && !matched) {
    return NextResponse.json(
      {
        error:
          "Busca no estado inteiro só funciona com categorias conhecidas (ex.: restaurante, petshop, academia). Escolha uma categoria da lista.",
      },
      { status: 400 }
    );
  }

  let loc: Local | null;
  try {
    loc = estadoInteiro
      ? await geocodar(`${estadoNome}, Brasil`)
      : await geocodar(`${cidade}, ${estadoNome}, Brasil`);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Falha ao localizar a região: ${err?.message || "erro desconhecido"}` },
      { status: 502 }
    );
  }
  if (!loc) {
    return NextResponse.json(
      {
        error: estadoInteiro
          ? `Não encontrei o estado "${estadoNome}" no OpenStreetMap.`
          : `Não encontrei "${cidade}, ${estadoNome}" no OpenStreetMap. Confira o nome da cidade.`,
      },
      { status: 404 }
    );
  }

  // O teto de linhas que o Overpass devolve precisa acompanhar "qtd": pedir
  // 200 leads não adianta se o Overpass já corta em 300 elementos brutos
  // (antes de ordenar por quem tem telefone/site e fatiar). Margem de 2x
  // porque nem todo elemento devolvido vira lead (nome vazio, duplicata).
  const query = montarQuery(
    loc,
    filters,
    estadoInteiro ? 3000 : Math.max(qtd * 2, 300),
    estadoInteiro ? 90 : 50
  );

  // Um pouco acima do [timeout:N] embutido na própria query Overpass (linha
  // acima), pra não abortar do lado do cliente bem quando o servidor está
  // prestes a responder. Como os 3 espelhos agora correm em paralelo, isto já
  // não é mais somado 3x como era na versão sequencial.
  let elementos: any[];
  try {
    elementos = await rodarOverpass(query, estadoInteiro ? 105000 : 65000);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erro ao consultar o OpenStreetMap." }, { status: 502 });
  }

  const vistos = new Set<string>();
  const leads: SearchRow[] = [];

  for (const el of elementos) {
    const t = el.tags || {};
    const nome: string = t.name || t["name:pt"] || t.brand || "";
    if (!nome) continue;

    const lat: number | null = el.lat ?? el.center?.lat ?? null;
    const lon: number | null = el.lon ?? el.center?.lon ?? null;

    // Chave de deduplicação: nome + coordenada aproximada (~1 km). Assim o mesmo
    // estabelecimento mapeado como node + way vira um só, mas dois negócios de
    // nome igual em cidades diferentes (comum na busca por estado) são mantidos.
    const chave = `${normalizar(nome)}@${lat != null ? lat.toFixed(2) : "?"},${
      lon != null ? lon.toFixed(2) : "?"
    }`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    const endereco = [
      [t["addr:street"], t["addr:housenumber"]].filter(Boolean).join(", "),
      t["addr:suburb"] || t["addr:neighbourhood"] || "",
      t["addr:city"] || (estadoInteiro ? "" : String(cidade)),
    ]
      .filter(Boolean)
      .join(" - ");

    const telefone = primeiro(t.phone || t["contact:phone"] || t["contact:mobile"] || t.mobile);
    const site = normalizarSite(primeiro(t.website || t["contact:website"] || t.url));

    leads.push({
      osmId: `${el.type}/${el.id}`,
      nome,
      endereco,
      telefone,
      site,
      cidade: t["addr:city"] || (estadoInteiro ? "" : String(cidade)),
      googleMapsUrl:
        lat != null && lon != null
          ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              `${nome} ${t["addr:city"] || cidade || estadoNome}`
            )}`,
      lat,
      lon,
      rating: null,
      totalAvaliacoes: null,
      temSite: !!site,
      temWhatsApp: toWhatsAppLink(telefone, "") != null,
    });
  }

  // Prospecção: quem tem telefone/site aparece primeiro.
  leads.sort((a, b) => pontos(b) - pontos(a) || a.nome.localeCompare(b.nome, "pt-BR"));

  const selecionados = leads.slice(0, qtd);

  let persistencia = { criados: 0, atualizados: 0 };
  try {
    persistencia = await upsertLeadsFromSearch(selecionados, {
      cidade: estadoInteiro ? "" : String(cidade),
      estado: String(estado),
      categoria: String(tipo),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: `Busca ok, mas falhou ao salvar no banco: ${err?.message || err}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ...persistencia,
    total: selecionados.length,
    truncado: leads.length > qtd,
    estadoInteiro,
    fonte: "OpenStreetMap",
    buscaPorNome: !matched,
  });
}
