/*
 * Envio de dados a URLs configuradas por usuários (webhook, planilha, teste) com proteção contra SSRF:
 * só https, o DNS é resolvido antes e endereços internos são recusados, em cada redirecionamento também.
 * Limite conhecido: o DNS é resolvido de novo pelo fetch (janela de "DNS rebinding"); aceitável para uma ferramenta interna.
 */
import "server-only";
import { lookup } from "node:dns/promises";
import { isBlockedIp } from "./ip";

const MAX_REDIRECTS = 3;

/** Lançado quando a URL não pode ser usada (esquema, endereço interno, DNS). A mensagem é segura para mostrar ao usuário. */
export class UnsafeUrlError extends Error {}

/** Confere que a URL é https e que todos os endereços do host são públicos. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("URL inválida.");
  }
  if (url.protocol !== "https:") throw new UnsafeUrlError("Use uma URL https://.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  let addrs: { address: string }[];
  try {
    addrs = await lookup(host, { all: true });
  } catch {
    throw new UnsafeUrlError("Não foi possível resolver o endereço.");
  }
  if (!addrs.length || addrs.some((a) => isBlockedIp(a.address))) {
    throw new UnsafeUrlError("Este endereço não é permitido (rede interna).");
  }
  return url;
}

/**
 * POST de JSON seguindo até 3 redirecionamentos, validando cada destino.
 * Como o `fetch`: 301/302/303 viram GET; 307/308 repetem o POST. (O Google Apps Script responde com 302.)
 * @throws UnsafeUrlError se algum destino for proibido.
 */
export async function safePostJson(raw: string, body: unknown, timeoutMs: number): Promise<Response> {
  let url = await assertPublicUrl(raw);
  let method = "POST";
  const payload = JSON.stringify(body);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? payload : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const location = res.headers.get("location");
    if (res.status < 300 || res.status >= 400 || !location) return res;
    if (res.status !== 307 && res.status !== 308) method = "GET";
    url = await assertPublicUrl(new URL(location, url).toString());
  }
  throw new UnsafeUrlError("Redirecionamentos demais.");
}
