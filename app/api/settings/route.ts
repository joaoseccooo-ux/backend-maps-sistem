import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const seuNome = (await getSetting("seuNome")) ?? "";
  return NextResponse.json({ seuNome });
}

export async function PUT(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }
  if (typeof body.seuNome === "string") {
    await setSetting("seuNome", body.seuNome.slice(0, 200));
  }
  const seuNome = (await getSetting("seuNome")) ?? "";
  return NextResponse.json({ seuNome });
}
