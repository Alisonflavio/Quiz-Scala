/* Validação de links configurados por usuários (botões, redirecionamentos, arquivos) antes de abri-los no navegador. */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

/**
 * Devolve o link se for seguro de abrir, ou `null`.
 * Aceita caminhos do próprio site (`/obrigado`) e endereços http(s), mailto e tel.
 * Recusa `javascript:`, `data:` e similares (mesmo disfarçados com tabs/quebras de linha) e `//outro-site`.
 */
export function safeUrl(raw: string | null | undefined): string | null {
  const url = (raw ?? "").trim();
  if (!url) return null;
  if (url.startsWith("/")) return url.startsWith("//") || url.startsWith("/\\") ? null : url;
  try {
    return ALLOWED_PROTOCOLS.has(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}
