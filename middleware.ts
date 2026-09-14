import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, AUTH_COOKIE_INTL, isValidToken, isValidTokenIntl } from "@/lib/auth";

// Gate de senha pro app. A área internacional (/internacional) tem senha
// PRÓPRIA (APP_PASSWORD_INTERNACIONAL) — quem só tem a senha nacional não
// entra lá, e vice-versa. As rotas de API de busca/listagem são usadas
// pelas duas áreas (o mesmo endpoint atende nacional e internacional,
// diferenciado pelo campo "escopo" no corpo/query), então aceitam
// qualquer uma das duas sessões válidas.
const API_COMPARTILHADA = ["/api/search", "/api/geocode", "/api/leads", "/api/stats"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const mainOk = await isValidToken(req.cookies.get(AUTH_COOKIE)?.value);
  const intlOk = await isValidTokenIntl(req.cookies.get(AUTH_COOKIE_INTL)?.value);

  const isInternacional = pathname === "/internacional" || pathname.startsWith("/internacional/");
  const isApiCompartilhada = API_COMPARTILHADA.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  const autorizado = isInternacional ? intlOk : isApiCompartilhada ? mainOk || intlOk : mainOk;
  if (autorizado) {
    return NextResponse.next();
  }

  // Rota de API sem sessão válida: 401 JSON, nunca redirect. Um redirect (307)
  // preserva o método original — um POST/PATCH/DELETE viraria a mesma
  // requisição em "/login" (que só aceita GET) e devolveria 405.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const loginPath = isInternacional ? "/login-internacional" : "/login";
  const loginUrl = new URL(loginPath, req.url);
  loginUrl.searchParams.set("next", pathname + search);
  // 303: garante GET no login mesmo que a requisição original fosse POST.
  return NextResponse.redirect(loginUrl, 303);
}

export const config = {
  matcher: [
    // Tudo, exceto as duas telas de login, seus endpoints, e assets internos do Next.
    "/((?!login|login-internacional|api/login|api/login-internacional|_next/static|_next/image|favicon.ico).*)",
  ],
};
