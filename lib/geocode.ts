import { ESTADOS } from "@/data/estados";
import { fetchComTimeout, USER_AGENT } from "@/lib/osm-http";

// Nominatim: transforma "cidade, estado, Brasil" na área geográfica que o
// Overpass depois varre. Limita a 1 req/s por IP — daqui vem a importância de
// geocodificar uma vez só por busca (ver getOuGeocodar em lib/search-queue e
// app/api/geocode/route.ts), em vez de repetir pra cada categoria.
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export type Local = { osmType: string; osmId: number; bbox: number[] };

export async function geocodar(q: string): Promise<Local | null> {
  const url = `${NOMINATIM}?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=br`;

  // Nominatim devolve 429 quando estoura o 1 req/s (comum quando o servidor
  // tá recebendo tráfego de outros usuários do mesmo host). Tenta de novo
  // respeitando Retry-After antes de desistir.
  let res: Response;
  let tentativa = 0;
  for (;;) {
    res = await fetchComTimeout(
      url,
      { headers: { "User-Agent": USER_AGENT, "Accept-Language": "pt-BR" } },
      10000
    );
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

/** Resolve "estado inteiro" ou "cidade, estado" pro nome que a Nominatim entende. */
export function nomeLocalParaGeocodar(cidade: string, estado: string, estadoInteiro: boolean): string {
  const uf = ESTADOS.find((e) => e.sigla === estado);
  const estadoNome = uf?.nome || String(estado);
  return estadoInteiro ? `${estadoNome}, Brasil` : `${cidade}, ${estadoNome}, Brasil`;
}
