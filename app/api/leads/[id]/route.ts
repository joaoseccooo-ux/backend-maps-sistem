import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { deleteLead, getLead, updateLead } from "@/lib/leads";
import { EMAIL_STATUSES, LEAD_STATUSES } from "@/lib/lead-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  return NextResponse.json(lead);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const patch: Prisma.LeadUpdateInput = {};

  if (typeof body.status === "string") {
    if (!(LEAD_STATUSES as readonly string[]).includes(body.status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }
    patch.status = body.status;
  }
  if (typeof body.notas === "string") patch.notas = body.notas;
  if (typeof body.favorito === "boolean") patch.favorito = body.favorito;
  if (typeof body.email === "string" || body.email === null) patch.email = body.email;
  if (
    typeof body.emailStatus === "string" &&
    (EMAIL_STATUSES as readonly string[]).includes(body.emailStatus)
  ) {
    patch.emailStatus = body.emailStatus;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
  }

  try {
    const lead = await updateLead(params.id, patch);
    return NextResponse.json(lead);
  } catch {
    return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    await deleteLead(params.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  }
}
