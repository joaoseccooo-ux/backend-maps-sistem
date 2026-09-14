export const USER_AGENT = "BuscadorDeLeads/1.0 (prospeccao local B2B)";

/** fetch com timeout — evita que um servidor lento trave a requisição inteira. */
export async function fetchComTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
