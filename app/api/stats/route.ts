import { NextResponse } from "next/server";
import { facetas, leadStats } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [stats, facets] = await Promise.all([leadStats(), facetas()]);
    return NextResponse.json({ ...stats, facetas: facets });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erro." }, { status: 500 });
  }
}
