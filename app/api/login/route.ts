import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, expectedToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/");

  const token = await expectedToken();
  if (!token) {
    // APP_PASSWORD não configurada no ambiente.
    return NextResponse.redirect(
      new URL(`/login?error=config&next=${encodeURIComponent(next)}`, req.url)
    );
  }

  const configuredPassword = process.env.APP_PASSWORD;
  if (password !== configuredPassword) {
    return NextResponse.redirect(
      new URL(`/login?error=senha&next=${encodeURIComponent(next)}`, req.url)
    );
  }

  const res = NextResponse.redirect(new URL(next || "/", req.url));
  res.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  return res;
}
