import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, isValidToken } from "@/lib/auth";

// Gate de senha única para o app inteiro. Sem isso, qualquer pessoa que
// descubra a URL do deploy vê a base de leads e consegue apagar/editar tudo.
export async function middleware(req: NextRequest) {
  const token = req.cookies.get(AUTH_COOKIE)?.value;
  if (await isValidToken(token)) {
    return NextResponse.next();
  }

  // Rota de API sem sessão válida: 401 JSON, nunca redirect. Um redirect (307)
  // preserva o método original — um POST/PATCH/DELETE viraria a mesma
  // requisição em "/login" (que só aceita GET) e devolveria 405.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname + req.nextUrl.search);
  // 303: garante GET em "/login" mesmo que a requisição original fosse POST.
  return NextResponse.redirect(loginUrl, 303);
}

export const config = {
  matcher: [
    // Tudo, exceto /login, /api/login, e assets internos do Next.
    "/((?!login|api/login|_next/static|_next/image|favicon.ico).*)",
  ],
};
