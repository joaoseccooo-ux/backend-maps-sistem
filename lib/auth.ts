// Autenticação simples por senha única (sem usuários, sem banco).
// Usa Web Crypto (disponível tanto no Edge runtime do middleware quanto no Node)
// para gerar um token assinado a partir da senha, evitando guardar a senha em texto
// puro no cookie.

export const AUTH_COOKIE = "leadfinder_auth";

async function hmac(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Token válido para a sessão atual, derivado da senha configurada no ambiente. */
export async function expectedToken(): Promise<string | null> {
  const password = process.env.APP_PASSWORD;
  if (!password) return null;
  return hmac(password, "leadfinder-session");
}

export async function isValidToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const expected = await expectedToken();
  if (!expected) return false;
  return token === expected;
}
