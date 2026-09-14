import { NextResponse } from "next/server";
import { geocodar, geocodarInternacional, nomeEstado } from "@/lib/geocode";
import { codigoPais } from "@/data/paises-europa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Endpoint separado pra geocodificar uma vez só: quem faz busca multi-categoria
// (lib/search-queue.ts) chama isso ANTES do loop de categorias e reaproveita o
// resultado em todas elas, em vez de bater na Nominatim uma vez por categoria
// (era isso que estourava o limite de 1 req/s dela e derrubava a busca com 429).
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const { cidade, estado, pais } = body || {};
  const internacional = body?.escopo === "INTERNACIONAL";
  const estadoInteiro = Boolean(body?.estadoInteiro);

  if (internacional) {
    if (!pais || !cidade) {
      return NextResponse.json({ error: "Informe país e cidade." }, { status: 400 });
    }
    const codigo = codigoPais(String(pais));
    if (!codigo) {
      return NextResponse.json({ error: `País "${pais}" não está na lista suportada.` }, { status: 400 });
    }
    let loc;
    try {
      loc = await geocodarInternacional(String(cidade), String(pais), codigo);
    } catch (err: any) {
      console.error("[geocode] falha ao geocodificar (internacional):", err?.message || err);
      return NextResponse.json(
        { error: `Falha ao localizar a região: ${err?.message || "erro desconhecido"}` },
        { status: 502 }
      );
    }
    if (!loc) {
      return NextResponse.json(
        { error: `Não encontrei "${cidade}, ${pais}" no OpenStreetMap. Confira o nome da cidade.` },
        { status: 404 }
      );
    }
    return NextResponse.json({ loc });
  }

  if (!estado || (!estadoInteiro && !cidade)) {
    return NextResponse.json({ error: "Informe estado e cidade (ou marque \"estado inteiro\")." }, { status: 400 });
  }

  const estadoNome = nomeEstado(String(estado));
  let loc;
  try {
    loc = await geocodar(String(cidade || ""), estadoNome, estadoInteiro);
  } catch (err: any) {
    console.error("[geocode] falha ao geocodificar:", err?.message || err);
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

  return NextResponse.json({ loc });
}
