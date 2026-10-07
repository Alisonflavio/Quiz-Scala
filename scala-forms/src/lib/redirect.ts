/* Destino pós-login vindo da URL (`?next=`). Só aceita caminho interno, para não virar redirecionamento aberto. */

const DEFAULT_DESTINATION = "/dash";

/**
 * Devolve `next` se for um caminho interno do painel; caso contrário, `/dash`.
 * Recusa URLs absolutas, `//host` e `/\host` (o navegador trata como outro site) e rotas fora de `/dash`.
 */
export function sanitizeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/dash")) return DEFAULT_DESTINATION;
  if (next.length > 512 || /[\\\r\n]/.test(next)) return DEFAULT_DESTINATION;
  return next;
}
