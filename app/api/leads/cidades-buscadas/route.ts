import { NextResponse } from "next/server";
import { cidadesComCategoria } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Usado por "percorrer todas as cidades do estado" (lib/search-queue.ts) pra
// pular cidade que já tem lead dessa categoria — sem isso o loop bateria de
// novo em cidade já coberta a cada vez que roda.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado") || "";
  const categoria = searchParams.get("categoria") || "";
  if (!estado || !categoria) {
    return NextResponse.json({ error: "Informe estado e categoria." }, { status: 400 });
  }

  try {
    const cidades = await cidadesComCategoria(estado, categoria);
    return NextResponse.json({ cidades });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erro." }, { status: 500 });
  }
}
