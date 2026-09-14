import { NextResponse } from "next/server";
import { listLeads, type ListFilter } from "@/lib/leads";
import { LEAD_STATUSES, type LeadStatus } from "@/lib/lead-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function triState(v: string | null): boolean | undefined {
  if (v === "com" || v === "true" || v === "1") return true;
  if (v === "sem" || v === "false" || v === "0") return false;
  return undefined;
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;

  const status = (sp.get("status") || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter((s): s is LeadStatus => (LEAD_STATUSES as readonly string[]).includes(s));

  const filtro: ListFilter = {
    status: status.length ? status : undefined,
    cidade: sp.get("cidade") || undefined,
    estado: sp.get("estado") || undefined,
    categoria: sp.get("categoria") || undefined,
    temSite: triState(sp.get("site")),
    temWhatsApp: triState(sp.get("whatsapp")),
    favorito: sp.get("favorito") === "1" ? true : undefined,
    q: sp.get("q") || undefined,
    semContato: sp.get("semContato") === "1" ? true : undefined,
    cursor: sp.get("cursor") || undefined,
    limit: sp.get("limit") ? Number(sp.get("limit")) : undefined,
  };

  try {
    const data = await listLeads(filtro);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erro ao listar leads." }, { status: 500 });
  }
}
