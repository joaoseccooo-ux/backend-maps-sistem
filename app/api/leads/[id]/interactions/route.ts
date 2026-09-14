import { NextResponse } from "next/server";
import { addInteraction } from "@/lib/leads";
import { CANAIS, type Canal } from "@/lib/lead-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const canal = String(body.canal || "").toUpperCase();
  if (!(CANAIS as readonly string[]).includes(canal)) {
    return NextResponse.json({ error: "Canal inválido." }, { status: 400 });
  }

  try {
    const interaction = await addInteraction(
      params.id,
      canal as Canal,
      typeof body.descricao === "string" ? body.descricao : ""
    );
    return NextResponse.json(interaction, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erro." }, { status: 400 });
  }
}
