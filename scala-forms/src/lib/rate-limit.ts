/*
 * Limite de requisições com contador no próprio banco (funciona na Vercel sem serviço extra).
 * Janela fixa: cada (chave, janela) tem um contador atualizado de forma atômica.
 */
import "server-only";
import { query } from "./db";

export type Limit = { max: number; windowSeconds: number };

/** IP do cliente a partir dos cabeçalhos do proxy (Vercel preenche `x-real-ip` / `x-forwarded-for`). */
export function clientIp(h: Headers): string {
  return h.get("x-real-ip")?.trim() || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "desconhecido";
}

/**
 * Registra uma tentativa e diz se ainda está dentro do limite.
 * @param name tipo de ação (ex.: "login-ip"); @param id quem está sendo limitado (IP, e-mail...).
 * @returns `true` se pode seguir, `false` se estourou. Se o banco falhar, libera (não derruba o serviço por isso).
 */
export async function rateLimit(name: string, id: string, { max, windowSeconds }: Limit): Promise<boolean> {
  try {
    const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
    const rows = await query<{ count: number }>(
      `INSERT INTO rate_limits (key, bucket, count) VALUES ($1, $2, 1)
       ON CONFLICT (key, bucket) DO UPDATE SET count = rate_limits.count + 1
       RETURNING count`,
      [`${name}:${id}`.slice(0, 200), bucket],
    );
    // limpeza ocasional de janelas antigas (a janela mais longa usada é de 1 dia)
    if (Math.random() < 0.01) {
      await query("DELETE FROM rate_limits WHERE created_at < now() - interval '2 days'");
    }
    return Number(rows[0]?.count ?? 1) <= max;
  } catch (err) {
    console.error("[rate-limit]", err instanceof Error ? err.message : err);
    return true;
  }
}
