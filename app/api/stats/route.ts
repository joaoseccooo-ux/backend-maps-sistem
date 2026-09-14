import { NextResponse } from "next/server";
import { facetas, leadStats } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const escopo = new URL(req.url).searchParams.get("escopo") === "INTERNACIONAL" ? "INTERNACIONAL" : "NACIONAL";
  try {
    const [stats, facets] = await Promise.all([leadStats(escopo), facetas(escopo)]);
    return NextResponse.json({ ...stats, facetas: facets });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Erro." }, { status: 500 });
  }
}
