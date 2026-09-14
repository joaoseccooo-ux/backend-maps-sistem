import { NextRequest, NextResponse } from "next/server";
import { updateLead } from "@/lib/leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Domínios/padrões comuns que aparecem em HTML mas não são e-mails de contato reais
// (rastreadores, placeholders de template, imagens, etc).
const IGNORE_PATTERNS = [
  "sentry.io",
  "wixpress.com",
  "example.com",
  "godaddy.com",
  "schema.org",
  "yourdomain",
  "domain.com",
  "w3.org",
  "google.com",
  "gstatic.com",
  "cloudflare.com",
  "sentry.wixpress",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".webp",
];

function isPlausibleEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return !IGNORE_PATTERNS.some((p) => lower.includes(p));
}

async function fetchWithTimeout(url: string, ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; BuscadorDeLeadsBot/1.0; +https://vercel.com)",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function extractEmail(html: string): string | null {
  const mailtoMatch = html.match(/mailto:([^"'?\s>]+)/i);
  if (mailtoMatch?.[1] && isPlausibleEmail(mailtoMatch[1])) {
    return decodeURIComponent(mailtoMatch[1]);
  }

  const matches = html.match(EMAIL_REGEX) || [];
  const found = matches.find(isPlausibleEmail);
  return found || null;
}

async function persistir(leadId: string | null, email: string | null) {
  if (!leadId) return;
  try {
    await updateLead(leadId, {
      email: email ?? null,
      emailStatus: email ? "ENCONTRADO" : "NAO_ENCONTRADO",
    });
  } catch {
    // lead pode ter sido apagado — ignora
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  const leadId = req.nextUrl.searchParams.get("leadId");
  if (!url) return NextResponse.json({ email: null });

  let target = url;
  if (!/^https?:\/\//i.test(target)) target = `https://${target}`;

  try {
    const res = await fetchWithTimeout(target, 4000);
    if (!res.ok) {
      await persistir(leadId, null);
      return NextResponse.json({ email: null });
    }
    const html = await res.text();
    const email = extractEmail(html);
    await persistir(leadId, email);
    return NextResponse.json({ email });
  } catch {
    await persistir(leadId, null);
    return NextResponse.json({ email: null });
  }
}
