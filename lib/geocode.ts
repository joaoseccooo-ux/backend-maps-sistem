import { ESTADOS } from "@/data/estados";
import { fetchComTimeout, USER_AGENT } from "@/lib/osm-http";

// Nominatim: transforma "cidade + estado" na área geográfica que o Overpass
// depois varre. Limita a 1 req/s por IP — daqui vem a importância de
// geocodificar uma vez só por busca (ver lib/search-queue.ts e
// app/api/geocode/route.ts), em vez de repetir pra cada categoria.
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export type Local = { osmType: string; osmId: number; bbox: number[] };

export function nomeEstado(sigla: string): string {
  return ESTADOS.find((e) => e.sigla === sigla)?.nome || sigla;
}

async function buscarNominatim(params: Record<string, string>): Promise<Local | null> {
  const qs = new URLSearchParams({
    format: "json",
    limit: "1",
    countrycodes: "br",
    "accept-language": "pt-BR",
    ...params,
  });
  const url = `${NOMINATIM}?${qs.toString()}`;

  // Nominatim devolve 429 quando estoura o 1 req/s (comum quando o servidor
  // tá recebendo tráfego de outros usuários do mesmo host). Tenta de novo
  // respeitando Retry-After antes de desistir.
  let res: Response;
  let tentativa = 0;
  for (;;) {
    res = await fetchComTimeout(url, { headers: { "User-Agent": USER_AGENT } }, 10000);
    if (res.status !== 429 || tentativa >= 3) break;
    const retryAfter = Number(res.headers.get("retry-after"));
    const espera = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** tentativa;
    await new Promise((r) => setTimeout(r, espera));
    tentativa++;
  }
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

/**
 * Geocodifica cidade+estado (ou só o estado, no modo "estado inteiro").
 *
 * Usa busca ESTRUTURADA da Nominatim (state=/city=/featureType=) em vez de
 * texto livre: em estados com o mesmo nome da capital (São Paulo, Rio de
 * Janeiro...), a busca livre "São Paulo, Brasil" podia resolver pro PONTO da
 * capital em vez do polígono do estado inteiro — a bbox virava uma caixinha
 * minúscula em volta desse ponto, e a busca no "estado inteiro" voltava
 * vazia mesmo pra categorias comuns (petshop, barbearia). featureType=state
 * força o Nominatim a devolver o nível administrativo certo.
 *
 * Se a busca estruturada não achar nada (nome atípico, grafia divergente do
 * OSM), cai pra busca livre como fallback, que é mais tolerante.
 */
export async function geocodar(cidade: string, estadoNome: string, estadoInteiro: boolean): Promise<Local | null> {
  const estruturado: Record<string, string> = estadoInteiro
    ? { state: estadoNome, country: "Brasil", featureType: "state" }
    : { city: cidade, state: estadoNome, country: "Brasil", featureType: "settlement" };

  let loc = await buscarNominatim(estruturado);
  if (!loc) {
    const q = estadoInteiro ? `${estadoNome}, Brasil` : `${cidade}, ${estadoNome}, Brasil`;
    loc = await buscarNominatim({ q });
  }
  return loc;
}

/**
 * Geocodifica cidade+país fora do Brasil (aba internacional). Sempre exige
 * cidade — sem equivalente a "estado inteiro" aqui, países europeus não têm
 * uma API tipo IBGE pra listar cidade por cidade. "countrycodes" restringe
 * à Nominatim ao país certo, evitando pegar cidade de mesmo nome em outro
 * lugar do mundo.
 */
export async function geocodarInternacional(
  cidade: string,
  paisNome: string,
  codigoPais: string
): Promise<Local | null> {
  let loc = await buscarNominatim({
    city: cidade,
    country: paisNome,
    countrycodes: codigoPais,
    featureType: "settlement",
  });
  if (!loc) {
    loc = await buscarNominatim({ q: `${cidade}, ${paisNome}`, countrycodes: codigoPais });
  }
  return loc;
}
